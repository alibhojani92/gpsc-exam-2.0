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
