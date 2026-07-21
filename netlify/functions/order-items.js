const { sb, requireUser, json, wrap } = require("./lib/supabase");

async function getOrCreateOpenOrder(tableId) {
  const existing = await sb("/orders?table_id=eq." + tableId + "&status=eq.open&select=id");
  if (existing && existing.length) return existing[0].id;
  const [created] = await sb("/orders", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify([{ table_id: tableId }]),
  });
  return created.id;
}

exports.handler = wrap(async (event, context) => {
  const user = requireUser(context);
  if (!user) return json(401, { error: "Giriş yapmanız gerekiyor." });

  if (event.httpMethod === "POST") {
    const body = JSON.parse(event.body || "{}");
    const { table_id, name, price, quantity, note } = body;
    if (!table_id || !name || price == null || !quantity) {
      return json(400, { error: "Eksik bilgi." });
    }
    const orderId = await getOrCreateOpenOrder(table_id);
    const [created] = await sb("/order_items", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify([
        {
          order_id: orderId,
          name,
          price,
          quantity,
          note: note || null,
        },
      ]),
    });
    return json(201, created);
  }

  if (event.httpMethod === "PATCH") {
    const id = event.queryStringParameters && event.queryStringParameters.id;
    if (!id) return json(400, { error: "id gerekli." });
    const body = JSON.parse(event.body || "{}");
    const patch = {};
    if (body.price != null) patch.price = body.price;
    if (body.quantity != null) patch.quantity = body.quantity;
    if (!Object.keys(patch).length) return json(400, { error: "Güncellenecek alan yok." });
    await sb("/order_items?id=eq." + id, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
    return json(200, { ok: true });
  }

  if (event.httpMethod === "DELETE") {
    const id = event.queryStringParameters && event.queryStringParameters.id;
    if (!id) return json(400, { error: "id gerekli." });
    await sb("/order_items?id=eq." + id, { method: "DELETE" });
    return json(200, { ok: true });
  }

  return json(405, { error: "Yöntem desteklenmiyor." });
});
