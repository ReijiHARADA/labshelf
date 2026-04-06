-- 既存DB向け: categories にユーザー指定色を保存する列を追加
alter table public.categories add column if not exists color text;
