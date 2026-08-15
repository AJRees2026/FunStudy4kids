/*
# Add book cover photo support

1. New Storage Bucket
- `book-covers` — public bucket for storing book cover photos uploaded by kids.

2. Storage Policies
- SELECT (read) — anon + authenticated can read from book-covers bucket.
- INSERT (upload) — anon + authenticated can upload to book-covers bucket.
- UPDATE — anon + authenticated can update files in book-covers bucket.
- DELETE — anon + authenticated can delete files in book-covers bucket.

3. Schema Changes
- `books` table: add `cover_url` (text, nullable) column to store the public URL of the uploaded cover photo.

4. Security
- All storage policies scoped to the `book-covers` bucket_id.
- No auth required (anon-key app pattern, same as avatars bucket).
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('book-covers', 'book-covers', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "anon_read_book_covers" ON storage.objects;
CREATE POLICY "anon_read_book_covers" ON storage.objects
  FOR SELECT TO anon, authenticated USING (bucket_id = 'book-covers');

DROP POLICY IF EXISTS "anon_upload_book_covers" ON storage.objects;
CREATE POLICY "anon_upload_book_covers" ON storage.objects
  FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'book-covers');

DROP POLICY IF EXISTS "anon_update_book_covers" ON storage.objects;
CREATE POLICY "anon_update_book_covers" ON storage.objects
  FOR UPDATE TO anon, authenticated USING (bucket_id = 'book-covers')
  WITH CHECK (bucket_id = 'book-covers');

DROP POLICY IF EXISTS "anon_delete_book_covers" ON storage.objects;
CREATE POLICY "anon_delete_book_covers" ON storage.objects
  FOR DELETE TO anon, authenticated USING (bucket_id = 'book-covers');

ALTER TABLE books ADD COLUMN IF NOT EXISTS cover_url text;
