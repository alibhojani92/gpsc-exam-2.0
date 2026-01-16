/**
 * =========================================
 * GPSC Exam 2.0 – PHASE 1 (READING SYSTEM)
 * =========================================
 * Phase-1 ONLY – Stable Core
 * KV Required: KV_READING
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

    const mainKeyboard = {
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

    // ---------- COMMAND HANDLING ----------
    if (update.message?.text === "/start") {
      await sendMessage(
        "🌺 <b>Dear Student</b> 🌺\n\n" +
        "📚 Welcome to GPSC Exam 2.0\n\n" +
        "🎯 Daily Target: <b>08:00 hours</b>\n" +
        "👇 Use buttons below",
        mainKeyboard
      );
      return new Response("OK");
    }

    // ---------- CALLBACK HANDLING ----------
    const data = update.callback_query?.data;
    if (!data) return new Response("OK");

    // ---------- START READING ----------
    if (data === "START_READ") {
      const existing = await env.KV_READING.get(startKey);
      if (existing) {
        await sendMessage(
          "⚠️ <b>Reading already running</b>\n\n" +
          "⏳ Finish current session first.",
          mainKeyboard
        );
        return new Response("OK");
      }

      await env.KV_READING.put(startKey, Date.now().toString());

      const total = parseInt((await env.KV_READING.get(totalKey)) || "0");
      const remaining = Math.max(TARGET_MINUTES - total, 0);

      await sendMessage(
        "▶️ <b>Reading Started</b>\n\n" +
        `🎯 Target: 08:00\n` +
        `⏳ Remaining Today: <b>${formatTime(remaining)}</b>\n\n` +
        "💪 Stay focused!",
        mainKeyboard
      );
      return new Response("OK");
    }

    // ---------- STOP READING ----------
    if (data === "STOP_READ") {
      const start = await env.KV_READING.get(startKey);
      if (!start) {
        await sendMessage(
          "⚠️ <b>No active reading session</b>",
          mainKeyboard
        );
        return new Response("OK");
      }

      const durationMin = Math.floor((Date.now() - Number(start)) / 60000);
      await env.KV_READING.delete(startKey);

      const prevTotal = parseInt((await env.KV_READING.get(totalKey)) || "0");
      const newTotal = prevTotal + durationMin;
      await env.KV_READING.put(totalKey, newTotal.toString());

      const remaining = Math.max(TARGET_MINUTES - newTotal, 0);

      await sendMessage(
        "⏹️ <b>Reading Stopped</b>\n\n" +
        `📘 Session: <b>${formatTime(durationMin)}</b>\n` +
        `📊 Today Total: <b>${formatTime(newTotal)}</b>\n` +
        `⏳ Remaining: <b>${formatTime(remaining)}</b>\n\n` +
        "🌟 Good job!",
        mainKeyboard
      );
      return new Response("OK");
    }

    // ---------- STATUS ----------
    if (data === "STATUS") {
      const total = parseInt((await env.KV_READING.get(totalKey)) || "0");
      const remaining = Math.max(TARGET_MINUTES - total, 0);

      await sendMessage(
        "📊 <b>Today's Reading Status</b>\n\n" +
        `📘 Studied: <b>${formatTime(total)}</b>\n` +
        `🎯 Target: 08:00\n` +
        `⏳ Remaining: <b>${formatTime(remaining)}</b>`,
        mainKeyboard
      );
      return new Response("OK");
    }

    // ---------- HELP ----------
    if (data === "HELP") {
      await sendMessage(
        "❓ <b>Help</b>\n\n" +
        "▶️ Start Reading – Begin session\n" +
        "⏹️ Stop Reading – End session\n" +
        "📊 Today Status – View progress\n\n" +
        "⏱️ Target: 08 hours/day",
        mainKeyboard
      );
      return new Response("OK");
    }

    return new Response("OK");
  },
};
