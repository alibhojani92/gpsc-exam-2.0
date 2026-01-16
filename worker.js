/*****************************************************************
 * GPSC EXAM 2.0 BOT
 * PHASE 2 – FIXED READING TIME ENGINE (FINAL)
 *****************************************************************/

export default {
  async fetch(request, env) {
    if (request.method !== "POST") {
      return new Response("OK", { status: 200 });
    }

    const update = await request.json();
    if (!update.message) return new Response("OK");

    const msg = update.message;
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = (msg.text || "").trim();

    const BOT_TOKEN = env.BOT_TOKEN;
    const KV = env.KV;

    async function send(text, keyboard = null) {
      const payload = {
        chat_id: chatId,
        text,
        parse_mode: "HTML",
      };
      if (keyboard) payload.reply_markup = keyboard;

      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }

    const TODAY = new Date().toISOString().slice(0, 10);
    const TARGET = 8 * 60 * 60;

    async function getState() {
      const raw = await KV.get(`state:${userId}`);
      if (!raw) {
        return {
          date: TODAY,
          totalSeconds: 0,
          isReading: false,
          activeStart: null,
        };
      }
      return JSON.parse(raw);
    }

    async function save(state) {
      await KV.put(`state:${userId}`, JSON.stringify(state));
    }

    function fmt(sec) {
      const h = Math.floor(sec / 3600);
      const m = Math.floor((sec % 3600) / 60);
      return `${h}h ${m}m`;
    }

    let state = await getState();

    /* DAILY RESET (SAFE) */
    if (state.date !== TODAY && !state.isReading) {
      state = {
        date: TODAY,
        totalSeconds: 0,
        isReading: false,
        activeStart: null,
      };
      await save(state);
    }

    /* START */
    if (text === "/start") {
      await send(
        `🌸 <b>Dear Student</b> 🌸\n\n📚 GPSC Exam 2.0\n🎯 Daily Target: 08:00 hours`,
        {
          keyboard: [
            ["Start Reading", "Stop Reading"],
            ["Today Status", "Help"],
          ],
          resize_keyboard: true,
        }
      );
      return new Response("OK");
    }

    /* START READING */
    if (text === "Start Reading") {
      if (state.isReading) {
        await send("⚠️ Reading already running");
        return new Response("OK");
      }

      state.isReading = true;
      state.activeStart = Date.now();
      await save(state);

      await send(
        `📖 <b>Reading started</b>\n🎯 Target: 08:00\n💪 Stay focused`
      );
      return new Response("OK");
    }

    /* STOP READING */
    if (text === "Stop Reading") {
      if (!state.isReading || !state.activeStart) {
        await send("⚠️ Reading not active");
        return new Response("OK");
      }

      const now = Date.now();
      const session = Math.floor((now - state.activeStart) / 1000);

      state.totalSeconds += session;
      state.isReading = false;
      state.activeStart = null;
      await save(state);

      await send(`⏹ <b>Reading stopped</b>\n😌 Take rest`);
      return new Response("OK");
    }

    /* STATUS */
    if (text === "Today Status") {
      let total = state.totalSeconds;
      if (state.isReading && state.activeStart) {
        total += Math.floor((Date.now() - state.activeStart) / 1000);
      }

      const remain = Math.max(TARGET - total, 0);

      await send(
        `📊 <b>Today's Study</b>\n\n⏱ Studied: <b>${fmt(
          total
        )}</b>\n🎯 Target: 08h\n⏳ Remaining: <b>${fmt(remain)}</b>`
      );
      return new Response("OK");
    }

    /* HELP */
    if (text === "Help") {
      await send(
        `ℹ️ Commands:\n• Start Reading\n• Stop Reading\n• Today Status`
      );
      return new Response("OK");
    }

    return new Response("OK");
  },
};
