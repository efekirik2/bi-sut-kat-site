const { sb, requireUser, json } = require("./lib/supabase");

// GET  -> herkese açık: site görsellerini { key: value } biçiminde döndürür
// PUT  -> girişli: gelen { key: value } çiftlerini kaydeder (upsert)
exports.handler = async (event, context) => {
  if (event.httpMethod === "GET") {
    const rows = await sb("/site_settings?select=key,value");
    const out = {};
    (rows || []).forEach((r) => { out[r.key] = r.value; });
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      body: JSON.stringify(out),
    };
  }

  // Yazma işlemleri giriş ister
  const user = requireUser(context);
  if (!user) return json(401, { error: "Giriş yapmanız gerekiyor." });

  if (event.httpMethod === "PUT") {
    const body = JSON.parse(event.body || "{}");
    const rows = Object.keys(body).map((k) => ({ key: k, value: body[k] }));
    if (rows.length) {
      await sb("/site_settings?on_conflict=key", {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates" },
        body: JSON.stringify(rows),
      });
    }
    return json(200, { ok: true });
  }

  return json(405, { error: "Yöntem desteklenmiyor." });
};
