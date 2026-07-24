-- Bi Üst Kat — Hesap kapatırken ödeme yöntemi (nakit/kart/diğer)
-- Supabase SQL Editor'de bir kez çalıştırın.

alter table orders add column if not exists payment_method text;
