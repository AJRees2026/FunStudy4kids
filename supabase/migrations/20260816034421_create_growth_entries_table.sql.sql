/*
# Create growth_entries table for tracking child height and weight

1. New Tables
- `growth_entries`
  - `id` (uuid, primary key, auto-generated)
  - `child_id` (uuid, foreign key to profiles.id, ON DELETE CASCADE)
  - `recorded_at` (date, defaults to today — when the measurement was taken)
  - `height_cm` (numeric, nullable — height in centimeters)
  - `weight_kg` (numeric, nullable — weight in kilograms)
  - `notes` (text, nullable — optional notes)
  - `created_at` (timestamptz, defaults to now — when the entry was created in the app)

2. Security
- Enable RLS on `growth_entries`.
- Add 4 policies (SELECT/INSERT/UPDATE/DELETE) scoped to `anon, authenticated` — consistent with all other tables in this no-auth app.
- Uses `USING (true)` / `WITH CHECK (true)` matching the existing pattern across all tables (profiles, tasks, rewards, books, mood_entries, etc.) where the anon-key frontend manages all data.

3. Indexes
- Index on `child_id` for efficient lookups per child.
- Index on `recorded_at` for date-range queries.
*/

CREATE TABLE IF NOT EXISTS growth_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recorded_at date NOT NULL DEFAULT CURRENT_DATE,
  height_cm numeric,
  weight_kg numeric,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE growth_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_growth_entries" ON growth_entries;
CREATE POLICY "anon_select_growth_entries" ON growth_entries FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_growth_entries" ON growth_entries;
CREATE POLICY "anon_insert_growth_entries" ON growth_entries FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_growth_entries" ON growth_entries;
CREATE POLICY "anon_update_growth_entries" ON growth_entries FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_growth_entries" ON growth_entries;
CREATE POLICY "anon_delete_growth_entries" ON growth_entries FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_growth_entries_child_id ON growth_entries(child_id);
CREATE INDEX IF NOT EXISTS idx_growth_entries_recorded_at ON growth_entries(recorded_at);
