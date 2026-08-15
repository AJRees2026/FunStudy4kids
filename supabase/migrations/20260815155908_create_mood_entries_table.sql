/*
# Create mood_entries table for Mood-of-the-Day Tracker

1. New Tables
- `mood_entries`
  - `id` (uuid, primary key)
  - `child_id` (uuid, references profiles.id, cascading delete)
  - `entry_date` (date, not null) — the calendar day this mood is for
  - `mood` (text, not null) — one of: 'super_happy', 'good', 'okay', 'sad', 'frustrated'
  - `note` (text, nullable) — optional short journal note
  - `created_at` (timestamptz, default now())
  - `updated_at` (timestamptz, default now())
  - UNIQUE (child_id, entry_date) — one mood per child per day

2. Security
- Enable RLS on `mood_entries`.
- Policies use `TO anon, authenticated` with `USING (true)` / `WITH CHECK (true)`
  because this is a single-tenant demo app with no sign-in — all data is intentionally shared,
  matching the pattern used by books, tasks, and rewards tables.

3. Indexes
- Index on (child_id, entry_date) for fast monthly grid queries.
*/

CREATE TABLE IF NOT EXISTS mood_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  entry_date date NOT NULL,
  mood text NOT NULL CHECK ( IN ('super_happy', 'good', 'okay', 'sad', 'frustrated')),
  note text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (child_id, entry_date)
);

CREATE INDEX IF NOT EXISTS idx_mood_entries_child_date ON mood_entries(child_id, entry_date);

ALTER TABLE mood_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_mood_entries" ON mood_entries;
CREATE POLICY "anon_select_mood_entries"
ON mood_entries FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_mood_entries" ON mood_entries;
CREATE POLICY "anon_insert_mood_entries"
ON mood_entries FOR INSERT
TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_mood_entries" ON mood_entries;
CREATE POLICY "anon_update_mood_entries"
ON mood_entries FOR UPDATE
TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_mood_entries" ON mood_entries;
CREATE POLICY "anon_delete_mood_entries"
ON mood_entries FOR DELETE
TO anon, authenticated USING (true);