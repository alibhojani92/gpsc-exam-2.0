export default {
  async fetch(request, env, ctx) {
    if (request.method !== "POST") {
      return new Response("OK", { status: 200 });
    }

    let update;
    try {
      update = await request.json();
    } catch (e) {
      return new Response("Invalid JSON", { status: 200 });
    }

    const BOT_TOKEN = env.BOT_TOKEN;
    const API_URL = `https://api.telegram.org/bot${BOT_TOKEN}`;

    // FIXED NAME (HARD CODED – NEVER CHANGE)
    const BOT_NAME = "🌺❤️ My Love Dr Arzoo Fatema ❤️🌺";

    // Get message (private or group)
    const message =
      update.message ||
      update.edited_message ||
      update.channel_post ||
      update.edited_channel_post;

    if (!message || !message.chat) {
      return new Response("No message", { status: 200 });
    }

    const chatId = message.chat.id;
    const text = (message.text || "").trim();

    let replyText = "";

    // START COMMAND
    if (text === "/start") {
      replyText =
        `${BOT_NAME}\n\n` +
        `👋 Welcome!\n` +
        `📚 This is GPSC Exam 2.0 Bot\n\n` +
        `Type anything to check bot is alive ✅`;
    }
    // ANY OTHER MESSAGE
    else if (text.length > 0) {
      replyText =
        `${BOT_NAME}\n\n` +
        `✅ Bot is working\n` +
        `📝 You said: ${text}`;
    } else {
      return new Response("No text", { status: 200 });
    }

    // SEND MESSAGE
    try {
      await fetch(`${API_URL}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: replyText,
        }),
      });
    } catch (e) {
      return new Response("Send failed", { status: 200 });
    }

    return new Response("OK", { status: 200 });
  },
};
