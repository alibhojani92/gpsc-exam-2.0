/********************************************************
 * GPSC EXAM 2.0 BOT
 * PART 1 – CORE FOUNDATION
 * (Webhook, Routing, Intro, Safety)
 *
 * 🔒 LOCK RULE:
 * - This file is FULL replacement
 * - Paste ONCE
 * - After PASS → NEVER EDIT
 ********************************************************/

export default {
  async fetch(request, env, ctx) {
    if (request.method !== "POST") {
      return new Response("Bot is running ✅", { status: 200 });
    }

    let update;
    try {
      update = await request.json();
    } catch (e) {
      return new Response("Invalid JSON", { status: 200 });
    }

    if (!update.message && !update.callback_query) {
      return new Response("No usable update", { status: 200 });
    }

    const message = update.message || update.callback_query.message;
    const chatId = message.chat.id;
    const userId = message.from.id;
    const text =
      update.message?.text ||
      update.callback_query?.data ||
      "";

    const BOT_TOKEN = env.BOT_TOKEN;
    const ADMIN_ID = Number(env.ADMIN_ID || 0);

    const isAdmin = userId === ADMIN_ID;

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

    /* ---------------- INLINE KEYBOARD ---------------- */

    const mainKeyboard = {
      inline_keyboard: [
        [
          { text: "▶️ Start Reading", callback_data: "START_READING" },
          { text: "⏹ Stop Reading", callback_data: "STOP_READING" },
        ],
        [
          { text: "📊 Today Status", callback_data: "TODAY_STATUS" },
          { text: "❓ Help", callback_data: "HELP" },
        ],
      ],
    };

    /* ---------------- COMMAND ROUTER ---------------- */

    // Mandatory position (DO NOT MOVE)
    if (await handleReading(update, env, sendMessage, answerCallback)) {
      return new Response("OK");
    }

    // START / HELP
    if (text === "/start" || text === "HELP") {
      await sendMessage(
        `🌺 <b>Dear Student</b> 🌺\n\n` +
          `📚 <b>Welcome to GPSC Exam 2.0</b>\n\n` +
          `🎯 <b>Daily Target:</b> 08:00 hours\n` +
          `👇 Use buttons below`,
        mainKeyboard
      );
      return new Response("OK");
    }

    return new Response("OK");
  },
};

/* ====================================================
 * PART-1 INTERNAL HANDLER
 * Reading (basic logic placeholder)
 * Other parts will extend this safely
 * ==================================================== */

async function handleReading(update, env, sendMessage, answerCallback) {
  if (!update.callback_query) return false;

  const data = update.callback_query.data;

  if (data === "START_READING") {
    await answerCallback();
    await sendMessage(
      `📖 <b>Reading started</b>\n\n🎯 Target: 08:00\n💪 Stay focused`
    );
    return true;
  }

  if (data === "STOP_READING") {
    await answerCallback();
    await sendMessage(
      `⏹ <b>Reading stopped</b>\n\n😌 Take rest`
    );
    return true;
  }

  if (data === "TODAY_STATUS") {
    await answerCallback();
    await sendMessage(
      `📊 <b>Today's Status</b>\n\n⏱ Studied: 00:00\n🎯 Remaining: 08:00`
    );
    return true;
  }

  if (data === "HELP") {
    await answerCallback();
    await sendMessage(
      `🌺 <b>Only Dear Student</b> 🌺\n\n` +
        `📌 <b>Available Commands:</b>\n` +
        `▶️ Start Reading\n` +
        `⏹ Stop Reading\n` +
        `📊 Today Status\n\n` +
        `⚠️ MCQ safe mode active\n(No questions added yet)`
    );
    return true;
  }

  return false;
}
