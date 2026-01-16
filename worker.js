// ================================
// GPSC Exam 2.0 – PHASE 1
// CORE STABLE BOT (Webhook + Start + Help)
// ================================

export default {
  async fetch(request, env) {
    if (request.method !== "POST") {
      return new Response("OK", { status: 200 });
    }

    const update = await request.json();

    // Telegram message OR callback
    const message =
      update.message ||
      update.edited_message ||
      update.callback_query?.message;

    if (!message || !message.chat) {
      return new Response("OK", { status: 200 });
    }

    const chatId = message.chat.id;
    const text = update.message?.text || "";

    // ===== COMMON HEADER =====
    const HEADER = "🌺 Only Dear Student 🌺\n\n";

    // ===== SEND MESSAGE FUNCTION =====
    async function send(text, keyboard = null) {
      const body = {
        chat_id: chatId,
        text: HEADER + text,
        parse_mode: "HTML",
      };

      if (keyboard) {
        body.reply_markup = keyboard;
      }

      await fetch(
        `https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
    }

    // ===== /start COMMAND =====
    if (text === "/start") {
      await send(
        "👋 Welcome!\n\n" +
          "This is <b>GPSC Exam 2.0</b>.\n\n" +
          "Use the buttons below 👇",
        {
          inline_keyboard: [
            [{ text: "📖 Help / Commands", callback_data: "HELP" }],
          ],
        }
      );
      return new Response("OK", { status: 200 });
    }

    // ===== /help COMMAND =====
    if (text === "/help") {
      await send(
        "📘 <b>Available Commands</b>\n\n" +
          "▶️ /start – Start bot\n" +
          "▶️ /help – Command list\n\n" +
          "More features will unlock step by step 🚀"
      );
      return new Response("OK", { status: 200 });
    }

    // ===== INLINE HELP BUTTON =====
    if (update.callback_query?.data === "HELP") {
      await send(
        "📘 <b>Command List</b>\n\n" +
          "▶️ /start – Start bot\n" +
          "▶️ /help – Command list\n\n" +
          "MCQs, Tests, Reports coming soon 💡"
      );
      return new Response("OK", { status: 200 });
    }

    // ===== SAFE DEFAULT (NO SPAM) =====
    if (text.startsWith("/")) {
      await send(
        "❌ Unknown command.\n\n" +
          "Type /help to see available options."
      );
    }

    return new Response("OK", { status: 200 });
  },
};
