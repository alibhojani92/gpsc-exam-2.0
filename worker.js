export default {
  async fetch(request, env, ctx) {
    try {
      if (request.method !== "POST") {
        return new Response("GPSC Exam 2.0 Bot Running ✅", { status: 200 });
      }

      const update = await request.json();

      // ====== DUPLICATE UPDATE GUARD ======
      if (update.update_id) {
        const key = `upd_${update.update_id}`;
        const exists = await env.GPSC_KV.get(key);
        if (exists) return new Response("OK", { status: 200 });
        await env.GPSC_KV.put(key, "1", { expirationTtl: 60 });
      }

      const message = update.message;
      if (!message || !message.text) {
        return new Response("OK", { status: 200 });
      }

      const chatId = message.chat.id;
      const text = message.text.trim();
      const from = message.from;

      // ====== CONSTANTS ======
      const GROUP_ID = -5154292869;
      const ADMIN_ID = 7539477188;
      const BOT_TOKEN = "8104511174:AAEEucTcqSaqrCtvha5nWngbKcgh_6tiec4";

      const isGroup = message.chat.type === "group" || message.chat.type === "supergroup";
      const isAdmin = from.id === ADMIN_ID;

      // ====== GROUP FILTER ======
      if (isGroup && chatId !== GROUP_ID) {
        return new Response("OK", { status: 200 });
      }

      // ====== REGISTER USER (D1) ======
      await env.GPSC_DB.prepare(
        "INSERT OR IGNORE INTO users (telegram_id, first_seen) VALUES (?, ?)"
      ).bind(String(from.id), new Date().toISOString()).run();

      // ====== COMMAND HANDLER ======
      if (text === "/start") {
        await sendMessage(
          BOT_TOKEN,
          chatId,
          "🌺 *Welcome Dr Arzoo Fatema* ❤️🌺\n\n" +
          "📌 GPSC Exam 2.0 Bot Active\n" +
          "✅ System Stable\n\n" +
          "👉 Commands:\n" +
          "• /start – Start bot\n" +
          "• /ping – Health check",
        );
      }

      else if (text === "/ping") {
        await sendMessage(
          BOT_TOKEN,
          chatId,
          "🟢 *Bot Status:* ONLINE\n" +
          "⚙️ Phase-1 Core Stable\n" +
          "🚀 Ready for next phases",
        );
      }

      else {
        // Unknown command (soft ignore)
        if (!isGroup) {
          await sendMessage(
            BOT_TOKEN,
            chatId,
            "ℹ️ Command not recognized.\nUse /start",
          );
        }
      }

      return new Response("OK", { status: 200 });

    } catch (err) {
      return new Response("ERROR", { status: 200 });
    }
  }
};

// ====== TELEGRAM SEND MESSAGE ======
async function sendMessage(token, chatId, text) {
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "Markdown"
    })
  });
}
