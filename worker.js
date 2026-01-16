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
/* ============================================================
 * PHASE-7 : ADVANCED TEST ENGINE (NO REPEAT + SMART SUBJECT)
 * ============================================================
 */

let ACTIVE_TEST = null;

/* ---------- Helper: get non-repeated MCQs ---------- */
async function getFreshMCQs(subject, limit) {
  const today = new Date().toISOString().slice(0, 10);
  const usedRaw = await KV.get("used_mcqs") || "[]";
  const used = JSON.parse(usedRaw);

  let pool = MCQS.filter(q => {
    if (subject && q.subject.toLowerCase() !== subject.toLowerCase()) return false;
    const lastUsed = used[q.id];
    if (!lastUsed) return true;
    const diff = (new Date(today) - new Date(lastUsed)) / (1000*60*60*24);
    return diff > 30;
  });

  return pool.sort(() => Math.random() - 0.5).slice(0, limit);
}

/* ---------- Start Test ---------- */
async function startTest(type, subject = null) {
  const limit = type === "Weekly" ? 50 : 20;
  const questions = await getFreshMCQs(subject, limit);

  if (!questions.length) {
    sendMessage(ENV, GROUP_ID, `
🌺 Dear Student 🌺
⚠️ No fresh MCQs available.
Please revise or wait for new questions.
`);
    return;
  }

  ACTIVE_TEST = {
    type,
    subject,
    index: 0,
    correct: 0,
    wrong: 0,
    questions,
    timer: null,
    reminder: null
  };

  TEST_RUNNING = true;
  askQuestion();
}

/* ---------- Ask Question ---------- */
function askQuestion() {
  const t = ACTIVE_TEST;
  if (!t || t.index >= t.questions.length) {
    endTest();
    return;
  }

  const q = t.questions[t.index];

  sendMessage(ENV, GROUP_ID, `
🌺 Dear Student 🌺
📝 ${t.type} Test – Q${t.index + 1}

${q.question}

A️⃣ ${q.A}
B️⃣ ${q.B}
C️⃣ ${q.C}
D️⃣ ${q.D}

⏱️ Time: 5 minutes
`, {
    inline_keyboard: [
      [{ text: "A️⃣", callback_data: "A" }, { text: "B️⃣", callback_data: "B" }],
      [{ text: "C️⃣", callback_data: "C" }, { text: "D️⃣", callback_data: "D" }]
    ]
  });

  // 2 minute reminder
  t.reminder = setTimeout(() => {
    sendMessage(ENV, GROUP_ID, "⏳ Only 2 minutes left!");
  }, 3 * 60 * 1000);

  // Auto timeout
  t.timer = setTimeout(() => {
    t.wrong++;
    sendAnswer(q, null, true);
  }, 5 * 60 * 1000);
}

/* ---------- Handle Answer ---------- */
async function handleAnswer(ans) {
  const t = ACTIVE_TEST;
  if (!t) return;

  clearTimeout(t.timer);
  clearTimeout(t.reminder);

  const q = t.questions[t.index];
  const usedRaw = await KV.get("used_mcqs") || "{}";
  const used = JSON.parse(usedRaw);
  used[q.id] = new Date().toISOString().slice(0, 10);
  await KV.put("used_mcqs", JSON.stringify(used));

  if (ans === q.answer) t.correct++;
  else t.wrong++;

  sendAnswer(q, ans, false);
}

/* ---------- Send Answer ---------- */
function sendAnswer(q, ans, timeout) {
  let text = `
🌺 Dear Student 🌺
`;

  if (timeout) {
    text += `⏰ Time Up!\n`;
    text += `✔️ Correct: ${q.answer}\n`;
  } else if (ans === q.answer) {
    text += `✅ Correct Answer\n`;
  } else {
    text += `❌ Wrong Answer\n✔️ Correct: ${q.answer}\n`;
  }

  text += `
📚 Subject: ${q.subject}
💡 Explanation:
${q.explanation}
`;

  sendMessage(ENV, GROUP_ID, text);

  ACTIVE_TEST.index++;
  setTimeout(askQuestion, 2000);
}

/* ---------- End Test ---------- */
function endTest() {
  const t = ACTIVE_TEST;
  TEST_RUNNING = false;
  ACTIVE_TEST = null;

  sendMessage(ENV, GROUP_ID
              /*************************************************
 * ========== PHASE 8 START ==========
 * AUTOMATION • CRON • REMINDERS (IST)
 *************************************************/

// Cloudflare Worker scheduled event
export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(runAutomation(env));
  }
};

