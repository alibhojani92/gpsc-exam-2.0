export default {
  async fetch(request, env, ctx) {
    // Telegram only sends POST updates
    if (request.method !== "POST") {
      return new Response("OK", { status: 200 });
    }

    let update;
    try {
      update = await request.json();
    } catch (e) {
      return new Response("Invalid JSON", { status: 200 });
    }

    // Telegram message object
    const message = update.message || update.edited_message;
    if (!message) {
      return new Response("No message", { status: 200 });
    }

    const chatId = message.chat.id;
    const text = message.text || "";

    // /start command (group + private)
    if (text.startsWith("/start")) {
      await sendMessage(
        env.BOT_TOKEN,
        chatId,
        "👋 Welcome to *GPSC Exam 2.0* 📚\n\n✅ Bot is active\n🧠 Phase-1 core running\n🚀 More features coming soon!",
        true
      );
    }

    // Always return 200 to Telegram
    return new Response("OK", { status: 200 });
  }
};

// Helper function to send Telegram message
async function sendMessage(token, chatId, text, markdown = false) {
  const url = `https://api.telegram.org/bot${token}/sendMessage`;

  const payload = {
    chat_id: chatId,
    text,
    disable_web_page_preview: true
  };

  if (markdown) {
    payload.parse_mode = "Markdown";
  }

  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}
