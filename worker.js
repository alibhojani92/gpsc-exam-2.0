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
/* ============================================================
 * PHASE-2 : READING SYSTEM + TIME TRACKING
 * ============================================================
 * Features:
 * - /read & /stop commands
 * - Inline button start/stop
 * - Daily target: 8 hours
 * - Time count in HH:MM
 * - Safe double-click handling
 * ============================================================
 */

/* ------------------------------
   In-memory store (Phase-2 only)
   Later will move to KV/D1
--------------------------------*/
const readingSession = {};
const readingLog = {};

/* ------------------------------
   Extend message handler
--------------------------------*/
const _oldHandleMessage = handleMessage;
handleMessage = async function (message, env) {
  const chatId = message.chat.id;
  const userId = message.from.id;
  const text = (message.text || "").trim().toLowerCase();

  // -------- START READING --------
  if (text === "/read") {
    if (readingSession[userId]) {
      return sendMessage(
        env,
        chatId,
        `🌺 Dear Student 🌺\n\n⚠️ Reading already running.`
      );
    }

    readingSession[userId] = Date.now();

    return sendMessage(
      env,
      chatId,
      `🌺 Dear Student 🌺\n\n📖 Reading started\n🎯 Daily Target: 08:00 hrs`,
      {
        inline_keyboard: [
          [{ text: "🛑 Stop Reading", callback_data: "stop_read" }]
        ]
      }
    );
  }

  // -------- STOP READING --------
  if (text === "/stop") {
    if (!readingSession[userId]) {
      return sendMessage(
        env,
        chatId,
        `🌺 Dear Student 🌺\n\n⚠️ Reading not started yet.`
      );
    }

    const start = readingSession[userId];
    const minutes = Math.floor((Date.now() - start) / 60000);
    delete readingSession[userId];

    const today = new Date().toISOString().slice(0, 10);
    readingLog[today] = (readingLog[today] || 0) + minutes;

    const studied = formatTime(readingLog[today]);
    const remaining = formatTime(Math.max(480 - readingLog[today], 0));

    return sendMessage(
      env,
      chatId,
      `🌺 Dear Student 🌺\n\n⏱️ Reading stopped\n\n📘 Studied Today: ${studied}\n🎯 Remaining Target: ${remaining}`
    );
  }

  // fallback to PHASE-1 handler
  return _oldHandleMessage(message, env);
};

/* ------------------------------
   Extend callback handler
--------------------------------*/
const _oldHandleCallback = handleCallback;
handleCallback = async function (callback, env) {
  const chatId = callback.message.chat.id;
  const userId = callback.from.id;
  const data = callback.data;

  await answerCallback(env, callback.id);

  if (data === "read") {
    return handleMessage(
      { chat: { id: chatId }, from: { id: userId }, text: "/read" },
      env
    );
  }

  if (data === "stop_read") {
    return handleMessage(
      { chat: { id: chatId }, from: { id: userId }, text: "/stop" },
      env
    );
  }

  return _oldHandleCallback(callback, env);
};

