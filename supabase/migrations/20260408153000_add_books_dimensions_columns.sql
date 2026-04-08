-- Add physical book size columns for shelf rendering.
ALTER TABLE books
  ADD COLUMN IF NOT EXISTS physical_height_mm numeric,
  ADD COLUMN IF NOT EXISTS physical_width_mm numeric,
  ADD COLUMN IF NOT EXISTS physical_thickness_mm numeric,
  ADD COLUMN IF NOT EXISTS page_count integer,
  ADD COLUMN IF NOT EXISTS dimensions_source text,
  ADD COLUMN IF NOT EXISTS dimensions_manual boolean DEFAULT false;
