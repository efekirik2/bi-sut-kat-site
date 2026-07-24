const { sb, requireUser, json, wrap } = require("./lib/supabase");

exports.handler = wrap(async (event, context) => {
  const user = requireUser(context);
  if (!user) return json(401, { error: "Giriş yapmanız gerekiyor." });
  if (event.httpMethod !== "POST") return json(405, { error: "Yöntem desteklenmiyor." });

  const body = JSON.parse(event.body || "{}");
  const tableId = body.table_id;
  if (!tableId) return json(400, { error: "table_id gerekli." });

  const openOrders = await sb("/orders?table_id=eq." + tableId + "&status=eq.open&select=id");
  if (!openOrders || !openOrders.length) {
    return json(404, { error: "Bu masada açık sipariş yok." });
  }
  const orderId = openOrders[0].id;

  const items = await sb("/order_items?order_id=eq." + orderId + "&select=price,quantity");
  const total = (items || []).reduce((sum, i) => sum + Number(i.price) * i.quantity, 0);

  const patch = {
    status: "closed",
    closed_at: new Date().toISOString(),
    total,
  };
  const paymentMethod = (body.payment_method || "").trim();
  if (paymentMethod) patch.payment_method = paymentMethod;

  try {
    await sb("/orders?id=eq." + orderId, { method: "PATCH", body: JSON.stringify(patch) });
  } catch (e) {
    // payment_method kolonu henüz yoksa onsuz kapat (bozulmadan çalışır)
    delete patch.payment_method;
    await sb("/orders?id=eq." + orderId, { method: "PATCH", body: JSON.stringify(patch) });
  }

  return json(200, { ok: true, total });
});
