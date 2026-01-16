export default {
  async fetch(request, env, ctx) {
    // Write test key if not exists
    let v = await env.KV.get("health");

    if (!v) {
      await env.KV.put("health", "KV_OK");
      v = "KV_OK (written now)";
    }

    return new Response(
      "KV STATUS: " + v,
      { headers: { "content-type": "text/plain" } }
    );
  }
};
