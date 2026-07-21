// URL sonundaki fazladan '/rest/v1' veya '/' varsa temizle; anahtardaki
// boşluk/satır sonlarını at (yanlış kopyalamalara karşı toleranslı olsun).
const SUPABASE_URL = (process.env.SUPABASE_URL || "")
  .trim()
  .replace(/\/+$/, "")
  .replace(/\/rest\/v1$/, "");
const SERVICE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();

async function sb(path, options = {}) {
  const res = await fetch(SUPABASE_URL + "/rest/v1" + path, {
    ...options,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: "Bearer " + SERVICE_KEY,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error("Supabase " + (options.method || "GET") + " " + path + " failed: " + res.status + " " + body);
  }
  if (res.status === 204) return null;
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

function requireUser(context) {
  return (context.clientContext && context.clientContext.user) || null;
}

function json(statusCode, data) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  };
}

function checkEnv() {
  if (!SUPABASE_URL) return "SUPABASE_URL ortam değişkeni tanımlı değil.";
  if (!SERVICE_KEY) return "SUPABASE_SERVICE_ROLE_KEY ortam değişkeni tanımlı değil.";
  return null;
}

function wrap(handler) {
  return async (event, context) => {
    const envError = checkEnv();
    if (envError) return json(500, { error: envError });
    try {
      return await handler(event, context);
    } catch (err) {
      return json(500, { error: String((err && err.message) || err) });
    }
  };
}

module.exports = { sb, requireUser, json, wrap };
