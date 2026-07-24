# Bi Üst Kat Gümüşlük — Restoran Sitesi + POS Panel

Gümüşlük/Bodrum'daki **Bi Üst Kat** kebap restoranının web sitesi ve personel yönetim paneli.
Müşterilere yönelik lüks bir tanıtım sitesi + personelin masaları, siparişleri, menüyü ve
günlük satışları yönettiği bir POS panelinden oluşur.

**Canlı:** https://biustkatgumusluk.netlify.app

---

## Ne var?

| Bölüm | Adres | Kime |
|-------|-------|------|
| Müşteri sitesi | `/` | Müşteriler (menü, foto, iletişim, harita) |
| Personel girişi | `/personel.html` | Personel (giriş noktası) |
| Yönetim paneli (POS) | `/admin/masalar.html` | Personel (masa/sipariş/menü/rapor) |

> **Gizli personel erişimi:** Müşteri sitesinde header'daki **logoya 5 kez** dokunmak
> `/personel.html`'e götürür. Müşteriler için görünür bir link yoktur.

### Panel özellikleri
- **Ana Sayfa** — masalarda açık adisyon tutarı, bugünkü satış, toplam masa
- **Masalar** — masa ekle/sil, siparişe ürün ekle (o siparişe özel fiyat girilebilir),
  hesap kapat, filtre (Tümü/Dolu/Boş), **⇄ Sırala** modu (masaları ok tuşlarıyla diz)
- **Menü Düzenle** — öne çıkanları ve kategorileri/ürünleri düzenle → Supabase'e **anında** yazar
- **Gün Sonu** — seçilen tarihte kapatılan hesapların toplamı ve listesi

---

## Teknoloji

- **Ön yüz:** Tek dosyalık statik HTML + inline CSS/JS. Build adımı yok.
- **Barındırma:** Netlify (GitHub `main`'e push → otomatik deploy).
- **Veritabanı:** Supabase (Postgres). Menü + masalar + siparişler burada.
- **Sunucu tarafı:** Netlify Functions (`netlify/functions/`) — Supabase'e `service_role`
  anahtarıyla bağlanır. Anahtar asla tarayıcıya gitmez.
- **Kimlik:** Netlify Identity (panel girişi). Yerelde atlanır (bkz. Yerel Geliştirme).

---

## Dosya yapısı

```
bi-sut-kat-site/
├── index.html            # Müşteri sitesi (menüyü /menu fonksiyonundan okur)
├── personel.html         # Personel giriş sayfası (hub)
├── admin/
│   └── masalar.html      # POS panel (Ana Sayfa, Masalar, Menü, Gün Sonu)
├── content/menu.json     # YEDEK menü (asıl kaynak Supabase)
├── image/                # Logo ve yemek fotoğrafları
├── netlify/functions/
│   ├── lib/supabase.js   # Ortak Supabase yardımcıları
│   ├── tables.js         # GET(liste+sıra) / POST(ekle) / PATCH(sırala) / DELETE
│   ├── order-items.js    # POST(ürün ekle) / PATCH(fiyat-adet) / DELETE
│   ├── order-close.js    # POST(hesap kapat: total + closed_at yazar)
│   ├── menu.js           # GET(herkese açık menü) / PUT(girişli, menüyü değiştir)
│   └── report.js         # GET(girişli: tarih aralığında kapatılan hesaplar)
├── supabase/
│   ├── schema.sql        # tables, orders, order_items
│   ├── menu-schema.sql   # menu_categories, menu_items, featured_dishes + replace_menu()
│   └── tables-order.sql  # tables.position kolonu + reorder_tables()
├── dev-server.js         # Yerel sunucu (statik + fonksiyonlar), sıfır bağımlılık
├── baslat.bat            # Çift tıkla yerel sunucuyu başlat
├── netlify.toml          # Netlify yapılandırması
├── .env                  # GİZLİ (gitignore'da): Supabase URL + service_role
└── .env.example          # .env için şablon
```

---

## Kurulum (sıfırdan)

### 1) Supabase
1. [supabase.com](https://supabase.com)'da proje aç.
2. **SQL Editor**'de sırayla çalıştır:
   1. `supabase/schema.sql` (masalar/siparişler)
   2. `supabase/menu-schema.sql` (menü)
   3. `supabase/tables-order.sql` (masa sıralama)
3. **Settings → API**'den şunları al: **Project URL** ve **`service_role` (secret)** anahtarı.

### 2) Ortam değişkenleri
| Değişken | Değer |
|----------|-------|
| `SUPABASE_URL` | Supabase Project URL (ör. `https://xxxx.supabase.co`) |
| `SUPABASE_SERVICE_ROLE_KEY` | `service_role` (secret) anahtarı — **anon değil** |

- **Yerelde:** `.env.example`'ı `.env` olarak kopyala, değerleri doldur. (`.env` git'e girmez.)
- **Netlify'da:** Site configuration → Environment variables → ikisini ekle.

### 3) Netlify Identity (panel girişi)
Netlify → **Identity**'yi etkinleştir, personel için kullanıcı davet et.

---

## Yerel geliştirme

Gerektiren: Node.js (18+).

```bash
node --env-file=.env dev-server.js
```
veya Windows'ta **`baslat.bat`**'a çift tıkla. Sonra:

- Müşteri sitesi: http://localhost:8888
- Panel: http://localhost:8888/admin/masalar.html

Yerelde çalışırken:
- **Netlify Identity atlanır** — panele giriş yapmadan girersin (dev-server sahte kullanıcı verir).
- Fonksiyonlar her istekte taze yüklenir; kod değiştirince sadece sayfayı yenile.
- Yerel de **aynı** Supabase veritabanını kullanır (girdiğin veriler gerçektir).

---

## Menü nasıl güncellenir?

Panelde **Menü Düzenle** → değiştir → **Kaydet**. Değişiklik Supabase'e yazılır ve hem müşteri
sitesinde hem panelde anında görünür (deploy beklemeden). `content/menu.json` yalnızca, menü
fonksiyonuna ulaşılamazsa devreye giren bir **yedektir**.

Menü okuma sırası (site ve panel): `/.netlify/functions/menu` → `content/menu.json` → gömülü yedek.

---

## Notlar
- Bir masayı silmek, o masanın geçmiş kapatılmış hesaplarını da siler (cascade) — gün sonu
  raporundan düşer. Servis sırasında masa silmekten kaçının.
- `service_role` anahtarı tüm veritabanına erişir; gizli tutun, sızarsa Supabase'den yenileyin (rotate).
