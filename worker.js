/**********************************************************************
 * GPSC DENTAL EXAM BOT 2.0
 * PHASE 1 – CORE FOUNDATION (LOCKED)
 * - Webhook routing
 * - Command + Inline handling
 * - Reading start/stop (STATE ONLY)
 * - Safe mode
 **********************************************************************/

export default {
  async fetch(request, env, ctx) {

    /* ---------------- BASIC CHECK ---------------- */
    if (request.method !== "POST") {
      return new Response("Bot is running ✅", { status: 200 });
    }

    const update = await request.json();
    if (!update.message && !update.callback_query) {
      return new Response("No message", { status: 200 });
    }

    /* ---------------- MESSAGE NORMALIZATION ---------------- */
    const message = update.message || update.callback_query.message;
    const chatId = message.chat.id;
    const userId = message.from.id;
    const text =
      update.message?.text ||
      update.callback_query?.data ||
      "";

    const BOT_TOKEN = env.BOT_TOKEN;

    /* ---------------- TELEGRAM SEND ---------------- */
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

    /* ======================================================
       PHASE-1 READING HANDLER (FIXED POSITION)
    ====================================================== */
    if (await handleReading(text, userId, env, sendMessage)) {
      return new Response("OK");
    }

    /* ---------------- /START ---------------- */
    if (text === "/start") {
      await sendMessage(
`🌺 <b>Dear Student</b> 🌺

📚 Welcome to <b>GPSC Exam 2.0</b>

🎯 Daily Target: <b>08:00 hours</b>
👇 Use buttons below`,
        mainKeyboard()
      );
      return new Response("OK");
    }

    /* ---------------- HELP ---------------- */
    if (text === "Help" || text === "/help") {
      await sendMessage(
`🌺 <b>Dear Student</b> 🌺

📌 <b>Available Commands</b>

▶ Start Reading
⏹ Stop Reading
📊 Today Status
❓ Help

⚠ MCQ safe mode active
(No questions added yet)`
      );
      return new Response("OK");
    }

    /* ---------------- FALLBACK (NO SPAM) ---------------- */
    return new Response("OK");
  },
};

/* ======================================================
   READING HANDLER (PHASE-1)
   - STATE ONLY
   - NO TIME CALCULATION YET
====================================================== */
async function handleReading(text, userId, env, sendMessage) {
  const key = `reading:${userId}`;

  /* ---------- START READING ---------- */
  if (text === "Start Reading" || text === "/startreading") {
    const existing = await env.KV.get(key);
    if (existing) {
      await sendMessage("⚠ Reading already started.");
      return true;
    }

    await env.KV.put(
      key,
      JSON.stringify({ startedAt: Date.now() })
    );

    await sendMessage(
`📖 <b>Reading started</b>

🎯 Target: <b>08:00</b>
💪 Stay focused`
    );
    return true;
  }

  /* ---------- STOP READING ---------- */
  if (text === "Stop Reading" || text === "/stopreading") {
    const existing = await env.KV.get(key);
    if (!existing) {
      await sendMessage("⚠ Reading not active.");
      return true;
    }

    await env.KV.delete(key);

    await sendMessage(
`⏹ <b>Reading stopped</b>

😌 Take rest`
    );
    return true;
  }

  return false;
}

/* ======================================================
   MAIN KEYBOARD
====================================================== */
function mainKeyboard() {
  return {
    keyboard: [
      [{ text: "Start Reading" }, { text: "Stop Reading" }],
      [{ text: "Today Status" }, { text: "Help" }],
    ],
    resize_keyboard: true,
    one_time_keyboard: false,
  };
}

/* ================== END PHASE-1 ================== */
