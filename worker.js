/* =====================================================
   GPSC EXAM 2.0 – PHASE 1 (CORE STABLE)
   Cloudflare Worker
   ===================================================== */

export default {
  async fetch(request, env, ctx) {
    if (request.method !== "POST") {
      return new Response("OK");
    }

    const update = await request.json();

    const message =
      update.message ||
      update.edited_message ||
      update.callback_query?.message;

    if (!message) return new Response("OK");

    const chatId = message.chat.id;
    const text = update.message?.text || "";
    const callback = update.callback_query;

    /* ================= HELPERS ================= */

    const sendMessage = async (payload) => {
      await fetch(
        `https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
    };

    const minutesToHHMM = (mins) => {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    };

    const todayKey = () => {
      const d = new Date();
      return d.toISOString().slice(0, 10);
    };

    /* ================= START ================= */

    if (text === "/start") {
      await sendMessage({
        chat_id: chatId,
        text: "🌺 Dear Student 🌺\n\nWelcome To GPSC Exam Prepration ❤️🌺",
        reply_markup: {
          inline_keyboard: [
            [{ text: "📖 Start Reading", callback_data: "READ_START" }],
            [{ text: "⏹ Stop Reading", callback_data: "READ_STOP" }],
            [{ text: "ℹ️ Help", callback_data: "HELP" }],
          ],
        },
      });
      return new Response("OK");
    }

    /* ================= HELP ================= */

    if (text === "/help" || callback?.data === "HELP") {
      await sendMessage({
        chat_id: chatId,
        text:
          "🌺 Dear Student 🌺\n\n" +
          "📌 Available Commands:\n" +
          "/start – Start bot\n" +
          "/read – Start reading\n" +
          "/stop – Stop reading\n" +
          "/help – Show help\n\n" +
          "Use buttons or commands.",
      });
      return new Response("OK");
    }

    /* ================= READ START ================= */

    if (text === "/read" || callback?.data === "READ_START") {
      const active = await env.KV.get(`READING:${chatId}`);

      if (active) {
        await sendMessage({
          chat_id: chatId,
          text: "⚠️ Reading already started.",
        });
        return new Response("OK");
      }

      await env.KV.put(
        `READING:${chatId}`,
        JSON.stringify({ start: Date.now() })
      );

      await sendMessage({
        chat_id: chatId,
        text:
          "📖 Reading started\n\n" +
          "🎯 Daily Target: 08:00\n" +
          "Stay focused 💪",
      });
      return new Response("OK");
    }

    /* ================= READ STOP ================= */

    if (text === "/stop" || callback?.data === "READ_STOP") {
      const active = await env.KV.get(`READING:${chatId}`, { type: "json" });

      if (!active) {
        await sendMessage({
          chat_id: chatId,
          text: "⚠️ Reading not started yet.",
        });
        return new Response("OK");
      }

      const minutes = Math.floor((Date.now() - active.start) / 60000);

      const key = `DAILY:${chatId}:${todayKey()}`;
      const previous = Number(await env.KV.get(key)) || 0;
      const total = previous + minutes;

      await env.KV.put(key, String(total));
      await env.KV.delete(`READING:${chatId}`);

      const remaining = Math.max(480 - total, 0);

      await sendMessage({
        chat_id: chatId,
        text:
          "⏹ Reading stopped\n\n" +
          `📘 Studied Today: ${minutesToHHMM(total)}\n` +
          `🎯 Remaining: ${minutesToHHMM(remaining)}`,
      });
      return new Response("OK");
    }

    /* ================= SILENT MODE ================= */
    // ❌ NO random text reply
    return new Response("OK");
  },
};
// ===== PHASE 1 END =====
/*********************** PHASE 2 START *************************
 DAILY RESET + YESTERDAY SUMMARY + TARGET RESET (IST)
***************************************************************/

// ---- TIME HELPERS ----
function getISTDate() {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
}
function getDateKey(d = getISTDate()) {
  return d.toISOString().slice(0, 10);
}
function formatHM(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// ---- DAILY CRON (every minute, safe) ----
async function handleDailyAutomation(env) {
  const now = getISTDate();
  const hour = now.getHours();
  const minute = now.getMinutes();

  // Run ONLY at 12:00 AM IST
  if (hour !== 0 || minute !== 0) return;

  const today = getDateKey(now);
  const yesterday = getDateKey(new Date(now.getTime() - 86400000));

  // ---- Load KV data ----
  const readLog = JSON.parse(await env.GPSC_KV.get("READ_LOG") || "{}");
  const target = 480; // 08:00 hrs in minutes

  const yesterdayMin = readLog[yesterday] || 0;

  // ---- Send Yesterday Summary (GROUP ONLY) ----
  const summary =
`🌺 Dear Student 🌺

📊 *Yesterday’s Study Summary*
📅 Date: ${yesterday}

📘 Studied: ${formatHM(yesterdayMin)}
🎯 Target: 08:00
📉 Shortfall: ${formatHM(Math.max(target - yesterdayMin, 0))}

💡 Tip:
Consistency beats intensity. Keep going 💪`;

  await sendTelegramMessage(env, env.GROUP_ID, summary);

  // ---- Reset today's counters ----
  readLog[today] = 0;
  await env.GPSC_KV.put("READ_LOG", JSON.stringify(readLog));

  // Clear active reading sessions
  await env.GPSC_KV.delete("ACTIVE_READ");

  // Save last reset marker (debug safe)
  await env.GPSC_KV.put("LAST_RESET", today);
}

// ---- Hook automation into fetch ----
async function phase2AutomationHook(env) {
  await handleDailyAutomation(env);
}

/*********************** PHASE 2 END ***************************/
