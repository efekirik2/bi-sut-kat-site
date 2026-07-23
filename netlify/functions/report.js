const { sb, requireUser, json } = require("./lib/supabase");

// GET (girişli): belirli tarih aralığında kapatılan hesapların özeti + listesi
// ?from=<ISO>&to=<ISO>  (verilmezse tüm kapatılan hesaplar)
exports.handler = async (event, context) => {
  const user = requireUser(context);
  if (!user) return json(401, { error: "Giriş yapmanız gerekiyor." });
  if (event.httpMethod !== "GET") return json(405, { error: "Yöntem desteklenmiyor." });

  const q = event.queryStringParameters || {};
  let path = "/orders?select=total,closed_at,tables(name)&status=eq.closed&order=closed_at.desc";
  if (q.from) path += "&closed_at=gte." + encodeURIComponent(q.from);
  if (q.to) path += "&closed_at=lt." + encodeURIComponent(q.to);

  const rows = await sb(path);
  const bills = (rows || []).map((o) => ({
    table: o.tables ? o.tables.name : "—",
    closed_at: o.closed_at,
    total: Number(o.total || 0),
  }));
  const total = bills.reduce((s, b) => s + b.total, 0);
  return json(200, { count: bills.length, total: total, bills: bills });
};
