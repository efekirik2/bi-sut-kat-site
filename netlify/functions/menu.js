const { sb, requireUser, json } = require("./lib/supabase");

// GET  -> herkese açık: menüyü menu.json biçiminde döndürür (müşteri sitesi okur)
// PUT  -> girişli: tüm menüyü gelen JSON ile değiştirir (panelden kaydet)
exports.handler = async (event, context) => {
  if (event.httpMethod === "GET") {
    const [featured, cats, items] = await Promise.all([
      sb("/featured_dishes?select=name,description,price,image&order=position.asc"),
      sb("/menu_categories?select=id,title&order=position.asc"),
      sb("/menu_items?select=category_id,name,description,price,image&order=position.asc"),
    ]);
    const categories = (cats || []).map((c) => ({
      title: c.title,
      items: (items || [])
        .filter((i) => i.category_id === c.id)
        .map((i) => ({ name: i.name, desc: i.description || "", price: i.price, image: i.image || "" })),
    }));
    const featuredOut = (featured || []).map((f) => ({
      name: f.name,
      desc: f.description || "",
      price: f.price,
      image: f.image || "",
    }));
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      body: JSON.stringify({ featured: featuredOut, categories }),
    };
  }

  // Yazma işlemleri giriş ister
  const user = requireUser(context);
  if (!user) return json(401, { error: "Giriş yapmanız gerekiyor." });

  if (event.httpMethod === "PUT") {
    const body = JSON.parse(event.body || "{}");
    const data = {
      featured: Array.isArray(body.featured) ? body.featured : [],
      categories: Array.isArray(body.categories) ? body.categories : [],
    };
    await sb("/rpc/replace_menu", {
      method: "POST",
      body: JSON.stringify({ data: data }),
    });
    return json(200, { ok: true });
  }

  return json(405, { error: "Yöntem desteklenmiyor." });
};
