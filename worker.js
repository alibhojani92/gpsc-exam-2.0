export default {
  async fetch(request, env) {
    if (request.method !== "POST") {
      return new Response("OK");
    }

    let update;
    try {
      update = await request.json();
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }

    const BOT_TOKEN = env.BOT_TOKEN;
    const API = `https://api.telegram.org/bot${BOT_TOKEN}`;

    // ---------- Helpers ----------
    async function sendMessage(chatId, text, replyMarkup = null) {
      const payload = {
        chat_id: chatId,
        text,
        parse_mode: "HTML",
      };
      if (replyMarkup) payload.reply_markup = replyMarkup;

      await fetch(`${API}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }

    // ---------- Extract message ----------
    const msg =
      update.message ||
      update.edited_message ||
      update.callback_query?.message;

    if (!msg || !msg.text) {
      return new Response("No message");
    }

    const text = msg.text.trim();
    const chatId = msg.chat.id;

    // ---------- INTRO TEXT ----------
    const INTRO = "🌺❤️ My Love Dr Arzoo Fatema ❤️🌺";

    // ---------- COMMAND HANDLER ----------
    if (!text.startsWith("/")) {
      // ❌ Ignore all normal messages (NO SPAM)
      return new Response("Ignored");
    }

    // Normalize command (remove bot username)
    const command = text.split(" ")[0].split("@")[0];

    switch (command) {
      case "/start":
        await sendMessage(
          chatId,
          `${INTRO}\n\n✨ Welcome\n\nUse commands to continue.\n/help`
        );
        break;

      case "/help":
        await sendMessage(
          chatId,
          `${INTRO}\n\n📌 Available Commands:\n\n` +
            `• /start – Start bot\n` +
            `• /help – Help menu\n\n` +
            `More features coming next phases 🚀`
        );
        break;

      default:
        await sendMessage(
          chatId,
          `${INTRO}\n\n❌ Unknown command\nUse /help`
        );
        break;
    }

    return new Response("OK");
  },
};
