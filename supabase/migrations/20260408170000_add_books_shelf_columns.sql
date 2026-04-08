ALTER TABLE books
  ADD COLUMN IF NOT EXISTS shelf_order integer,
  ADD COLUMN IF NOT EXISTS shelf_orientation text;