/* ------------------------------
   Time formatter helper
--------------------------------*/
function formatTime(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/* ================== END PHASE-2 ================== */
/* ============================================================
 * PHASE-3 : MCQ TEST ENGINE (SAFE MODE)
 * ============================================================
 * Commands:
 * /dt  -> Daily Test
 * /wt  -> Weekly Test
 * Inline MCQ (A B C D)
 * Timer: 5 min + 2 min reminder
 * ============================================================
 */

/* ------------------------------
   Temporary MCQ store (safe)
--------------------------------*/
const MCQ_DB = []; // empty safe mode

let ACTIVE_TEST = null;

/* ------------------------------
   Extend message handler
--------------------------------*/
const _phase3HandleMessage = handleMessage;
handleMessage = async function (message, env) {
  const chatId = message.chat.id;
  const userId = message.from.id;
  const text = (message.text || "").trim().toLowerCase();

  // -------- DAILY TEST --------
  if (text === "/dt" || text === "/wt") {
    if (ACTIVE_TEST) {
      return sendMessage(
        env,
        chatId,
        `🌺 Dear Student 🌺\n\n⚠️ Test already running.`
      );
    }

    if (MCQ_DB.length === 0) {
      return sendMessage(
        env,
        chatId,
        `🌺 Dear Student 🌺\n\n⚠️ MCQ database empty.\nPlease wait for admin to add questions.`
      );
    }

    startTest(env, chatId, text === "/dt" ? "Daily" : "Weekly");
    return;
  }

  return _phase3HandleMessage(message, env);
};

/* ------------------------------
   Start Test
--------------------------------*/
function startTest(env, chatId, type) {
  const shuffled = [...MCQ_DB].sort(() => Math.random() - 0.5);
  const total = type === "Daily" ? 5 : 10;

  ACTIVE_TEST = {
    chatId,
    type,
    index: 0,
    score: 0,
    questions: shuffled.slice(0, total)
  };

  askQuestion(env);
}

/* ------------------------------
   Ask Question
--------------------------------*/
function askQuestion(env) {
  if (!ACTIVE_TEST) return;

  if (ACTIVE_TEST.index >= ACTIVE_TEST.questions.length) {
    sendMessage(
      env,
      ACTIVE_TEST.chatId,
      `🌺 Dear Student 🌺\n\n📊 ${ACTIVE_TEST.type} Test Finished\n\n✅ Score: ${ACTIVE_TEST.score}/${ACTIVE_TEST.questions.length}`
    );
    ACTIVE_TEST = null;
    return;
  }

  const q = ACTIVE_TEST.questions[ACTIVE_TEST.index];

  sendMessage(
    env,
    ACTIVE_TEST.chatId,
    `🌺 Dear Student 🌺\n\n📝 Q${ACTIVE_TEST.index + 1}\n${q.q}`,
    {
      inline_keyboard: [
        [{ text: "A", callback_data: "A" }, { text: "B", callback_data: "B" }],
        [{ text: "C", callback_data: "C" }, { text: "D", callback_data: "D" }]
      ]
    }
  );

  // 2 min reminder
  setTimeout(() => {
    if (ACTIVE_TEST)
      sendMessage(env, ACTIVE_TEST.chatId, "⏳ 2 minutes remaining...");
  }, 180000);

  // auto timeout
  setTimeout(() => {
    if (ACTIVE_TEST) {
      revealAnswer(env, null);
    }
  }, 300000);
}

/* ------------------------------
   Handle MCQ answer
--------------------------------*/
const _phase3Callback = handleCallback;
handleCallback = async function (cb, env) {
  if (!ACTIVE_TEST) return _phase3Callback(cb, env);

  const ans = cb.data;
  revealAnswer(env, ans);
  await answerCallback(env, cb.id);
};

/* ------------------------------
   Reveal Answer
--------------------------------*/
function revealAnswer(env, userAns) {
  const q = ACTIVE_TEST.questions[ACTIVE_TEST.index];

  let text = `🌺 Dear Student 🌺\n\n`;

  if (userAns && userAns === q.ans) {
    ACTIVE_TEST.score++;
    text += "✅ Correct Answer\n";
  } else {
    text += `❌ Wrong Answer\n✔️ Correct: ${q.ans}\n`;
  }

  text += `\n💡 Explanation:\n${q.exp || "—"}`;

  sendMessage(env, ACTIVE_TEST.chatId, text);

  ACTIVE_TEST.index++;
  setTimeout(() => askQuestion(env), 2000);
}

/* ================== END PHASE-3 ================== */
/* ============================================================
 * PHASE-4 : ADMIN MCQ BULK ADD + SUBJECT SYSTEM
 * ============================================================
 */

let MCQ_ADD_MODE = false;

/* ------------------------------
   Extend message handler again
--------------------------------*/
const _phase4HandleMessage = handleMessage;
handleMessage = async function (message, env) {
  const chatId = message.chat.id;
  const userId = message.from.id;
  const text = message.text || "";

  // ---------- ADMIN START ADD MCQ ----------
  if (text.trim().toLowerCase() === "/addmcq") {
    if (userId !== ADMIN_ID) return; // silent for students

    MCQ_ADD_MODE = true;
    return sendMessage(
      env,
      chatId,
      `🌺 Dear Admin 🌺\n\n🧠 Send MCQs in bulk format now.\nUse SUBJECT line.\n\n⛔ Send anything else to cancel.`
    );
  }

  // ---------- ADMIN MCQ INPUT ----------
  if (MCQ_ADD_MODE && userId === ADMIN_ID) {
    MCQ_ADD_MODE = false;
    parseAndStoreMCQs(env, chatId, text);
    return;
  }

  return _phase4HandleMessage(message, env);
};

/* ------------------------------
   Parse MCQs
--------------------------------*/
function parseAndStoreMCQs(env, chatId, text) {
  let subject = "General";
  const subjectMatch = text.match(/subject\s*:\s*(.+)/i);
  if (subjectMatch) subject = subjectMatch[1].trim();

  const blocks = text
    .replace(/subject\s*:.*\n?/i, "")
    .split(/\n(?=q[\.\d])/i);

  let added = 0;

  blocks.forEach(block => {
    const q = block.match(/q[\.\d]*\s*(.*)/i)?.[1];
    const A = block.match(/A\)\s*(.*)/i)?.[1];
    const B = block.match(/B\)\s*(.*)/i)?.[1];
    const C = block.match(/C\)\s*(.*)/i)?.[1];
    const D = block.match(/D\)\s*(.*)/i)?.[1];
    const ans = block.match(/ans\s*[:\(]?\s*([ABCD])/i)?.[1];
    const exp = block.match(/exp\s*:\s*(.*)/i)?.[1] || "";

    if (q && A && B && C && D && ans) {
      MCQ_DB.push({
        q,
        A,
        B,
        C,
        D,
        ans,
        exp,
        subject
      });
      added++;
    }
  });

  sendMessage(
    env,
    chatId,
    `🌺 Dear Admin 🌺\n\n✅ MCQs Added: ${added}\n📚 Subject: ${subject}`
  );
}

