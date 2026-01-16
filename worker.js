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
