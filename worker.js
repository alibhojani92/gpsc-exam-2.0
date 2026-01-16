// ================================
// 🌺 GPSC EXAM 2.0 – PHASE 1
// CORE STABLE BOT (READING SYSTEM)
// ================================

export default {
  async fetch(request, env, ctx) {
    if (request.method !== "POST") {
      return new Response("Bot is running ✅");
    }

    const update = await request.json();
    const message = update.message || update.callback_query?.message;
    const text = update.message?.text || "";
    const chatId = message.chat.id;
    const userId = message.from.id;

    const BOT_INTRO = "🌺 Dear Student 🌺";

    // ---------- UTIL ----------
    const sendMessage = async (text, keyboard = null) => {
      const payload = {
        chat_id: chatId,
        text,
        parse_mode: "HTML",
      };
      if (keyboard) payload.reply_markup = keyboard;

      await fetch(
        `https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
    };

    const now = Date.now();

    // ---------- INLINE KEYS ----------
    const readKeyboard = {
      inline_keyboard: [
        [{ text: "📖 Start Reading", callback_data: "READ_START" }],
        [{ text: "⏹ Stop Reading", callback_data: "READ_STOP" }],
      ],
    };

    // ---------- /start ----------
    if (text === "/start") {
      await sendMessage(
        `${BOT_INTRO}\n\n✅ Bot is active\n\nChoose an option 👇`,
        readKeyboard
      );
      return new Response("ok");
    }

    // ---------- CALLBACK HANDLER ----------
    if (update.callback_query) {
      const action = update.callback_query.data;

      const active = await env.KV.get(`reading:${userId}`, { type: "json" });

      // START READING
      if (action === "READ_START") {
        if (active) {
          await sendMessage(
            `${BOT_INTRO}\n⚠️ Reading already started.\nUse ⏹ Stop Reading`
          );
          return new Response("ok");
        }

        await env.KV.put(
          `reading:${userId}`,
          JSON.stringify({ start: now })
        );

        await sendMessage(
          `${BOT_INTRO}\n📖 Reading started!\nStay focused 💪`
        );
        return new Response("ok");
      }

      // STOP READING
      if (action === "READ_STOP") {
        if (!active) {
          await sendMessage(
            `${BOT_INTRO}\n⚠️ Reading not active.\nUse 📖 Start Reading`
          );
          return new Response("ok");
        }

        const minutes = Math.floor((now - active.start) / 60000);
        await env.KV.delete(`reading:${userId}`);

        await sendMessage(
          `${BOT_INTRO}\n⏹ Reading stopped\n\n⏱ Time studied: <b>${minutes} min</b>`
        );
        return new Response("ok");
      }
    }

    // ---------- TEXT COMMANDS ----------
    if (text === "/read") {
      const active = await env.KV.get(`reading:${userId}`);
      if (active) {
        await sendMessage(
          `${BOT_INTRO}\n⚠️ Reading already started.\nUse /stop`
        );
      } else {
        await env.KV.put(
          `reading:${userId}`,
          JSON.stringify({ start: now })
        );
        await sendMessage(
          `${BOT_INTRO}\n📖 Reading started!\nGood luck ✨`
        );
      }
      return new Response("ok");
    }

    if (text === "/stop") {
      const active = await env.KV.get(`reading:${userId}`, { type: "json" });
      if (!active) {
        await sendMessage(
          `${BOT_INTRO}\n⚠️ No active reading session`
        );
      } else {
        const minutes = Math.floor((now - active.start) / 60000);
        await env.KV.delete(`reading:${userId}`);
        await sendMessage(
          `${BOT_INTRO}\n⏹ Reading stopped\n⏱ Time studied: <b>${minutes} min</b>`
        );
      }
      return new Response("ok");
    }

    // ---------- FALLBACK (NO SPAM) ----------
    return new Response("ok");
  },
};
// ===================================================
// ================= PHASE-2 START ===================
// ============ ADVANCED READING SYSTEM ==============
// ===================================================

// ---------- CONSTANTS ----------
const DAILY_TARGET_MINUTES = 8 * 60; // 08:00 hours

// ---------- TIME HELPERS ----------
function nowIST() {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
  );
}

function formatAMPM(date) {
  let h = date.getHours();
  let m = date.getMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")} ${ampm}`;
}

function minutesToHHMM(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")} hrs`;
}

function todayKey() {
  return nowIST().toISOString().slice(0, 10);
}

// ---------- KV KEYS ----------
function sessionKey(userId) {
  return `reading_session:${userId}`;
}
function logKey(userId, date) {
  return `reading_log:${userId}:${date}`;
}

// ---------- START READING ----------
async function startReading(env, chatId, userId, isAdmin = false) {
  const existing = await env.KV.get(sessionKey(userId));
  if (existing) {
    await sendMessage(env, chatId,
      `🌺 Dear Student 🌺\n\n⚠️ Reading already started.\nUse ⏹ Stop Reading to finish.`
    );
    return;
  }

  const startTime = nowIST().toISOString();
  await env.KV.put(sessionKey(userId), startTime);

  const msg =
`🌺 Dear Student 🌺

📖 Reading Started
🕒 Start Time: ${formatAMPM(nowIST())}
🎯 Daily Target: 08:00 hrs
⏳ Remaining: 08:00 hrs

Stay focused 💪`;

  await sendMessage(env, chatId, msg, {
    inline_keyboard: [[
      { text: "⏹ Stop Reading", callback_data: "READ_STOP" }
    ]]
  });

  // Admin notification
  await sendMessage(env, ADMIN_ID,
`🛠 Admin Alert

👤 User ID: ${userId}
📖 Reading Started
🕒 ${formatAMPM(nowIST())}`);
}

// ---------- STOP READING ----------
async function stopReading(env, chatId, userId) {
  const startISO = await env.KV.get(sessionKey(userId));
  if (!startISO) {
    await sendMessage(env, chatId,
      `🌺 Dear Student 🌺\n\n⚠️ You are not reading right now.\nTap 📖 Start Reading to begin.`
    );
    return;
  }

  const start = new Date(startISO);
  const end = nowIST();
  const sessionMinutes = Math.max(
    1,
    Math.floor((end - start) / 60000)
  );

  await env.KV.delete(sessionKey(userId));

  const date = todayKey();
  const prev = await env.D1.prepare(
    "SELECT minutes FROM reading_logs WHERE user_id=? AND date=?"
  ).bind(userId, date).first();

  const totalMinutes = (prev?.minutes || 0) + sessionMinutes;

  if (prev) {
    await env.D1.prepare(
      "UPDATE reading_logs SET minutes=? WHERE user_id=? AND date=?"
    ).bind(totalMinutes, userId, date).run();
  } else {
    await env.D1.prepare(
      "INSERT INTO reading_logs (user_id, date, minutes) VALUES (?, ?, ?)"
    ).bind(userId, date, totalMinutes).run();
  }

  const remaining = Math.max(DAILY_TARGET_MINUTES - totalMinutes, 0);

  const msg =
`🌺 Dear Student 🌺

⏹ Reading Stopped
🕒 Session Time: ${minutesToHHMM(sessionMinutes)}

📘 Today Total: ${minutesToHHMM(totalMinutes)}
🎯 Target Left: ${minutesToHHMM(remaining)}

Great work 👏`;

  await sendMessage(env, chatId, msg, {
    inline_keyboard: [[
      { text: "📖 Start Reading", callback_data: "READ_START" }
    ]]
  });

  // Admin notification
  await sendMessage(env, ADMIN_ID,
`🛠 Admin Alert

👤 User ID: ${userId}
⏹ Reading Stopped
📘 Session: ${minutesToHHMM(sessionMinutes)}
📊 Today: ${minutesToHHMM(totalMinutes)}`);
}

// ---------- COMMAND HANDLERS ----------
registerCommand("/read", async (env, msg) => {
  await startReading(env, msg.chat.id, msg.from.id);
});

registerCommand("/stop", async (env, msg) => {
  await stopReading(env, msg.chat.id, msg.from.id);
});

// ---------- INLINE HANDLERS ----------
registerCallback("READ_START", async (env, q) => {
  await startReading(env, q.message.chat.id, q.from.id);
});

registerCallback("READ_STOP", async (env, q) => {
  await stopReading(env, q.message.chat.id, q.from.id);
});

// ===================================================
// ================= PHASE-2 END =====================
// ===================================================
