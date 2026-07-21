const { sb, requireUser, json, wrap } = require("./lib/supabase");

exports.handler = wrap(async (event, context) => {
  const user = requireUser(context);
  if (!user) return json(401, { error: "Giriş yapmanız gerekiyor." });

  if (event.httpMethod === "GET") {
    const rows = await sb(
      "/tables?select=id,name,created_at,orders(id,opened_at,order_items(id,name,price,quantity,note))&orders.status=eq.open&order=created_at.asc"
    );
    const withTotals = (rows || []).map((t) => {
      const order = (t.orders || [])[0] || null;
      const items = order ? order.order_items || [] : [];
      const total = items.reduce((sum, i) => sum + Number(i.price) * i.quantity, 0);
      return {
        id: t.id,
        name: t.name,
        order_id: order ? order.id : null,
        items,
        total,
      };
    });
    return json(200, withTotals);
  }

  if (event.httpMethod === "POST") {
    const body = JSON.parse(event.body || "{}");
    const name = (body.name || "").trim();
    if (!name) return json(400, { error: "Masa adı gerekli." });
    const [created] = await sb("/tables", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify([{ name }]),
    });
    return json(201, created);
  }

  if (event.httpMethod === "DELETE") {
    const id = event.queryStringParameters && event.queryStringParameters.id;
    if (!id) return json(400, { error: "id gerekli." });
    // Masa silinince açık/kapalı siparişleri ve satırları cascade ile gider.
    await sb("/tables?id=eq." + id, { method: "DELETE" });
    return json(200, { ok: true });
  }

  return json(405, { error: "Yöntem desteklenmiyor." });
});
