/*
# Create book_reflections table for "I Write My Book" feature

1. New Tables
- `book_reflections`
  - `id` (uuid, primary key)
  - `child_id` (uuid, references profiles.id, cascading delete)
  - `book_title` (text, not null) — title of the book being reflected on
  - `character` (text, nullable) — a character from the book
  - `genre` (text, nullable) — genre category, e.g. "Fantasy & Adventure", "Reality - Family & School", "Comedy"
  - `start_date` (date, nullable) — when the child started the reflection/writing
  - `end_date` (date, nullable) — when the child finished the reflection
  - `reflection_text` (text, not null) — the written reflection content
  - `word_count` (integer, not null, default 0) — number of words in the reflection
  - `status` (text, not null, default 'draft') — 'draft' or 'approved'
  - `created_at` (timestamptz, default now())
  - `updated_at` (timestamptz, default now())

2. Modified Tables
- `profiles`
  - `writing_rank` (text, nullable) — the child's highest unlocked writing rank, e.g. "junior_author", "storyteller", "master_storyteller", "master_wordsmith", "grand_chronicler", "epic_author"

3. Security
- Enable RLS on `book_reflections`.
- Anon + authenticated CRUD (same pattern as books table — no sign-in screen, anon-key access).
- Ownership is managed at the application level via child_id.

Note: This app uses anon-key access (no sign-in screen), so policies allow anon + authenticated CRUD.
*/

CREATE TABLE IF NOT EXISTS book_reflections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  book_title text NOT NULL,
  character text,
  genre text,
  start_date date,
  end_date date,
  reflection_text text NOT NULL DEFAULT '',
  word_count integer NOT NULL DEFAULT 0 CHECK (word_count >= 0),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_book_reflections_child_id ON book_reflections(child_id);

ALTER TABLE book_reflections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_book_reflections" ON book_reflections;
CREATE POLICY "anon_select_book_reflections"
ON book_reflections FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_book_reflections" ON book_reflections;
CREATE POLICY "anon_insert_book_reflections"
ON book_reflections FOR INSERT
TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_book_reflections" ON book_reflections;
CREATE POLICY "anon_update_book_reflections"
ON book_reflections FOR UPDATE
TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_book_reflections" ON book_reflections;
CREATE POLICY "anon_delete_book_reflections"
ON book_reflections FOR DELETE
TO anon, authenticated USING (true);

-- Add writing_rank column to profiles
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'writing_rank'
  ) THEN
    ALTER TABLE profiles ADD COLUMN writing_rank text;
  END IF;
END $$;
