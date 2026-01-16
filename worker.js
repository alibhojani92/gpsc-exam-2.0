/*************************************************
 * PART 1 – CORE & SAFETY LAYER
 * Project: GPSC Exam 2.0
 * Status: PHASE-1
 *************************************************/

/* ========== BASIC CONSTANTS ========== */

const BOT_NAME = "🌺 Dear Student 🌺";
const ADMIN_ID = 7539477188;
const GROUP_ID = -5154292869;

/* Emojis – global use */
const EMOJI = {
  ok: "✅",
  error: "⚠️",
  read: "📖",
  stop: "⏹️",
  test: "📝",
  report: "📊",
  fire: "🔥",
  clock: "⏱️",
  brain: "🧠",
  book: "📚",
  bell: "🔔",
  moon: "🌙",
  sun: "🌅",
};

/* ========== SAFE JSON PARSER ========== */
function safeJSON(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/* ========== MESSAGE TYPE HELPERS ========== */
function isPrivate(chat) {
  return chat?.type === "private";
}
function isGroup(chat) {
  return chat?.type === "group" || chat?.type === "supergroup";
}
function isAdmin(userId) {
  return userId === ADMIN_ID;
}

/* ========== TELEGRAM API HELPERS ========== */
async function tgSend(env, chatId, text, extra = {}) {
  const payload = {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    ...extra,
  };

  await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

/* ========== INTRO MESSAGE ========== */
async function sendWelcome(env, chatId) {
  await tgSend(
    env,
    chatId,
    `${BOT_NAME}\n\n${EMOJI.ok} Bot is online & ready`
  );
}

/* ========== COMMAND NORMALIZER ========== */
function normalize(text = "") {
  return text.trim().toLowerCase();
}

/* ========== SAFE EMPTY RESPONSE ========== */
async function safeReply(env, chatId) {
  await tgSend(
    env,
    chatId,
    `${BOT_NAME}\n${EMOJI.error} Command not available yet`
  );
}

/* ========== PART-1 TEST MARKER ========== */
/*
TEST CHECKS FOR PART-1:
1️⃣ Bot replies /start in private
2️⃣ Bot replies /start in group
3️⃣ No crash on random message
4️⃣ Emoji + intro visible
*/