/* ================== END PHASE-4 ================== */
/* ============================================================
 * PHASE-5 : REPORTS + ANALYTICS
 * ============================================================
 */

// store test history
const TEST_HISTORY = []; 
// format: { userId, date, score, total, subjectStats }

/* ------------------------------
   Hook into test end (extend)
--------------------------------*/
function saveTestResult(userId, score, total, subjectStats) {
  TEST_HISTORY.push({
    userId,
    date: todayKey(),
    score,
    total,
    subjectStats
  });
}

/* ------------------------------
   REPORT COMMANDS
--------------------------------*/
const _phase5HandleMessage = handleMessage;
handleMessage = async function (message, env) {
  const chatId = message.chat.id;
  const userId = message.from.id;
  const text = message.text || "";

  if (text === "/report" || text === "/daily") {
    return sendDailyReport(env, chatId, userId);
  }

  if (text === "/weekly") {
    return sendWeeklyReport(env, chatId, userId);
  }

  if (text === "/monthly") {
    return sendMonthlyReport(env, chatId, userId);
  }

  if (text === "/adminreport" && userId === ADMIN_ID) {
    return sendAdminReport(env, chatId);
  }

  return _phase5HandleMessage(message, env);
};

/* ------------------------------
   DAILY REPORT
--------------------------------*/
function sendDailyReport(env, chatId, userId) {
  const today = todayKey();
  const minutes = STUDY_LOG[userId]?.[today] || 0;
  const tests = TEST_HISTORY.filter(
    t => t.userId === userId && t.date === today
  );

  let msg = `🌺 Dear Student 🌺\n\n📅 Date: ${today}\n\n`;
  msg += `📘 Reading:\n• Studied: ${formatTime(minutes)}\n• Target: 08:00 hrs\n• Remaining: ${formatTime(Math.max(480 - minutes, 0))}\n\n`;

  if (tests.length === 0) {
    msg += "📝 Test:\n• Not attempted\n";
  } else {
    const t = tests[tests.length - 1];
    msg += `📝 Test:\n• Score: ${t.score}/${t.total}\n• Accuracy: ${Math.round(
      (t.score / t.total) * 100
    )}%\n\n`;

    const weak = Object.entries(t.subjectStats || {})
      .filter(([_, v]) => v.correct < v.total)
      .map(([k]) => k);

    if (weak.length)
      msg += `⚠️ Weak Subjects:\n• ${weak.join("\n• ")}`;
  }

  return sendMessage(env, chatId, msg);
}