async function runAutomation(env) {
  const now = nowIST();
  const h = now.getHours();
  const m = now.getMinutes();
  const day = now.getDay(); // 0 = Sunday

  // 🚫 During active test → NO reminders
  if (await isTestRunning()) return;

  /* ========= DAILY MIDNIGHT RESET ========= */
  if (h === 0 && m === 0) {
    await resetDailyTargets();
    await sendBoth(
      "🌺 Dear Student 🌺\n\n🌅 New day started!\n🎯 Daily study target reset to 08:00 hours.\n💪 Let’s begin strong!"
    );
  }

  /* ========= DAILY TEST REMINDERS ========= */
  // 6:00 PM
  if (h === 18 && m === 0) {
    await sendBoth(
      "⏰ Daily Test Reminder\n\n📝 Today’s test at 11:00 PM\n📖 Revise weak subjects now!"
    );
  }

  // 9:30 PM
  if (h === 21 && m === 30) {
    await sendBoth(
      "⏳ Final Reminder\n\n📝 Daily Test at 11:00 PM\n⚠️ 1.5 hours left!"
    );
  }

  /* ========= GOOD NIGHT + DAILY STATS ========= */
  if (h === 23 && m === 59) {
    const stats = await getTodayStats();
    await sendBoth(
      `🌙 Good Night 🌙\n\n📊 Today’s Summary:\n📚 Study: ${stats.study}\n📝 Tests: ${stats.tests}\n\n💡 Tip: Consistency beats intensity.\n😴 Rest well!`
    );
  }

  /* ========= WEEKLY TEST REMINDERS ========= */
  // Friday & Saturday 9 PM
  if ((day === 5 || day === 6) && h === 21 && m === 0) {
    await sendBoth(
      "📢 Weekly Test Alert\n\n🧪 Weekly Test tomorrow at 5:00 PM\n📘 Revise all weak subjects!"
    );
  }

  /* ========= WEEKLY REPORT ========= */
  // Sunday 9 PM
  if (day === 0 && h === 21 && m === 0) {
    const report = await getWeeklyReport();
    await sendBoth(
      `📈 Weekly Performance Report\n\n${report}\n\n🔥 Focus more on weak areas next week!`
    );
  }
}

/* ========= HELPERS ========= */

async function sendBoth(text) {
  await sendMessage(GROUP_ID, text);
  await sendMessage(ADMIN_ID, text);
}

async function resetDailyTargets() {
  // reset reading session / daily counters
  await DB.resetDaily(); // already defined in earlier phase
}

async function getTodayStats() {
  return {
    study: await DB.getTodayStudyTime(), // hh:mm
    tests: await DB.getTodayTestCount()
  };
}

/*************************************************
 * ========== PHASE 8 END ==========
 *************************************************/
  /*************************************************
 * ========== PHASE 9 START ==========
 * REPORTS • ANALYTICS • WEAK SUBJECT ENGINE
 *************************************************/

/* ========= DAILY REPORT ========= */
onCommand("report", async (ctx) => {
  const today = getTodayKey();
  const studyMin = await DB.getStudyMinutes(today);
  const tests = await DB.getTestsByDate(today);

  let text = "📊 Daily Report\n\n";
  text += `📅 Date: ${today}\n`;
  text += `📖 Study Time: ${formatHM(studyMin)}\n\n`;

  if (!tests.length) {
    text += "📝 Tests: Not attempted\n";
  } else {
    let totalQ = 0, totalC = 0;
    const subjectMap = {};

    tests.forEach(t => {
      totalQ += t.total;
      totalC += t.correct;
      subjectMap[t.subject] = subjectMap[t.subject] || { c:0, t:0 };
      subjectMap[t.subject].c += t.correct;
      subjectMap[t.subject].t += t.total;
    });

    text += `📝 Tests: ${totalC}/${totalQ}\n\n📚 Subject Accuracy:\n`;
    for (const s in subjectMap) {
      const acc = Math.round(subjectMap[s].c / subjectMap[s].t * 100);
      text += `• ${s}: ${acc}%\n`;
    }
  }

  text += "\n💡 Advice:\nFocus more on weak subjects tomorrow.";

  await ctx.reply(text);
});

/* ========= WEEKLY REPORT ========= */
onCommand("wr", async (ctx) => {
  const data = await DB.getLast7DaysTests();
  if (!data.length) {
    return ctx.reply("📈 Weekly Report\n\nNo test data available.");
  }

  const map = {};
  data.forEach(t => {
    map[t.subject] = map[t.subject] || { c:0, t:0 };
    map[t.subject].c += t.correct;
    map[t.subject].t += t.total;
  });

  let text = "📈 Weekly Report\n\n📚 Subject Performance:\n";
  for (const s in map) {
    const acc = Math.round(map[s].c / map[s].t * 100);
    text += `• ${s}: ${acc}%\n`;
  }

  text += "\n🔥 Work on subjects below 60% accuracy.";

  await ctx.reply(text);
});

/* ========= MONTHLY REPORT ========= */
onCommand("mr", async (ctx) => {
  const data = await DB.getThisMonthTests();
  if (!data.length) {
    return ctx.reply("📊 Monthly Report\n\nNo data available.");
  }

  let totalQ = 0, totalC = 0;
  data.forEach(t => {
    totalQ += t.total;
    totalC += t.correct;
  });

  const acc = Math.round(totalC / totalQ * 100);

  await ctx.reply(
    `📊 Monthly Report\n\n` +
    `📝 Questions: ${totalQ}\n` +
    `✅ Correct: ${totalC}\n` +
    `🎯 Accuracy: ${acc}%\n\n` +
    `💡 Advice:\nRevise weak subjects weekly.`
  );
});

