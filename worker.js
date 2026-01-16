/**********************************************************
 PHASE 1 – CORE SETUP
 GPSC EXAM 2.0 BOT
**********************************************************/

export default {
  async fetch(request, env, ctx) {
    if (request.method !== "POST") {
      return new Response("Bot running ✅", { status: 200 });
    }

    let update;
    try {
      update = await request.json();
    } catch (e) {
      return new Response("Invalid JSON", { status: 400 });
    }

    // Telegram message OR callback
    const message = update.message || update.callback_query?.message;
    if (!message) {
      return new Response("No message", { status: 200 });
    }

    const chatId = message.chat.id;
    const userId = message.from.id;
    const text = update.message?.text || "";

    const ADMIN_ID = Number(env.ADMIN_ID);
    const GROUP_ID = Number(env.GROUP_ID);
    const BOT_TOKEN = env.BOT_TOKEN;

    // Intro text (LOCKED)
    const INTRO = "🌺❤️ My Love Dr Arzoo Fatema ❤️🌺";

    // Helper to send message
    async function sendMessage(text, replyMarkup = null) {
      const payload = {
        chat_id: chatId,
        text,
        parse_mode: "HTML"
      };
      if (replyMarkup) payload.reply_markup = replyMarkup;

      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
    }

    // ===== /start command =====
    if (text === "/start") {
      // Admin menu
      if (userId === ADMIN_ID) {
        await sendMessage(
          `${INTRO}\n\n🛠 <b>Admin Panel</b>\n\nChoose an option 👇`,
          {
            inline_keyboard: [
              [{ text: "➕ Add MCQ", callback_data: "admin_add_mcq" }],
              [{ text: "📊 MCQ Count", callback_data: "admin_mcq_count" }],
              [{ text: "📑 Student Reports", callback_data: "admin_reports" }]
            ]
          }
        );
      } else {
        // Student menu
        await sendMessage(
          `${INTRO}\n\n📚 Welcome\nChoose an option 👇`,
          {
            inline_keyboard: [
              [{ text: "📖 Start Reading", callback_data: "read_start" }],
              [{ text: "⏹ Stop Reading", callback_data: "read_stop" }],
              [{ text: "📝 Daily Test", callback_data: "test_daily" }],
              [{ text: "📊 My Report", callback_data: "my_report" }]
            ]
          }
        );
      }
      return new Response("OK", { status: 200 });
    }

    // ===== Temporary fallback reply (Phase 1 safety) =====
    // Any other message -> basic acknowledgment
    await sendMessage(
      `${INTRO}\n\n✅ Bot is active.\n\nNext features coming soon 🚀`
    );

    return new Response("OK", { status: 200 });
  }
};

/***********************
 END PHASE 1
***********************/
