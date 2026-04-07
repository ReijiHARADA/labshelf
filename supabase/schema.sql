create table if not exists public.books (
  id text primary key,
  isbn text not null unique,
  title text not null,
  subtitle text,
  author text not null,
  publisher text not null default '',
  published_year integer not null,
  category text not null default '未分類',
  tags text[] not null default '{}',
  description text,
  toc text,
  cover_image_url text,
  recommended boolean not null default false,
  latest_flag boolean not null default false,
  popularity_score integer not null default 50,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  memo text,
  borrowed_by text,
  borrowed_at timestamptz,
  due_date date,
  loan_memo text
);

create table if not exists public.categories (
  name text primary key,
  created_at timestamptz not null default now(),
  color text
);

create index if not exists books_category_idx on public.books (category);
create index if not exists books_updated_at_idx on public.books (updated_at desc);
