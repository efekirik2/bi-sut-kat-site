const { sb, requireUser, json } = require("./lib/supabase");

// GET (girişli): belirli tarih aralığında kapatılan hesapların özeti + listesi
// ?from=<ISO>&to=<ISO>  (verilmezse tüm kapatılan hesaplar)
exports.handler = async (event, context) => {
  const user = requireUser(context);
  if (!user) return json(401, { error: "Giriş yapmanız gerekiyor." });
  if (event.httpMethod !== "GET") return json(405, { error: "Yöntem desteklenmiyor." });

  const q = event.queryStringParameters || {};
  const filter =
    "&status=eq.closed&order=closed_at.desc" +
    (q.from ? "&closed_at=gte." + encodeURIComponent(q.from) : "") +
    (q.to ? "&closed_at=lt." + encodeURIComponent(q.to) : "");

  let rows;
  try {
    rows = await sb("/orders?select=total,closed_at,payment_method,tables(name)" + filter);
  } catch (e) {
    // payment_method kolonu henüz yoksa onsuz çek
    rows = await sb("/orders?select=total,closed_at,tables(name)" + filter);
  }

  const bills = (rows || []).map((o) => ({
    table: o.tables ? o.tables.name : "—",
    closed_at: o.closed_at,
    total: Number(o.total || 0),
    payment: o.payment_method || "",
  }));
  const total = bills.reduce((s, b) => s + b.total, 0);
  const byMethod = { nakit: 0, kart: 0, diger: 0, belirsiz: 0 };
  bills.forEach((b) => {
    const m = (b.payment || "").toLowerCase();
    if (m === "nakit") byMethod.nakit += b.total;
    else if (m === "kart") byMethod.kart += b.total;
    else if (m) byMethod.diger += b.total;
    else byMethod.belirsiz += b.total;
  });
  return json(200, { count: bills.length, total: total, byMethod: byMethod, bills: bills });
};
