/****************************************************
 * PHASE 1 – CORE NAVIGATION & SAFE BASE
 * FULL REPLACEMENT worker.js
 * Paste ONCE → Deploy → Test
 * If FAIL → I will resend FULL Phase-1 again
 ****************************************************/

export default {
  async fetch(request, env) {
    // ---------- BASIC ROUTER ----------
    if (request.method !== "POST") {
      return new Response("OK", { status: 200 });
    }

    let update;
    try {
      update = await request.json();
    } catch {
      return new Response("INVALID_JSON", { status: 400 });
    }

    const message =
      update.message ||
      update.edited_message ||
      update.callback_query?.message;

    if (!message || !message.chat) {
      return new Response("NO_MESSAGE", { status: 200 });
    }

    const chatId = message.chat.id;
    const text =
      update.message?.text ||
      update.callback_query?.data ||
      "";

    // ---------- CONSTANT INTRO ----------
    const INTRO = "🌺 Only Dear Student 🌺";

    // ---------- TELEGRAM SEND ----------
    async function sendMessage(payload) {
      const url = `https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`;
      await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }

    // ---------- MAIN MENU ----------
    const MAIN_MENU = {
      reply_markup: {
        keyboard: [
          [{ text: "📘 Start Reading" }],
          [{ text: "🛑 Stop Reading" }],
          [{ text: "📝 Daily Test" }],
          [{ text: "📊 My Report" }],
          [{ text: "ℹ️ Help" }],
        ],
        resize_keyboard: true,
      },
    };

    // ---------- /START ----------
    if (text === "/start") {
      await sendMessage({
        chat_id: chatId,
        text: `${INTRO}\n\n📚 Welcome\nChoose an option 👇`,
        ...MAIN_MENU,
      });
      return new Response("OK");
    }

    // ---------- HELP ----------
    if (text === "ℹ️ Help" || text === "/help") {
      await sendMessage({
        chat_id: chatId,
        text:
          `${INTRO}\n\n` +
          "📌 Available Commands:\n\n" +
          "📘 Start Reading\n" +
          "🛑 Stop Reading\n" +
          "📝 Daily Test\n" +
          "📊 My Report\n\n" +
          "⚠️ MCQ safe mode active\n(No questions added yet)",
        ...MAIN_MENU,
      });
      return new Response("OK");
    }

    // ---------- START READING ----------
    if (text === "📘 Start Reading") {
      await sendMessage({
        chat_id: chatId,
        text:
          `${INTRO}\n\n` +
          "📖 Reading started\n\n" +
          "🎯 Target: 08:00\n" +
          "Stay focused 💪",
        ...MAIN_MENU,
      });
      return new Response("OK");
    }

    // ---------- STOP READING ----------
    if (text === "🛑 Stop Reading") {
      await sendMessage({
        chat_id: chatId,
        text:
          `${INTRO}\n\n` +
          "⏹ Reading stopped\n\n" +
          "Take rest 😌",
        ...MAIN_MENU,
      });
      return new Response("OK");
    }

    // ---------- DAILY TEST (SAFE MODE) ----------
    if (text === "📝 Daily Test") {
      await sendMessage({
        chat_id: chatId,
        text:
          `${INTRO}\n\n` +
          "📝 Daily Test\n\n" +
          "⚠️ No MCQs available right now\n" +
          "Please try later.",
        ...MAIN_MENU,
      });
      return new Response("OK");
    }

    // ---------- REPORT (EMPTY SAFE MODE) ----------
    if (text === "📊 My Report") {
      await sendMessage({
        chat_id: chatId,
        text:
          `${INTRO}\n\n` +
          "📊 Your Report\n\n" +
          "No data available yet.",
        ...MAIN_MENU,
      });
      return new Response("OK");
    }

    // ---------- FALLBACK ----------
    await sendMessage({
      chat_id: chatId,
      text:
        `${INTRO}\n\n` +
        "❓ Unknown command\n\n" +
        "Please use menu buttons.",
      ...MAIN_MENU,
    });

    return new Response("OK");
  },
};

/***********************
 * PHASE 1 – END
 ***********************/
