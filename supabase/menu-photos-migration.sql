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
--    ÖNEMLİ: DELETE'ler "where true" ile yazılır — Supabase WHERE'siz DELETE'i
--    reddeder ("DELETE requires a WHERE clause"). Orijinal şemadaki kalıp korunur;
--    tek fark: menu_items insert'ine "image" kolonu eklendi.
create or replace function replace_menu(data jsonb)
returns void
language plpgsql
as $$
declare
  cat        jsonb;
  itm        jsonb;
  feat       jsonb;
  new_cat_id uuid;
  ci int := 0;
  ii int;
  fi int := 0;
begin
  delete from menu_items where true;
  delete from menu_categories where true;
  delete from featured_dishes where true;

  for feat in select * from jsonb_array_elements(coalesce(data->'featured', '[]'::jsonb)) loop
    insert into featured_dishes(name, description, price, image, position)
    values (
      coalesce(feat->>'name',''),
      feat->>'desc',
      coalesce(feat->>'price',''),
      feat->>'image',
      fi
    );
    fi := fi + 1;
  end loop;

  for cat in select * from jsonb_array_elements(coalesce(data->'categories', '[]'::jsonb)) loop
    insert into menu_categories(title, position)
    values (coalesce(cat->>'title',''), ci)
    returning id into new_cat_id;

    ii := 0;
    for itm in select * from jsonb_array_elements(coalesce(cat->'items', '[]'::jsonb)) loop
      insert into menu_items(category_id, name, description, price, image, position)
      values (
        new_cat_id,
        coalesce(itm->>'name',''),
        itm->>'desc',
        coalesce(itm->>'price',''),
        itm->>'image',
        ii
      );
      ii := ii + 1;
    end loop;

    ci := ci + 1;
  end loop;
end;
$$;
