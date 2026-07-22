-- Bi Üst Kat — Menü verisini Supabase'e taşıma şeması
-- Supabase SQL Editor'de çalıştırın (bir kez).

create table if not exists menu_categories (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  position int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists menu_items (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references menu_categories(id) on delete cascade,
  name text not null,
  description text,
  price text not null,          -- "₺260" gibi metin (mevcut format korunur)
  position int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists featured_dishes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price text not null,
  image text,
  position int not null default 0,
  created_at timestamptz not null default now()
);

alter table menu_categories enable row level security;
alter table menu_items enable row level security;
alter table featured_dishes enable row level security;
-- Policy yok: sadece service_role (Netlify Functions) erişir.

-- Menüyü tek işlemde (transaction) güvenle değiştiren fonksiyon.
-- Panelden "Kaydet" deyince tüm menü bu payload ile değiştirilir.
create or replace function replace_menu(data jsonb)
returns void
language plpgsql
as $$
declare
  cat jsonb;
  itm jsonb;
  feat jsonb;
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
      insert into menu_items(category_id, name, description, price, position)
      values (
        new_cat_id,
        coalesce(itm->>'name',''),
        itm->>'desc',
        coalesce(itm->>'price',''),
        ii
      );
      ii := ii + 1;
    end loop;

    ci := ci + 1;
  end loop;
end;
$$;