/* ========= WEAK SUBJECT DETECTION ========= */
async function getWeakSubjects() {
  const data = await DB.getLast30DaysTests();
  const map = {};

  data.forEach(t => {
    map[t.subject] = map[t.subject] || { c:0, t:0 };
    map[t.subject].c += t.correct;
    map[t.subject].t += t.total;
  });

  const weak = [];
  for (const s in map) {
    const acc = Math.round(map[s].c / map[s].t * 100);
    if (acc < 60) weak.push(s);
  }
  return weak;
}

/* ========= AUTO WEAK SUBJECT MESSAGE ========= */
async function sendWeakSubjectReminder() {
  const weak = await getWeakSubjects();
  if (!weak.length) return;

  const text =
    "⚠️ Weak Subjects Alert\n\n" +
    weak.map(s => `• ${s}`).join("\n") +
    "\n\n📘 Revise these today.";

  await sendMessage(GROUP_ID, text);
}

/*************************************************
 * ========== PHASE 9 END ==========
 *************************************************/
  /*************************************************
 * ========== PHASE 10 START ==========
 * MCQ BULK ADD • SUBJECT MASTER • DENTAL PULSE 18
 *************************************************/

/* ========= SUBJECT MASTER ========= */
const SUBJECTS = [
  "Oral Anatomy","Oral Physiology","Oral Histology",
  "Dental Materials","Oral Pathology","Oral Microbiology",
  "Oral Medicine","Oral Radiology","Periodontology",
  "Prosthodontics","Conservative Dentistry","Endodontics",
  "Orthodontics","Oral Surgery","Public Health Dentistry"
];

/* ========= ADMIN BULK MCQ ADD ========= */
onCommand("addmcq", async (ctx) => {
  if (ctx.userId !== ADMIN_ID) {
    return ctx.reply("❌ Admin only command");
  }

  ctx.session.waitingForMCQ = true;
  await ctx.reply(
    "🛠 MCQ Bulk Add Mode\n\n" +
    "Format:\n" +
    "SUBJECT: Oral Pathology\n\n" +
    "Q1. Question?\nA) ...\nB) ...\nC) ...\nD) ...\nAns: B\nExp: Explanation"
  );
});

/* ========= HANDLE MCQ TEXT ========= */
onMessage(async (ctx) => {
  if (!ctx.session.waitingForMCQ) return;

  ctx.session.waitingForMCQ = false;
  const text = ctx.text;

  const subjectMatch = text.match(/SUBJECT:\s*(.+)/i);
  if (!subjectMatch) {
    return ctx.reply("❌ Subject missing");
  }

  const subject = subjectMatch[1].trim();
  if (!SUBJECTS.includes(subject)) {
    return ctx.reply("❌ Invalid subject name");
  }

  const blocks = text.split(/\n(?=Q[\.\s]*\d+)/i);
  let added = 0;

  for (const block of blocks) {
    const q = block.match(/Q[\.\s]*\d+\.\s*(.+)/i)?.[1];
    const A = block.match(/A\)\s*(.+)/i)?.[1];
    const B = block.match(/B\)\s*(.+)/i)?.[1];
    const C = block.match(/C\)\s*(.+)/i)?.[1];
    const D = block.match(/D\)\s*(.+)/i)?.[1];
    const ans = block.match(/Ans:\s*([ABCD])/i)?.[1];
    const exp = block.match(/Exp:\s*(.+)/i)?.[1] || "";

    if (!q || !A || !B || !C || !D || !ans) continue;

    await DB.addMCQ({
      subject,
      q, A, B, C, D,
      ans, exp
    });
    added++;
  }

  await ctx.reply(
    `✅ MCQ Added Successfully\n\n` +
    `📚 Subject: ${subject}\n` +
    `➕ Added: ${added}`
  );
});

/* ========= MCQ COUNT ========= */
onCommand("mcqcount", async (ctx) => {
  if (ctx.userId !== ADMIN_ID) return;

  let text = "📊 MCQ Database Status\n\n";
  for (const s of SUBJECTS) {
    const c = await DB.countMCQBySubject(s);
    text += `• ${s}: ${c}\n`;
  }
  await ctx.reply(text);
});

/* ========= STUDENT SUBJECT REVISION ========= */
onMessage(async (ctx) => {
  if (!SUBJECTS.includes(ctx.text)) return;

  const mcqs = await DB.getRandomMCQBySubject(ctx.text, 10);
  if (!mcqs.length) {
    return ctx.reply("⚠️ No MCQs available for this subject");
  }

  let out = `📘 Revision – ${ctx.text}\n\n`;
  mcqs.forEach((m, i) => {
    out += `${i+1}. ${m.q}\n` +
           `✔️ ${m.ans}\n\n`;
  });

  await ctx.reply(out);
});

/*************************************************
 * ========== PHASE 10 END ==========
 *************************************************/
