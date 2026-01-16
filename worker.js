/**********************************************************
 * PHASE 1 START
 * Feature: Reading Mode (Start / Stop)
 * Locked – No future edits
 **********************************************************/

export default {
  async fetch(request, env) {
    try {
      if (request.method !== "POST") {
        return new Response("OK");
      }

      const update = await request.json();
      if (!update.message) {
        return new Response("OK");
      }

      const message = update.message;
      const chatId = message.chat.id;
      const text = (message.text || "").trim();

      // Prevent empty / service messages
      if (!text) return new Response("OK");

      // ---------- HELPERS ----------
      const sendMessage = async (text, keyboard = null) => {
        const payload = {
          chat_id: chatId,
          text,
          parse_mode: "HTML",
        };

        if (keyboard) {
          payload.reply_markup = keyboard;
        }

        await fetch(
          `https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }
        );
      };

      const mainKeyboard = {
        keyboard: [
          [{ text: "📖 Start Reading" }],
          [{ text: "⏹ Stop Reading" }],
          [{ text: "📝 Daily Test" }],
          [{ text: "📊 My Report" }],
        ],
        resize_keyboard: true,
      };

      // ---------- /START ----------
      if (text === "/start") {
        await sendMessage(
          `🌺❤️ My Love Dr Arzoo Fatema ❤️🌺\n\n📚 Welcome to GPSC Exam 2.0\n\nChoose an option 👇`,
          mainKeyboard
        );
        return new Response("OK");
      }

      // ---------- START READING ----------
      if (text === "📖 Start Reading") {
        const now = Date.now();

        // Save reading session in KV
        await env.KV.put(
          `reading:${chatId}`,
          JSON.stringify({
            startTime: now,
          })
        );

        await sendMessage(
          `🌺 Dr Arzoo Fatema 🌺\n📖 Reading Started\n\n🎯 Target: 08:00\nStay focused 💪`
        );
        return new Response("OK");
      }

      // ---------- STOP READING ----------
      if (text === "⏹ Stop Reading") {
        const data = await env.KV.get(`reading:${chatId}`);
        if (!data) {
          await sendMessage(
            `🌺 Dr Arzoo Fatema 🌺\n\n⚠️ Reading session not found`
          );
          return new Response("OK");
        }

        const session = JSON.parse(data);
        const durationMs = Date.now() - session.startTime;
        const minutes = Math.floor(durationMs / 60000);
        const seconds = Math.floor((durationMs % 60000) / 1000);

        await env.KV.delete(`reading:${chatId}`);

        await sendMessage(
          `🌺 Dr Arzoo Fatema 🌺\n⏹ Reading Stopped\n\n⏱ Time Studied: ${minutes}m ${seconds}s\nGreat effort 👏`
        );
        return new Response("OK");
      }

      return new Response("OK");
    } catch (err) {
      return new Response("OK");
    }
  },
};

/**********************************************************
 * PHASE 1 END
 **********************************************************/
/************************************************************
 * =================== PHASE-2 START ======================
 * TEST ENGINE (DT / WT)
 * NO Phase-1 code here
 ************************************************************/

/* ========= CONSTANTS ========= */
const TEST_TIME_MS = 5 * 60 * 1000;          // 5 minutes
const LAST_WARNING_MS = 2 * 60 * 1000;       // 2 minutes left

/* ========= RUNTIME STATE (in-memory) ========= */
let ACTIVE_TESTS = {}; 
// chatId -> { questions, index, correct, wrong, timer, warned }

/* ========= UTIL ========= */
function isTestRunning(chatId) {
  return ACTIVE_TESTS[chatId] !== undefined;
}

/* ========= FETCH MCQS ========= */
async function fetchMCQs(env, limit, subject = null) {
  let sql = `SELECT * FROM mcqs`;
  let params = [];

  if (subject) {
    sql += ` WHERE LOWER(subject)=?`;
    params.push(subject.toLowerCase());
  }

  sql += ` ORDER BY RANDOM() LIMIT ?`;
  params.push(limit);

  const res = await env.DB.prepare(sql).bind(...params).all();
  return res.results || [];
}

/* ========= START TEST ========= */
async function startTest(chatId, env, type, subject = null) {
  if (isTestRunning(chatId)) {
    return sendMessage(chatId,
      `⚠️ Test already running.\nFinish it before starting a new one.`
    );
  }

  const limit = type === "DT" ? 20 : 50;
  const mcqs = await fetchMCQs(env, limit, subject);

  if (!mcqs.length) {
    return sendMessage(chatId,
      `❌ No MCQs available${subject ? ` for "${subject}"` : ""}.\nAsk admin to add questions.`
    );
  }

  ACTIVE_TESTS[chatId] = {
    type,
    questions: mcqs,
    index: 0,
    correct: 0,
    wrong: 0,
    warned: false,
    timer: null
  };

  await sendMessage(
    chatId,
    `📝 ${type === "DT" ? "Daily" : "Weekly"} Test Started\n` +
    `📚 Questions: ${mcqs.length}\n` +
    `⏱️ Time per question: 5 minutes`
  );

  await askNextQuestion(chatId, env);
}

/* ========= ASK QUESTION ========= */
async function askNextQuestion(chatId, env) {
  const test = ACTIVE_TESTS[chatId];
  if (!test) return;

  if (test.index >= test.questions.length) {
    return finishTest(chatId);
  }

  const q = test.questions[test.index];

  test.warned = false;

  const text =
    `❓ *Question ${test.index + 1}*\n\n` +
    `${q.question}\n\n` +
    `A) ${q.a}\n` +
    `B) ${q.b}\n` +
    `C) ${q.c}\n` +
    `D) ${q.d}`;

  await sendMessage(chatId, text, {
    inline_keyboard: [
      [{ text: "A", callback_data: "A" }, { text: "B", callback_data: "B" }],
      [{ text: "C", callback_data: "C" }, { text: "D", callback_data: "D" }]
    ]
  });

  test.timer = setTimeout(async () => {
    if (!test.warned) {
      test.warned = true;
      await sendMessage(chatId, `⏳ *2 minutes left!*`);
    }
  }, TEST_TIME_MS - LAST_WARNING_MS);

  test.timeout = setTimeout(async () => {
    test.wrong++;
    await sendMessage(
      chatId,
      `⏰ Time up!\n` +
      `✅ Correct: ${q.answer}\n` +
      `📖 ${q.explanation}`
    );
    test.index++;
    await askNextQuestion(chatId, env);
  }, TEST_TIME_MS);
}

/* ========= HANDLE ANSWER ========= */
async function handleAnswer(chatId, env, choice) {
  const test = ACTIVE_TESTS[chatId];
  if (!test) return;

  clearTimeout(test.timer);
  clearTimeout(test.timeout);

  const q = test.questions[test.index];

  if (choice === q.answer) {
    test.correct++;
    await sendMessage(chatId, `✅ Correct!\n📖 ${q.explanation}`);
  } else {
    test.wrong++;
    await sendMessage(
      chatId,
      `❌ Wrong\n` +
      `✅ Correct: ${q.answer}\n` +
      `📖 ${q.explanation}`
    );
  }

  test.index++;
  await askNextQuestion(chatId, env);
}

/* ========= FINISH TEST ========= */
async function finishTest(chatId) {
  const test = ACTIVE_TESTS[chatId];
  if (!test) return;

  const total = test.questions.length;
  const score = test.correct;

  delete ACTIVE_TESTS[chatId];

  await sendMessage(
    chatId,
    `📊 *Test Completed*\n\n` +
    `✅ Correct: ${score}\n` +
    `❌ Wrong: ${total - score}\n` +
    `🎯 Accuracy: ${Math.round((score / total) * 100)}%`
  );
}

/* ========= COMMAND ROUTER ========= */
async function phase2Router(update, env) {
  const msg = update.message || update.callback_query?.message;
  if (!msg) return;

  const chatId = msg.chat.id;

  /* ---- Callback (Answer click) ---- */
  if (update.callback_query) {
    const choice = update.callback_query.data;
    return handleAnswer(chatId, env, choice);
  }

  const text = msg.text?.trim();
  if (!text) return;

  /* ---- Daily Test ---- */
  if (text.startsWith("/dt")) {
    const subject = text.split(" ").slice(1).join(" ") || null;
    return startTest(chatId, env, "DT", subject);
  }

  /* ---- Weekly Test ---- */
  if (text.startsWith("/wt")) {
    const subject = text.split(" ").slice(1).join(" ") || null;
    return startTest(chatId, env, "WT", subject);
  }
}

/************************************************************
 * ==================== PHASE-2 END =======================
 ************************************************************/
