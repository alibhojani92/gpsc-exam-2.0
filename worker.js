export default {
  async fetch(request, env, ctx) {
    try {
      if (request.method !== "POST") {
        return new Response("OK", { status: 200 });
      }

      const update = await request.json();
      if (!update.message) {
        return new Response("OK", { status: 200 });
      }

      const message = update.message;
      const chatId = message.chat.id;
      const chatType = message.chat.type; // private | group | supergroup
      const text = message.text || "";

      // ===== CONFIG (future use) =====
      const ADMIN_ID = 7539477188;
      const MAIN_GROUP_ID = -5154292869;

      // ===== /start COMMAND =====
      if (text === "/start") {
        let reply = "";

        if (chatType === "private") {
          reply =
            "👋 *Welcome to GPSC Exam 2.0*\n\n" +
            "📘 Reading\n📝 Tests\n📊 Reports\n📚 MCQs\n\n" +
            "🔒 Private Mode Active\n🚀 Phase-1 Core Ready";
        } else {
          reply =
            "👋 *Welcome to GPSC Exam 2.0 (Group)*\n\n" +
            "📘 Reading\n📝 Tests\n📊 Reports\n📚 MCQs\n\n" +
            "👥 Group Mode Active\n🚀 Phase-1 Core Ready";
        }

        await sendMessage(env, chatId, reply);
      }

      return new Response("OK", { status: 200 });

    } catch (err) {
      console.error("Worker Error:", err);
      return new Response("Error", { status: 500 });
    }
  }
};

// ===== TELEGRAM SEND FUNCTION =====
async function sendMessage(env, chatId, text) {
  const url = `https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`;

  const payload = {
    chat_id: chatId,
    text,
    parse_mode: "Markdown"
  };

  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}
