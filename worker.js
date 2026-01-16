export default {
  async fetch(req, env, ctx) {
    if (req.method !== "POST") return new Response("Dental GPSC Bot Running ✅");

    const update = await req.json();
    if (!update.message && !update.callback_query) return new Response("OK");

    const BOT = `https://api.telegram.org/bot${env.BOT_TOKEN}`;
    const ADMIN = Number(env.ADMIN_ID);
    const KV = env.KV;

    /* ---------- TIME ---------- */
    const IST = () =>
      new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
    const today = () => IST().toISOString().slice(0, 10);
    const hhmm = (m) =>
      `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(
        2,
        "0"
      )}`;

    /* ---------- SEND ---------- */
    const send = async (id, text, kb = null) => {
      await fetch(`${BOT}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: id,
          text: `🌺 Dr. Arzoo Fatema 🌺\n\n${text}`,
          reply_markup: kb,
        }),
      });
    };

    /* ---------- MESSAGE ---------- */
    const msg = update.message;
    const cb = update.callback_query;
    const chatId = msg?.chat?.id || cb?.message.chat.id;
    const userId = msg?.from?.id || cb?.from.id;
    const text = (msg?.text || "").trim();

    /* ================= READING ================= */
    if (/^\/read$/i.test(text)) {
      if (userId === ADMIN)
        return send(chatId, "Admin test detected. Reading not counted.");

      const key = `read:session:${userId}`;
      const s = await KV.get(key, "json");
      if (s && s.date === today())
        return send(chatId, "📖 Reading already running.");

      await KV.put(key, JSON.stringify({ start: Date.now(), date: today() }));
      await send(chatId, "📚 Reading started\n🎯 Target: 08:00");
      await send(ADMIN, `🔔 Reading started by ${userId}`);
      return new Response("OK");
    }

    if (/^\/stop$/i.test(text)) {
      if (userId === ADMIN)
        return send(chatId, "Admin test detected. Reading not counted.");

      const key = `read:session:${userId}`;
      const s = await KV.get(key, "json");
      if (!s) return send(chatId, "⚠️ No active reading.");

      const mins = Math.floor((Date.now() - s.start) / 60000);
      const logKey = `read:log:${userId}:${s.date}`;
      const prev = Number(await KV.get(logKey)) || 0;
      const total = prev + mins;

      await KV.put(logKey, total.toString());
      await KV.delete(key);

      await send(
        chatId,
        `⏱️ Reading stopped\n📘 Today: ${hhmm(
          total
        )}\n🎯 Remaining: ${hhmm(Math.max(480 - total, 0))}`
      );
      await send(ADMIN, `🔔 Reading stopped by ${userId}`);
      return new Response("OK");
    }

    /* ================= MCQ ADD (ADMIN) ================= */
    if (/^\/addmcq$/i.test(text) && userId === ADMIN) {
      await send(
        chatId,
        "Reply to this message with MCQs.\nFormat:\nSUBJECT: X\nQ1...\nA)\nB)\nC)\nD)\nAns: A\nExp: ..."
      );
      await KV.put("mcq:add:mode", "1");
      return new Response("OK");
    }

    if (msg?.reply_to_message && (await KV.get("mcq:add:mode")) === "1") {
      await KV.delete("mcq:add:mode");

      let subject = "General";
      const sm = text.match(/SUBJECT:\s*(.*)/i);
      if (sm) subject = sm[1].trim();

      const blocks = text
        .replace(/SUBJECT:.*\n?/i, "")
        .split(/\n(?=Q)/i);

      let added = 0;
      for (const b of blocks) {
        const q = b.match(/Q\d*\.?\s*(.*)/i)?.[1];
        const A = b.match(/A\)\s*(.*)/i)?.[1];
        const B = b.match(/B\)\s*(.*)/i)?.[1];
        const C = b.match(/C\)\s*(.*)/i)?.[1];
        const D = b.match(/D\)\s*(.*)/i)?.[1];
        const ans = b.match(/Ans:\s*([ABCD])/i)?.[1];
        const exp = b.match(/Exp:\s*(.*)/i)?.[1] || "";

        if (q && A && B && C && D && ans) {
          const id = crypto.randomUUID();
          await KV.put(
            `mcq:${id}`,
            JSON.stringify({ q, A, B, C, D, ans, exp, subject })
          );
          added++;
        }
      }

      await send(chatId, `✅ MCQs added: ${added}`);
      return new Response("OK");
    }

    /* ================= FALLBACK ================= */
    if (text.startsWith("/")) {
      await send(chatId, "❓ Command not recognized.");
    }

    return new Response("OK");
  },
};
