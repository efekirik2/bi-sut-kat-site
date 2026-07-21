const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

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

module.exports = { sb, requireUser, json };
