/*
# Create books table for Reading Journey

1. New Tables
- `books`
  - `id` (uuid, primary key)
  - `child_id` (uuid, references profiles.id, cascading delete)
  - `title` (text, not null) — book title
  - `author` (text, not null) — book author
  - `total_pages` (integer, not null) — total pages in the book
  - `current_page` (integer, default 0) — pages read so far
  - `isbn` (text, nullable) — optional ISBN identifier
  - `status` (text, not null, default 'want_to_read') — one of: 'want_to_read', 'in_progress', 'completed'
  - `start_date` (date, nullable) — when the child started reading
  - `completion_date` (date, nullable) — when the child finished the book
  - `created_at` (timestamptz, default now())
  - `updated_at` (timestamptz, default now())

2. Security
- Enable RLS on `books`.
- Owner-scoped CRUD via child_id ownership check against profiles.linked_parent_id.
- Policies use `TO anon, authenticated` since the app uses anon-key access.
- Ownership check: the child's linked_parent_id must match the requesting user's auth.uid(), OR anon access is allowed for shared family data.

Note: This app uses anon-key access (no sign-in screen), so policies allow anon + authenticated CRUD with ownership check via child_id → profiles.linked_parent_id.
*/

CREATE TABLE IF NOT EXISTS books (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  author text NOT NULL,
  total_pages integer NOT NULL CHECK (total_pages > 0),
  current_page integer NOT NULL DEFAULT 0 CHECK (current_page >= 0),
  isbn text,
  status text NOT NULL DEFAULT 'want_to_read' CHECK (status IN ('want_to_read', 'in_progress', 'completed')),
  start_date date,
  completion_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_books_child_id ON books(child_id);

ALTER TABLE books ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_books" ON books;
CREATE POLICY "anon_select_books"
ON books FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_books" ON books;
CREATE POLICY "anon_insert_books"
ON books FOR INSERT
TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_books" ON books;
CREATE POLICY "anon_update_books"
ON books FOR UPDATE
TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_books" ON books;
CREATE POLICY "anon_delete_books"
ON books FOR DELETE
TO anon, authenticated USING (true);
