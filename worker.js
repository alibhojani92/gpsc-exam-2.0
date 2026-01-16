if (update.message?.text === "/kvtest") {
  await env.KV.put("kv_test_key", "KV_OK");
  const value = await env.KV.get("kv_test_key");

  return fetch(
    `https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: update.message.chat.id,
        text: `KV TEST RESULT ✅\nValue: ${value}`,
      }),
    }
  );
}