/* ------------------------------
   WEEKLY REPORT
--------------------------------*/
function sendWeeklyReport(env, chatId, userId) {
  let totalMin = 0;
  let testCount = 0;

  Object.entries(STUDY_LOG[userId] || {}).slice(-7).forEach(([_, m]) => {
    totalMin += m;
  });

  TEST_HISTORY.forEach(t => {
    if (t.userId === userId) testCount++;
  });

  return sendMessage(
    env,
    chatId,
    `🌺 Dear Student 🌺\n\n📊 Weekly Report\n\n📘 Study Time: ${formatTime(
      totalMin
    )}\n📝 Tests Taken: ${testCount}\n\n💡 Keep consistency 💪`
  );
}

/* ------------------------------
   MONTHLY REPORT
--------------------------------*/
function sendMonthlyReport(env, chatId, userId) {
  let totalMin = 0;
  Object.values(STUDY_LOG[userId] || {}).forEach(m => (totalMin += m));

  return sendMessage(
    env,
    chatId,
    `🌺 Dear Student 🌺\n\n📊 Monthly Report\n\n📘 Total Study: ${formatTime(
      totalMin
    )}\n\n🔥 You're preparing like a pro`
  );
}

/* ------------------------------
   ADMIN REPORT
--------------------------------*/
function sendAdminReport(env, chatId) {
  return sendMessage(
    env,
    chatId,
    `🌺 Admin Panel 🌺\n\n📚 Total MCQs: ${MCQ_DB.length}\n📝 Total Tests: ${TEST_HISTORY.length}`
  );
}

/* ================== END PHASE-5 ================== */
/* ============================================================
 * PHASE-6 : AUTOMATION + TIMERS (IST)
 * ============================================================
 */

function nowIST() {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
  );
}

let TEST_RUNNING = false;

/* ------------------------------
   AUTOMATION TICK (Every 1 min)
--------------------------------*/
setInterval(() => {
  if (TEST_RUNNING) return;

  const now = nowIST();
  const h = now.getHours();
  const m = now.getMinutes();

  // Morning message
  if (h === 6 && m === 1) {
    broadcast(`
🌺 Dear Student 🌺
🌅 Good Morning

🎯 Today Target: 08:00 hrs
📘 Start early, stay ahead 💪
`);
  }

  // Daily test reminders
  if (h === 18 && m === 0) {
    broadcast(`
⏰ Reminder
📝 Daily Test tonight at 11:00 PM
⏳ 5 hours left
`);
  }

  if (h === 21 && m === 30) {
    broadcast(`
⏰ Reminder
📝 Daily Test at 11:00 PM
⌛ Only 1.5 hours left
`);
  }

  // Weekly reminders
  if (now.getDay() === 5 && h === 21 && m === 0) {
    broadcast(`
📢 Weekly Test Alert
📝 Tomorrow (Saturday) at 5:00 PM
Prepare well 💪
`);
  }

  if (now.getDay() === 6 && h === 21 && m === 0) {
    broadcast(`
📢 Weekly Test Reminder
📝 Tomorrow (Sunday) at 5:00 PM
Last revision today 📚
`);
  }

  // Sunday weekly report
  if (now.getDay() === 0 && h === 21 && m === 0) {
    broadcast(`
📊 Weekly Performance Summary
📘 Study consistently
📝 Focus on weak subjects
`);
  }

  // Night summary
  if (h === 23 && m === 59) {
    broadcast(`
🌺 Dear Student 🌺
🌙 Good Night

💡 Tip:
Small daily effort creates big success 😴
`);
  }
}, 60000);

/* ------------------------------
   Broadcast Helper
--------------------------------*/
function broadcast(text) {
  sendMessage(ENV, GROUP_ID, text);
  // private users handled internally
}

/* ================== END PHASE-6 ================== */
