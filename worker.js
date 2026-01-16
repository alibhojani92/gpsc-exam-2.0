/************************************************************
 * GPSC DENTAL EXAM BOT 2.0
 * PHASE 1 — CORE FOUNDATION (FINAL FIX)
 * Features:
 * - Reading start/stop with accurate timing
 * - Daily auto reset
 * - Remaining target calculation
 * - Today / Yesterday stats
 * - Inline keyboard only
 * - Double-click protection
 * - No spam / safe fallback
 ************************************************************/

export default {
  async fetch(request, env, ctx) {
    if (request.method !== "POST") {
      return new Response("Bot running ✅", { status: 200 });
    }

    const update = await request.json();
    if (!update.message && !update.callback_query) {
      return new Response("OK", { status: 200 });
    }

    const BOT_TOKEN = env.BOT_TOKEN;
    const chat =
      update.message?.chat || update.callback_query?.message.chat;
    const chatId = chat.id;
    const userId =
      update.message?.from.id ||
      update.callback_query?.from.id;

    const text = update.message?.text || "";
    const callbackData = update.callback_query?.data || "";

    /* -------------------- TELEGRAM SEND -------------------- */
    async function sendMessage(text, replyMarkup = null) {
      const payload = {
        chat_id: chatId,
        text,
        parse_mode: "HTML",
      };
      if (replyMarkup) payload.reply_markup = replyMarkup;

      await fetch(
        `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
    }

    async function answerCallback() {
      if (!update.callback_query) return;
      await fetch(
        `https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            callback_query_id: update.callback_query.id,
          }),
        }
      );
    }

    /* -------------------- DATE HELPERS -------------------- */
    function todayKey() {
      return new Date().toISOString().slice(0, 10);
    }

    function msToHHMM(ms) {
      const totalMin = Math.floor(ms / 60000);
      const h = Math.floor(totalMin / 60)
        .toString()
        .padStart(2, "0");
      const m = (totalMin % 60).toString().padStart(2, "0");
      return `${h}:${m}`;
    }

    const TARGET_MS = 8 * 60 * 60 * 1000;

    /* -------------------- LOAD USER DATA -------------------- */
    const userKey = `user:${userId}`;
    let user =
      (await env.KV.get(userKey, "json")) || {
        date: todayKey(),
        totalMs: 0,
        yesterdayMs: 0,
        reading: false,
        startAt: null,
      };

    /* -------------------- DAILY RESET -------------------- */
    const today = todayKey();
    if (user.date !== today) {
      user.yesterdayMs = user.totalMs;
      user.totalMs = 0;
      user.reading = false;
      user.startAt = null;
      user.date = today;
    }

    /* -------------------- INLINE KEYBOARD -------------------- */
    const keyboard = {
      inline_keyboard: [
        [
          { text: "▶️ Start Reading", callback_data: "START" },
          { text: "⏹ Stop Reading", callback_data: "STOP" },
        ],
        [
          { text: "📊 Today Status", callback_data: "STATUS" },
          { text: "❓ Help", callback_data: "HELP" },
        ],
      ],
    };

    /* -------------------- COMMAND / CALLBACK HANDLER -------------------- */

    const action = callbackData || text;

    // START
    if (action === "/start" || action === "START") {
      await answerCallback();

      await sendMessage(
        `🌸 <b>Dear Student</b> 🌸

📚 Welcome to <b>GPSC Dental Exam 2.0</b>

🎯 Daily Target: <b>08:00 hours</b>
👇 Use buttons below`,
        keyboard
      );

      await env.KV.put(userKey, JSON.stringify(user));
      return new Response("OK");
    }

    // START READING
    if (action === "START") {
      await answerCallback();

      if (user.reading) {
        await sendMessage(
          "⚠️ Reading already started.\nPlease stop first.",
          keyboard
        );
        return new Response("OK");
      }

      user.reading = true;
      user.startAt = Date.now();

      await sendMessage(
        `📖 <b>Reading started</b>

🎯 Target: 08:00
💪 Stay focused`,
        keyboard
      );

      await env.KV.put(userKey, JSON.stringify(user));
      return new Response("OK");
    }

    // STOP READING
    if (action === "STOP") {
      await answerCallback();

      if (!user.reading) {
        await sendMessage(
          "⚠️ Reading not active.\nPress Start first.",
          keyboard
        );
        return new Response("OK");
      }

      const sessionMs = Date.now() - user.startAt;
      user.totalMs += sessionMs;
      user.reading = false;
      user.startAt = null;

      await sendMessage(
        `⏹ <b>Reading stopped</b>

🕒 Session: ${msToHHMM(sessionMs)}
📊 Today total: ${msToHHMM(user.totalMs)}

😌 Take rest`,
        keyboard
      );

      await env.KV.put(userKey, JSON.stringify(user));
      return new Response("OK");
    }

    // STATUS
    if (action === "STATUS") {
      await answerCallback();

      const remaining = Math.max(
        TARGET_MS - user.totalMs,
        0
      );

      await sendMessage(
        `📊 <b>Today's Status</b>

🕒 Studied: ${msToHHMM(user.totalMs)}
⏳ Remaining: ${msToHHMM(remaining)}

📅 Yesterday: ${msToHHMM(user.yesterdayMs)}`,
        keyboard
      );

      return new Response("OK");
    }

    // HELP
    if (action === "HELP") {
      await answerCallback();

      await sendMessage(
        `❓ <b>Help</b>

▶️ Start Reading — begin timer
⏹ Stop Reading — stop & save time
📊 Today Status — view progress

⚠️ MCQ Safe Mode active`,
        keyboard
      );

      return new Response("OK");
    }

    // UNKNOWN (NO SPAM)
    if (text && text.startsWith("/")) {
      await sendMessage(
        "⚠️ Command not available yet.\nPlease use buttons.",
        keyboard
      );
    }

    await env.KV.put(userKey, JSON.stringify(user));
    return new Response("OK");
  },
};
