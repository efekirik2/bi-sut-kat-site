// Yerel geliştirme sunucusu — sıfır bağımlılık (sadece Node yerleşik modülleri).
// Çalıştır:  node --env-file=.env dev-server.js
// Sonra:     http://localhost:8888/admin/masalar.html
//
// Bu sunucu SADECE yereldir. Netlify Functions'ı taklit eder ve auth kapısını
// geçmek için sahte bir "giriş yapmış kullanıcı" enjekte eder (yalnızca yerelde).

const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const FUNCTIONS_DIR = path.join(ROOT, "netlify", "functions");
const PORT = process.env.PORT || 8888;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
  ".gif": "image/gif", ".svg": "image/svg+xml", ".ico": "image/x-icon",
  ".webp": "image/webp", ".xml": "application/xml", ".txt": "text/plain; charset=utf-8",
};

function readBody(req) {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => resolve(data));
  });
}

const FN_PREFIX = "/.netlify/functions/";

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  const pathname = decodeURIComponent(url.pathname);

  // --- Netlify Functions yönlendirmesi ---
  if (pathname.startsWith(FN_PREFIX)) {
    const fnName = pathname.slice(FN_PREFIX.length).split("/")[0];
    const fnPath = path.join(FUNCTIONS_DIR, fnName + ".js");
    if (!fnPath.startsWith(FUNCTIONS_DIR) || !fs.existsSync(fnPath)) {
      res.writeHead(404, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "Fonksiyon bulunamadı: " + fnName }));
    }
    try {
      delete require.cache[require.resolve(fnPath)]; // her istekte taze yükle (hot reload)
      const mod = require(fnPath);
      const body = await readBody(req);
      const qs = {};
      url.searchParams.forEach((v, k) => (qs[k] = v));
      const event = { httpMethod: req.method, headers: req.headers, body: body || null, queryStringParameters: qs };
      // YEREL: auth kapısını geçmek için sahte kullanıcı (sadece dev sunucusunda)
      const context = { clientContext: { user: { sub: "local-dev", email: "dev@local" } } };
      const result = await mod.handler(event, context);
      res.writeHead(result.statusCode || 200, result.headers || { "Content-Type": "application/json" });
      return res.end(result.body || "");
    } catch (e) {
      res.writeHead(500, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: String((e && e.message) || e) }));
    }
  }

  // --- Statik dosyalar ---
  let rel = pathname === "/" ? "/index.html" : pathname;
  let filePath = path.join(ROOT, rel);
  if (!filePath.startsWith(ROOT)) { res.writeHead(403); return res.end("Yasak"); }
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, "index.html");
  }
  if (!fs.existsSync(filePath)) { res.writeHead(404); return res.end("Bulunamadı: " + pathname); }
  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(PORT, () => {
  const keyLen = process.env.SUPABASE_SERVICE_ROLE_KEY ? process.env.SUPABASE_SERVICE_ROLE_KEY.length : 0;
  console.log("");
  console.log("  Yerel sunucu calisiyor:  http://localhost:" + PORT);
  console.log("  Masalar paneli:          http://localhost:" + PORT + "/admin/masalar.html");
  console.log("");
  console.log("  SUPABASE_URL:              " + (process.env.SUPABASE_URL || "TANIMSIZ (.env doldur)"));
  console.log("  SUPABASE_SERVICE_ROLE_KEY: " + (keyLen ? keyLen + " karakter" : "TANIMSIZ (.env doldur)"));
  console.log("");
  console.log("  Durdurmak icin Ctrl+C");
});
