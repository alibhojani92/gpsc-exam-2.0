export default {
  async fetch(request, env) {
    // write test
    await env.KV.put("kv_test_key", "KV_WORKING");

    // read test
    const value = await env.KV.get("kv_test_key");

    return new Response(
      value ? `KV OK: ${value}` : "KV NOT WORKING",
      { status: 200 }
    );
  }
};
