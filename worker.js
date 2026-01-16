/**
 * =========================================
 * GPSC Exam 2.0 – PHASE 1 (READING SYSTEM)
 * FIXED: Inline keyboard callback response
 * =========================================
 */

export default {
  async fetch(request, env, ctx) {
    if (request.method !== "POST") {
      return new Response("OK");
    }

    const update = await request.json();
    const message = update.message || update.callback_query?.message;
    const chatId = message?.chat?.id;
    const userId = message?.from?.id;

    if (!chatId || !userId) {
      return new Response("No chat");
    }

    /* 🔹 MANDATORY: ACKNOWLEDGE CALLBACK 🔹 */
    if (update.callback_query) {
      await fetch(
        `https://api.telegram.org/bot${env.BOT_TOKEN}/answerCallbackQuery`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            callback_query_id: update.callback_query.id,
          }),
        }
      );
    }

    // ---------- CONSTANTS ----------
    const TARGET_MINUTES = 480; // 08:00 hours
    const today = new Date().toISOString().slice(0, 10);

    const startKey = `reading_start:${userId}`;
    const totalKey = `reading_total:${userId}:${today}`;

    // ---------- HELPERS ----------
    const sendMessage = async (text, keyboard = null) => {
      const payload = {
        chat_id: chatId,
        text,
        parse_mode: "HTML",
      };
      if (keyboard) payload.reply_markup = keyboard;

      await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    };

    const formatTime = (mins) => {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    };

    const keyboard = {
      inline_keyboard: [
        [
          { text: "▶️ Start Reading", callback_data: "START_READ" },
          { text: "⏹️ Stop Reading", callback_data: "STOP_READ" },
        ],
        [
          { text: "📊 Today Status", callback_data: "STATUS" },
          { text: "❓ Help", callback_data: "HELP" },
        ],
      ],
    };

    // ---------- /START ----------
    if (update.message?.text === "/start") {
      await sendMessage(
        "🌺 <b>Dear Student</b> 🌺\n\n" +
          "📚 Welcome to GPSC Exam 2.0\n\n" +
          "🎯 Daily Target: <b>08:00 hours</b>\n" +
          "👇 Use buttons below",
        keyboard
      );
      return new Response("OK");
    }

    const data = update.callback_query?.data;
    if (!data) return new Response("OK");

    // ---------- START READING ----------
    if (data === "START_READ") {
      const running = await env.KV_READING.get(startKey);
      if (running) {
        await sendMessage("⚠️ <b>Reading already running</b>", keyboard);
        return new Response("OK");
      }

      await env.KV_READING.put(startKey, Date.now().toString());

      const total = parseInt((await env.KV_READING.get(totalKey)) || "0");
      const remaining = Math.max(TARGET_MINUTES - total, 0);

      await sendMessage(
        "▶️ <b>Reading Started</b>\n\n" +
          `🎯 Target: 08:00\n` +
          `⏳ Remaining: <b>${formatTime(remaining)}</b>\n\n` +
          "💪 Stay focused!",
        keyboard
      );
    }

    // ---------- STOP READING ----------
    if (data === "STOP_READ") {
      const start = await env.KV_READING.get(startKey);
      if (!start) {
        await sendMessage("⚠️ <b>No active session</b>", keyboard);
        return new Response("OK");
      }

      const duration = Math.floor((Date.now() - Number(start)) / 60000);
      await env.KV_READING.delete(startKey);

      const prev = parseInt((await env.KV_READING.get(totalKey)) || "0");
      const total = prev + duration;
      await env.KV_READING.put(totalKey, total.toString());

      const remaining = Math.max(TARGET_MINUTES - total, 0);

      await sendMessage(
        "⏹️ <b>Reading Stopped</b>\n\n" +
          `📘 Session: <b>${formatTime(duration)}</b>\n` +
          `📊 Today: <b>${formatTime(total)}</b>\n` +
          `⏳ Remaining: <b>${formatTime(remaining)}</b>`,
        keyboard
      );
    }

    // ---------- STATUS ----------
    if (data === "STATUS") {
      const total = parseInt((await env.KV_READING.get(totalKey)) || "0");
      const remaining = Math.max(TARGET_MINUTES - total, 0);

      await sendMessage(
        "📊 <b>Today's Status</b>\n\n" +
          `📘 Studied: <b>${formatTime(total)}</b>\n` +
          `🎯 Target: 08:00\n` +
          `⏳ Remaining: <b>${formatTime(remaining)}</b>`,
        keyboard
      );
    }

    // ---------- HELP ----------
    if (data === "HELP") {
      await sendMessage(
        "❓ <b>Help</b>\n\n" +
          "▶️ Start Reading\n" +
          "⏹️ Stop Reading\n" +
          "📊 Today Status\n\n" +
          "🎯 Target: 08 hours/day",
        keyboard
      );
    }

    return new Response("OK");
  },
};
