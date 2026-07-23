-- Bi Üst Kat — Masa sıralama (panelden sürükleme/ok ile)
-- Supabase SQL Editor'de bir kez çalıştırın.

-- Masalara sıra bilgisi
alter table tables add column if not exists position int not null default 0;

-- Verilen id sırasına göre masaların position'ını günceller
create or replace function reorder_tables(ids uuid[])
returns void
language plpgsql
as $$
declare
  i int;
begin
  for i in 1 .. coalesce(array_length(ids, 1), 0) loop
    update tables set position = i where id = ids[i];
  end loop;
end;
$$;
