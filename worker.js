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
/***********************
 PHASE 2 START
 TEST ENGINE CORE (DT / WT)
***********************/

// helper: fetch random MCQs (no repeat logic will come later)
async function getRandomMCQs(env, limit) {
  const { results } = await env.DB
    .prepare(`SELECT * FROM mcqs ORDER BY RANDOM() LIMIT ?`)
    .bind(limit)
    .all();
  return results || [];
}

// START DAILY TEST
async function handleDailyTest(chatId, env) {
  const mcqs = await getRandomMCQs(env, 20);

  if (!mcqs.length) {
    await sendMessage(env, chatId,
      `🌺❤️ My Love Dr Arzoo Fatema ❤️🌺

⚠️ *Daily Test unavailable*

📭 MCQs add nahi thayela che.
🛠️ Admin ne MCQs add karva kaho.

💡 Tip: Pehla MCQs add → pachi test`
    );
    return;
  }

  await sendMessage(env, chatId,
    `🌺❤️ My Love Dr Arzoo Fatema ❤️🌺

📝 *Daily Test Started*
📊 Questions: ${mcqs.length}
⏱️ Time: 5 min per question

✨ All the best!`
  );

  // store active test (simplified for Phase-2)
  await env.KV.put(
    `active_test_${chatId}`,
    JSON.stringify({ type: "DT", index: 0, mcqs })
  );

  await sendQuestion(env, chatId);
}

// START WEEKLY TEST
async function handleWeeklyTest(chatId, env) {
  const mcqs = await getRandomMCQs(env, 50);

  if (!mcqs.length) {
    await sendMessage(env, chatId,
      `🌺❤️ My Love Dr Arzoo Fatema ❤️🌺

⚠️ *Weekly Test unavailable*

📭 MCQs add nahi thayela che.
🛠️ Admin ne MCQs add karva kaho.`
    );
    return;
  }

  await sendMessage(env, chatId,
    `🌺❤️ My Love Dr Arzoo Fatema ❤️🌺

📝 *Weekly Test Started*
📊 Questions: ${mcqs.length}
⏱️ Time: 5 min per question

🔥 Stay focused!`
  );

  await env.KV.put(
    `active_test_${chatId}`,
    JSON.stringify({ type: "WT", index: 0, mcqs })
  );

  await sendQuestion(env, chatId);
}

// SEND QUESTION
async function sendQuestion(env, chatId) {
  const raw = await env.KV.get(`active_test_${chatId}`);
  if (!raw) return;

  const test = JSON.parse(raw);
  const q = test.mcqs[test.index];

  if (!q) {
    await sendMessage(env, chatId,
      `🌺❤️ My Love Dr Arzoo Fatema ❤️🌺

✅ *Test Completed*
🎉 Great effort!

📊 Result & analysis next phase ma add thase.`
    );
    await env.KV.delete(`active_test_${chatId}`);
    return;
  }

  await sendMessage(env, chatId,
`🌺❤️ My Love Dr Arzoo Fatema ❤️🌺

❓ *Q${test.index + 1}*
${q.question}

A️⃣ ${q.option_a}
B️⃣ ${q.option_b}
C️⃣ ${q.option_c}
D️⃣ ${q.option_d}

⏳ *5 minutes remaining*`
  );
}

// ROUTER HOOK (called from main fetch)
async function phase2Router(message, env) {
  const text = message.text?.toLowerCase();
  const chatId = message.chat.id;

  if (text === "/dt") {
    await handleDailyTest(chatId, env);
    return true;
  }

  if (text === "/wt") {
    await handleWeeklyTest(chatId, env);
    return true;
  }

  return false;
}

/***********************
 PHASE 2 END
***********************/
