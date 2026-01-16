if (new URL(request.url).pathname === "/kv-test") {
  await env.KV.put("health", "OK");
  const v = await env.KV.get("health");
  return new Response("KV STATUS: " + v);
}
