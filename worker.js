/*****************************************************************
 * GPSC EXAM 2.0 BOT
 * PHASE 2 – READING TIME ENGINE
 * (Phase-1 + Phase-2 FULL REPLACEMENT)
 *****************************************************************/

export default {
  async fetch(request, env, ctx) {
    if (request.method !== "POST") {
      return new Response("Bot running ✅", { status: 200 });
    }

    const update = await request.json();
    if (!update.message) {
      return new Response("No message", { status: 200 });
    }

    const message = update.message;
    const chatId = message.chat.id;
    const userId = message.from.id;
    const text = (message.text || "").trim();

    const BOT_TOKEN = env.BOT_TOKEN;
    const KV = env.KV;

    /* ---------------- TELEGRAM SEND ---------------- */
    async function sendMessage(text, replyMarkup = null) {
      const payload = {
        chat_id: chatId,
        text,
        parse_mode: "HTML",
      };
      if (replyMarkup) payload.reply_markup = replyMarkup;

      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }

    /* ---------------- HELPERS ---------------- */
    const TODAY = new Date().toISOString().slice(0, 10);
    const TARGET_SECONDS = 8 * 60 * 60; // 8 hours

    async function getState() {
      const raw = await KV.get(`state:${userId}`);
      if (!raw) {
        return {
          date: TODAY,
          isReading: false,
          startTime: null,
          totalSeconds: 0,
        };
      }
      return JSON.parse(raw);
    }

    async function saveState(state) {
      await KV.put(`state:${userId}`, JSON.stringify(state));
    }

    function formatTime(sec) {
      const h = Math.floor(sec / 3600);
      const m = Math.floor((sec % 3600) / 60);
      return `${h.toString().padStart(2, "0")}h ${m
        .toString()
        .padStart(2, "0")}m`;
    }

    /* ---------------- DAILY RESET ---------------- */
    let state = await getState();
    if (state.date !== TODAY) {
      state = {
        date: TODAY,
        isReading: false,
        startTime: null,
        totalSeconds: 0,
      };
      await saveState(state);
    }

    /* ---------------- /START ---------------- */
    if (text === "/start") {
      await sendMessage(
        `🌸 <b>Dear Student</b> 🌸\n\n📚 Welcome to <b>GPSC Exam 2.0</b>\n🎯 Daily Target: <b>08:00 hours</b>\n👇 Use buttons below`,
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

    /* ---------------- START READING ---------------- */
    if (text === "Start Reading" || text === "/startreading") {
      if (state.isReading) {
        await sendMessage(
          `⚠️ <b>Already Reading</b>\n\nStop current session first.`
        );
        return new Response("OK");
      }

      state.isReading = true;
      state.startTime = Date.now();
      await saveState(state);

      await sendMessage(
        `📖 <b>Reading started</b>\n\n🎯 Target: 08:00\n💪 Stay focused`
      );
      return new Response("OK");
    }

    /* ---------------- STOP READING ---------------- */
    if (text === "Stop Reading" || text === "/stopreading") {
      if (!state.isReading) {
        await sendMessage(
          `⚠️ <b>Reading not active</b>\n\nStart reading first.`
        );
        return new Response("OK");
      }

      const now = Date.now();
      const sessionSeconds = Math.floor((now - state.startTime) / 1000);

      state.totalSeconds += sessionSeconds;
      state.isReading = false;
      state.startTime = null;
      await saveState(state);

      await sendMessage(
        `⏹ <b>Reading stopped</b>\n\n😌 Take rest`
      );
      return new Response("OK");
    }

    /* ---------------- TODAY STATUS ---------------- */
    if (text === "Today Status" || text === "/status") {
      let liveSeconds = state.totalSeconds;
      if (state.isReading && state.startTime) {
        liveSeconds += Math.floor((Date.now() - state.startTime) / 1000);
      }

      const remaining = Math.max(TARGET_SECONDS - liveSeconds, 0);

      await sendMessage(
        `🌸 <b>Dear Student</b> 🌸\n\n📊 <b>Today's Study</b>\n⏱ Studied: <b>${formatTime(
          liveSeconds
        )}</b>\n🎯 Target: <b>08h 00m</b>\n⏳ Remaining: <b>${formatTime(
          remaining
        )}</b>`
      );
      return new Response("OK");
    }

    /* ---------------- HELP ---------------- */
    if (text === "Help" || text === "/help") {
      await sendMessage(
        `🌸 <b>Dear Student</b> 🌸\n\n📌 Available Commands:\n• Start Reading\n• Stop Reading\n• Today Status\n\n⚠️ MCQ mode inactive`
      );
      return new Response("OK");
    }

    /* ---------------- SAFE MODE (NO SPAM) ---------------- */
    return new Response("OK");
  },
};
