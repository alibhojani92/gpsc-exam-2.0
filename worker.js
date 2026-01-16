/************************************************************
 * GPSC EXAM 2.0 BOT
 * PART 1 — CORE FOUNDATION
 * (Webhook, Routing, Intro, Safety)
 ************************************************************/

export default {
  async fetch(request, env, ctx) {
    if (request.method !== "POST") {
      return new Response("Bot is running ✅", { status: 200 });
    }

    const update = await request.json();

    if (!update.message) {
      return new Response("No message", { status: 200 });
    }

    const message = update.message;
    const chatId = message.chat.id;
    const userId = message.from.id;
    const text = message.text || "";

    const BOT_TOKEN = env.BOT_TOKEN;
    const ADMIN_ID = Number(env.ADMIN_ID);
    const GROUP_ID = Number(env.GROUP_ID);

    const isAdmin = userId === ADMIN_ID;
    const isGroup = chatId === GROUP_ID;

    // ---------- TELEGRAM SEND ----------
    async function sendMessage(text, replyMarkup = null) {
      const payload = {
        chat_id: chatId,
        text,
        parse_mode: "HTML",
      };
      if (replyMarkup) payload.reply_markup = replyMarkup;

      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }

    // ---------- INTRO TEXT (LOCKED) ----------
    const INTRO = "🌺 Dear Student 🌺";

    // ---------- /start ----------
    if (text === "/start") {
      if (isAdmin) {
        await sendMessage(
          `${INTRO}\n\n🛠 <b>Admin Panel</b>\n\nYou are logged in as admin.`,
        );
      } else {
        await sendMessage(
          `${INTRO}\n\n📘 Welcome to GPSC Dental Exam Bot\n\nUse commands or buttons to continue.`,
        );
      }
      return new Response("OK");
    }

    // ---------- /help (placeholder) ----------
    if (text === "/help") {
      await sendMessage(
        `${INTRO}\n\nℹ️ <b>Help</b>\n\nCommands will be enabled step-by-step.`,
      );
      return new Response("OK");
    }

    // ---------- FALLBACK ----------
    await sendMessage(
      `${INTRO}\n\n⚠️ Command not available yet.\n\nPlease wait for next update.`,
    );

    return new Response("OK");
  },
};
