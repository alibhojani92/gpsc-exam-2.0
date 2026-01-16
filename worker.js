// ==================================================
// 🌺 GPSC Exam 2.0 – Phase 1 Core (Stable Foundation)
// ==================================================

export default {
  async fetch(request, env, ctx) {
    if (request.method !== "POST") {
      return new Response("OK", { status: 200 });
    }

    let update;
    try {
      update = await request.json();
    } catch (e) {
      return new Response("Invalid JSON", { status: 400 });
    }

    // Telegram message detection
    const message =
      update.message ||
      update.edited_message ||
      (update.callback_query && update.callback_query.message);

    if (!message || !message.text) {
      return new Response("No message", { status: 200 });
    }

    const chatId = message.chat.id;
    const text = message.text.trim();

    // ===== COMMAND ROUTER =====
    if (text === "/start") {
      await sendMessage(
        env,
        chatId,
        "🌺❤️ Dr Arzoo Fatema ❤️🌺\n\n" +
          "Welcome to *GPSC Exam 2.0* 🤍\n\n" +
          "📌 This bot will help you with:\n" +
          "• Reading tracking\n" +
          "• MCQ tests\n" +
          "• Reports & analytics\n\n" +
          "Use /help to see commands."
      );
    } else if (text === "/help") {
      await sendMessage(
        env,
        chatId,
        "📖 *Help – Phase 1*\n\n" +
          "Available commands:\n\n" +
          "▶️ /start – Start bot\n" +
          "ℹ️ /help – Command list\n\n" +
          "🚧 More features coming in next phases."
      );
    } else {
      // Safe fallback (NO SPAM)
      await sendMessage(
        env,
        chatId,
        "🌺 Dear Student 🌺\n\n" +
          "⚠️ Command not available yet.\n" +
          "Please wait for next update."
      );
    }

    return new Response("OK", { status: 200 });
  },
};

// ===== TELEGRAM SEND MESSAGE HELPER =====
async function sendMessage(env, chatId, text) {
  const url = `https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`;

  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "Markdown",
    }),
  });
}

// ================== END PHASE 1 ==================
