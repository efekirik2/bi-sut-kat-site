-- Bi Üst Kat — Menü & site fotoğrafları güncellemesi
-- Bu dosyayı Supabase projenizde SQL Editor'e yapıştırıp BİR KEZ çalıştırın.
-- Var olan menü verisini SİLMEZ; sadece foto desteği ekler.

-- 1) Menü ürünlerine fotoğraf kolonu (öne çıkanlarda zaten image vardı,
--    kategori ürünlerine de ekliyoruz). Data URL (base64) da saklayabilsin diye text.
alter table menu_items add column if not exists image text;

-- 2) Site görselleri (hero arka planı, manzara görseli, logo) için basit
--    anahtar-değer tablosu. Değerler görsel yolu ya da base64 data URL olabilir.
create table if not exists site_settings (
  key text primary key,
  value text
);
alter table site_settings enable row level security;
-- Kasıtlı olarak policy yok: anon/public kapalı, sadece Netlify Functions
-- (service_role) okuyup yazar. Genel site okuması settings fonksiyonu üzerinden.

-- 3) replace_menu fonksiyonunu, kategori ürünlerinin fotoğrafını da
--    kaydedecek şekilde güncelle. Panelden "Kaydet" bu fonksiyonu çağırır.
create or replace function replace_menu(data jsonb)
returns void
language plpgsql
security definer
as $$
declare
  f          jsonb;
  c          jsonb;
  it         jsonb;
  new_cat_id uuid;
  pos        int;
  ipos       int;
begin
  -- Önce her şeyi temizle (kategori silinince ürünler cascade ile gider,
  -- yine de garanti olsun diye açıkça siliyoruz).
  delete from menu_items;
  delete from menu_categories;
  delete from featured_dishes;

  -- Öne çıkan lezzetler
  pos := 0;
  for f in select * from jsonb_array_elements(coalesce(data->'featured', '[]'::jsonb))
  loop
    insert into featured_dishes (name, description, price, image, position)
    values (
      nullif(f->>'name', ''),
      f->>'desc',
      f->>'price',
      f->>'image',
      pos
    );
    pos := pos + 1;
  end loop;

  -- Kategoriler ve ürünleri
  pos := 0;
  for c in select * from jsonb_array_elements(coalesce(data->'categories', '[]'::jsonb))
  loop
    insert into menu_categories (title, position)
    values (c->>'title', pos)
    returning id into new_cat_id;

    ipos := 0;
    for it in select * from jsonb_array_elements(coalesce(c->'items', '[]'::jsonb))
    loop
      insert into menu_items (category_id, name, description, price, image, position)
      values (
        new_cat_id,
        it->>'name',
        it->>'desc',
        it->>'price',
        it->>'image',
        ipos
      );
      ipos := ipos + 1;
    end loop;

    pos := pos + 1;
  end loop;
end;
$$;
