export default {
  async fetch(request, env, ctx) {
    // Telegram sends POST requests
    if (request.method !== "POST") {
      return new Response("OK", { status: 200 });
    }

    let update;
    try {
      update = await request.json();
    } catch (e) {
      console.log("❌ Invalid JSON", e);
      return new Response("Bad Request", { status: 400 });
    }

    // Basic safety
    if (!update.message && !update.callback_query) {
      return new Response("Ignored", { status: 200 });
    }

    const msg = update.message || update.callback_query?.message;
    if (!msg || !msg.chat) {
      return new Response("No chat", { status: 200 });
    }

    const chatId = msg.chat.id;
    const text = msg.text || "";

    // --- COMMAND HANDLER ---
    if (text.startsWith("/start")) {
      await sendMessage(env, chatId,
        "👋 Welcome to *GPSC Exam 2.0* 📚\n\n" +
        "✅ Bot is live\n" +
        "✅ Group & Private enabled\n\n" +
        "More features coming soon 🚀",
        "Markdown"
      );
    }

    // --- HEALTH CHECK ---
    else if (text === "/ping") {
      await sendMessage(env, chatId, "🏓 Pong! Bot is alive ✅");
    }

    // --- DB TEST ---
    else if (text === "/dbtest") {
      try {
        const res = await env.DB.prepare(
          "SELECT 1 as ok"
        ).first();
        await sendMessage(env, chatId, "🗄️ D1 DB Connected ✅");
      } catch (e) {
        console.log("DB error", e);
        await sendMessage(env, chatId, "❌ D1 DB Error");
      }
    }

    // --- KV TEST ---
    else if (text === "/kvtest") {
      try {
        await env.KV.put("phase1_test", "ok");
        const v = await env.KV.get("phase1_test");
        await sendMessage(env, chatId, "🧠 KV Working ✅");
      } catch (e) {
        console.log("KV error", e);
        await sendMessage(env, chatId, "❌ KV Error");
      }
    }

    // --- DEFAULT REPLY (TEMP) ---
    else {
      await sendMessage(
        env,
        chatId,
        "ℹ️ Command received.\nPhase-1 active ✅"
      );
    }

    return new Response("OK", { status: 200 });
  }
};

// ==================
// TELEGRAM SEND API
// ==================
async function sendMessage(env, chatId, text, parseMode) {
  const url = `https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`;

  const payload = {
    chat_id: chatId,
    text: text,
  };

  if (parseMode) {
    payload.parse_mode = parseMode;
  }

  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    console.log("Send message error", e);
  }
}
