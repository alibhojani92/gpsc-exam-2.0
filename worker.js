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
/**********************************************************
 * PHASE 2 START
 * Feature: Daily Test Engine + Admin Detection
 **********************************************************/

const ADMIN_ID = 7539477188;

// ---- D1 HELPERS ----
async function getRandomMCQs(env, limit = 20) {
  const { results } = await env.DB.prepare(
    "SELECT * FROM mcqs ORDER BY RANDOM() LIMIT ?"
  ).bind(limit).all();
  return results;
}

// ---- TEST SESSION (KV) ----
async function startTest(env, chatId, questions) {
  await env.KV.put(
    `test:${chatId}`,
    JSON.stringify({
      index: 0,
      correct: 0,
      wrong: 0,
      questions,
    })
  );
}

async function getTest(env, chatId) {
  const data = await env.KV.get(`test:${chatId}`);
  return data ? JSON.parse(data) : null;
}

async function saveTest(env, chatId, test) {
  await env.KV.put(`test:${chatId}`, JSON.stringify(test));
}

async function endTest(env, chatId) {
  await env.KV.delete(`test:${chatId}`);
}

// ---- SEND QUESTION ----
async function sendQuestion(env, chatId, test) {
  const q = test.questions[test.index];

  const keyboard = {
    inline_keyboard: [
      [{ text: "A", callback_data: "A" }, { text: "B", callback_data: "B" }],
      [{ text: "C", callback_data: "C" }, { text: "D", callback_data: "D" }],
    ],
  };

  await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text:
`🌺 Dr Arzoo Fatema 🌺
📝 Q${test.index + 1} / ${test.questions.length}

${q.question}

A) ${q.opt_a}
B) ${q.opt_b}
C) ${q.opt_c}
D) ${q.opt_d}`,
      reply_markup: keyboard,
    }),
  });
}

/**********************************************************
 * PHASE 2 HANDLER EXTENSION
 **********************************************************/

addEventListener("fetch", event => {
  event.respondWith(handlePhase2(event.request, event.env));
});

async function handlePhase2(request, env) {
  if (request.method !== "POST") return new Response("OK");

  const update = await request.json();

  // ---- /dt COMMAND ----
  if (update.message?.text === "/dt") {
    const chatId = update.message.chat.id;

    const mcqs = await getRandomMCQs(env, 20);
    if (mcqs.length < 20) {
      await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text:
`🌺 Dr Arzoo Fatema 🌺
⚠️ Not enough MCQs available
Please contact admin`,
        }),
      });
      return new Response("OK");
    }

    await startTest(env, chatId, mcqs);

    await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text:
`🌺 Dr Arzoo Fatema 🌺
📝 Daily Test Started

📊 Total Questions: 20`,
      }),
    });

    const test = await getTest(env, chatId);
    await sendQuestion(env, chatId, test);
    return new Response("OK");
  }

  // ---- ANSWER HANDLER ----
  if (update.callback_query) {
    const chatId = update.callback_query.message.chat.id;
    const answer = update.callback_query.data;

    const test = await getTest(env, chatId);
    if (!test) return new Response("OK");

    const q = test.questions[test.index];
    let reply = "";

    if (answer === q.correct) {
      test.correct++;
      reply = "✅ Correct Answer 🎉";
    } else {
      test.wrong++;
      reply = `❌ Wrong Answer\n\n✅ Correct: ${q.correct}`;
    }

    await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text:
`${reply}

💡 Explanation:
${q.explanation}`,
      }),
    });

    test.index++;

    if (test.index >= test.questions.length) {
      await endTest(env, chatId);

      const accuracy = Math.round(
        (test.correct / (test.correct + test.wrong)) * 100
      );

      await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text:
`🌺 Dr Arzoo Fatema 🌺
📊 Test Finished

✅ Correct: ${test.correct}
❌ Wrong: ${test.wrong}
🎯 Accuracy: ${accuracy}%

💡 Tip:
Revise weak subjects today`,
        }),
      });
    } else {
      await saveTest(env, chatId, test);
      await sendQuestion(env, chatId, test);
    }
  }

  return new Response("OK");
}

/**********************************************************
 * PHASE 2 END
 **********************************************************/
