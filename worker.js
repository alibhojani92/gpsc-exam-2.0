/**
 * ============================================================
 * PHASE-1 : CORE STABLE BOT FOUNDATION
 * Project : GPSC Exam 2.0
 * Scope   : Start, Help, Inline Menu, Safe Replies
 * ============================================================
 */

export default {
  async fetch(request, env, ctx) {
    if (request.method !== "POST") {
      return new Response("Bot is running ✅", { status: 200 });
    }

    const update = await request.json();

    // -----------------------------
    // BASIC UPDATE ROUTING
    // -----------------------------
    if (update.message) {
      return handleMessage(update.message, env);
    }

    if (update.callback_query) {
      return handleCallback(update.callback_query, env);
    }

    return new Response("OK");
  }
};

/* ============================================================
 * CONSTANTS
 * ============================================================
 */
const INTRO = "🌺 Dear Student 🌺";

/* ============================================================
 * MESSAGE HANDLER
 * ============================================================
 */
async function handleMessage(message, env) {
  const chatId = message.chat.id;
  const text = (message.text || "").trim();

  // -------- /start --------
  if (text === "/start") {
    return sendMessage(
      env,
      chatId,
      `${INTRO}\n\n👋 Welcome!\n\nPlease choose an option 👇`,
      startKeyboard()
    );
  }

  // -------- /help --------
  if (text === "/help") {
    return sendMessage(
      env,
      chatId,
      `${INTRO}

📌 Available Commands (Phase-1):

/start – Open main menu  
/help – Command list  

📖 Reading, 📝 Tests, 📊 Reports  
will activate in next phases.

⏳ Please stay tuned.`
    );
  }

  // -------- Known future commands --------
  if (
    ["/read", "/stop", "/dt", "/wt", "/report"].includes(text)
  ) {
    return sendMessage(
      env,
      chatId,
      `${INTRO}

🚧 This feature is coming soon.`
    );
  }

  // -------- Unknown text (ANTI-SPAM SAFE) --------
  if (text.length > 0) {
    return sendMessage(
      env,
      chatId,
      `${INTRO}

⚠️ Command not available yet.

Please use /start or /help.`
    );
  }

  return new Response("OK");
}

/* ============================================================
 * CALLBACK HANDLER (INLINE BUTTONS)
 * ============================================================
 */
async function handleCallback(callback, env) {
  const chatId = callback.message.chat.id;

  // Always answer callback to avoid Telegram warning
  await answerCallback(env, callback.id);

  return sendMessage(
    env,
    chatId,
    `${INTRO}

🚧 This feature is coming soon.`
  );
}

/* ============================================================
 * INLINE KEYBOARD
 * ============================================================
 */
function startKeyboard() {
  return {
    inline_keyboard: [
      [{ text: "📖 Start Reading", callback_data: "read" }],
      [{ text: "🛑 Stop Reading", callback_data: "stop" }],
      [{ text: "📝 Daily Test", callback_data: "dt" }],
      [{ text: "📊 Reports", callback_data: "report" }],
      [{ text: "❓ Help", callback_data: "help" }]
    ]
  };
}

/* ============================================================
 * TELEGRAM API HELPERS
 * ============================================================
 */
async function sendMessage(env, chatId, text, replyMarkup = null) {
  const payload = {
    chat_id: chatId,
    text: text
  };

  if (replyMarkup) {
    payload.reply_markup = replyMarkup;
  }

  await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  return new Response("OK");
}

async function answerCallback(env, callbackId) {
  await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: callbackId })
  });
}
