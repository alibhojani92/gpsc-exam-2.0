/**
 * =========================================
 * GPSC EXAM 2.0 BOT
 * PHASE 0.1 – CORE SKELETON
 * =========================================
 * - Webhook handler
 * - Group + Private reply
 * - Health check
 * - Intro message
 * =========================================
 */

export default {
  async fetch(request, env, ctx) {
    // Health check (browser / ping)
    if (request.method === "GET") {
      return new Response("GPSC Exam 2.0 Bot – Phase 0.1 ✅", {
        status: 200,
      });
    }

    // Only POST allowed for Telegram webhook
    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    let update;
    try {
      update = await request.json();
    } catch (e) {
      return new Response("Invalid JSON", { status: 400 });
    }

    // Extract message (private or group)
    const message =
      update.message ||
      update.edited_message ||
      update.callback_query?.message;

    if (!message || !message.chat) {
      return new Response("No message", { status: 200 });
    }

    const chatId = message.chat.id;
    const text = message.text || "";

    // Basic reply (same for group & private)
    const replyText =
      "🌺 Dear Student 🌺\n\n" +
      "✅ Bot is alive and working.\n" +
      "📌 Phase 0.1 core system active.";

    // Send message back to Telegram
    await sendMessage(env.BOT_TOKEN, chatId, replyText);

    return new Response("OK", { status: 200 });
  },
};

/**
 * Send message helper
 */
async function sendMessage(token, chatId, text) {
  const url = `https://api.telegram.org/bot${token}/sendMessage`;

  const payload = {
    chat_id: chatId,
    text,
  };

  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}
