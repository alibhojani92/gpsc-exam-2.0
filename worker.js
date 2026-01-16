export default {
  async fetch(request, env) {
    if (request.method !== "POST") {
      return new Response("GPSC EXAM 2.0 – Dental Quiz Bot Running");
    }

    const update = await request.json();
    const chatId =
      update.message?.chat.id ||
      update.callback_query?.message.chat.id;

    const SUBJECTS = {
      anatomy: [
        {
          q: "Foramen ovale transmits which nerve?",
          options: [
            "Maxillary nerve",
            "Mandibular nerve",
            "Facial nerve",
            "Glossopharyngeal nerve"
          ],
          correct: 1
        }
      ],

      oral_anatomy: [
        {
          q: "Which tooth erupts first in permanent dentition?",
          options: [
            "Central incisor",
            "First molar",
            "Lateral incisor",
            "Canine"
          ],
          correct: 1
        }
      ],

      physiology: [
        {
          q: "Normal resting salivary flow rate is?",
          options: [
            "0.1–0.2 ml/min",
            "0.3–0.4 ml/min",
            "0.5–0.7 ml/min",
            "1.0 ml/min"
          ],
          correct: 0
        }
      ],

      biochemistry: [
        {
          q: "Major inorganic component of enamel is?",
          options: [
            "Calcium carbonate",
            "Hydroxyapatite",
            "Fluorapatite",
            "Tricalcium phosphate"
          ],
          correct: 1
        }
      ],

      pathology: [
        {
          q: "Reed–Sternberg cells are seen in?",
          options: [
            "Non-Hodgkin lymphoma",
            "Hodgkin lymphoma",
            "Multiple myeloma",
            "Leukemia"
          ],
          correct: 1
        }
      ],

      microbiology: [
        {
          q: "Most common bacteria in dental caries?",
          options: [
            "Lactobacillus",
            "Actinomyces",
            "Streptococcus mutans",
            "Staphylococcus aureus"
          ],
          correct: 2
        }
      ],

      pharmacology: [
        {
          q: "Local anesthetic with vasodilator action?",
          options: [
            "Lignocaine",
            "Bupivacaine",
            "Procaine",
            "Prilocaine"
          ],
          correct: 2
        }
      ],

      dental_materials: [
        {
          q: "Zinc oxide eugenol sets by?",
          options: [
            "Polymerization",
            "Chelation",
            "Crystallization",
            "Condensation"
          ],
          correct: 1
        }
      ],

      oral_pathology: [
        {
          q: "Most common oral premalignant lesion?",
          options: [
            "Erythroplakia",
            "Leukoplakia",
            "Lichen planus",
            "Oral submucous fibrosis"
          ],
          correct: 1
        }
      ],

      community_dentistry: [
        {
          q: "Optimum fluoride level in drinking water?",
          options: [
            "0.2 ppm",
            "0.5 ppm",
            "1 ppm",
            "2 ppm"
          ],
          correct: 2
        }
      ]
    };

    // /start
    if (update.message?.text === "/start") {
      await send(
        env,
        chatId,
        "🦷 *GPSC EXAM 2.0 – Dental Quiz Bot*\n\n" +
        "Use:\n/quiz anatomy\n/quiz physiology\n/quiz pathology\n\n" +
        "✔ 20 questions per quiz\n✔ Unlimited attempts",
        true
      );
    }

    // /quiz subject
    if (update.message?.text?.startsWith("/quiz")) {
      const subject = update.message.text.split(" ")[1];
      const bank = SUBJECTS[subject];

      if (!bank) {
        await send(env, chatId, "❌ Invalid subject name");
        return new Response("ok");
      }

      const selected = shuffle(bank).slice(0, 20);

      for (let i = 0; i < selected.length; i++) {
        const q = selected[i];

        const keyboard = q.options.map((opt, idx) => [{
          text: opt,
          callback_data: idx === q.correct ? "correct" : "wrong"
        }]);

        await send(
          env,
          chatId,
          `Q${i + 1}. ${q.q}`,
          false,
          keyboard
        );
      }
    }

    if (update.callback_query) {
      const reply =
        update.callback_query.data === "correct"
          ? "✅ Correct"
          : "❌ Wrong";

      await send(env, chatId, reply);
    }

    return new Response("ok");
  }
};

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

async function send(env, chatId, text, markdown = false, keyboard = null) {
  const payload = {
    chat_id: chatId,
    text,
    parse_mode: markdown ? "Markdown" : undefined,
    reply_markup: keyboard ? { inline_keyboard: keyboard } : undefined
  };

  await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}
