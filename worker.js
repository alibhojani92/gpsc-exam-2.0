export default {
  async fetch(request, env) {
    if (request.method !== "POST") {
      return new Response("GPSC EXAM 2.0 Bot Running");
    }

    const update = await request.json();
    const message = update.message || update.callback_query?.message;
    const chatId = message.chat.id;

    const questions = [
      {
        q: "GPSC stands for?",
        options: [
          "Gujarat Public Service Commission",
          "General Public Service Council",
          "Government Public Service Committee",
          "None"
        ],
        correct: 0
      },
      {
        q: "Capital of Gujarat?",
        options: ["Ahmedabad", "Surat", "Gandhinagar", "Vadodara"],
        correct: 2
      }
    ];

    if (update.message?.text === "/quiz") {
      const quiz = questions[Math.floor(Math.random() * questions.length)];

      const keyboard = quiz.options.map((o, i) => [{
        text: o,
        callback_data: i === quiz.correct ? "correct" : "wrong"
      }]);

      await send(env, chatId, quiz.q, keyboard);
    }

    if (update.callback_query) {
      const reply = update.callback_query.data === "correct"
        ? "✅ Correct!"
        : "❌ Wrong answer";

      await send(env, chatId, reply);
    }

    return new Response("ok");
  }
};

async function send(env, chatId, text, keyboard = null) {
  const payload = {
    chat_id: chatId,
    text,
    reply_markup: keyboard ? { inline_keyboard: keyboard } : undefined
  };

  await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}
