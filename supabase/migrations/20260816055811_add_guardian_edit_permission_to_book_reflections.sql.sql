/*
# Add guardian edit permission to book reflections

1. Modified Tables
- `book_reflections`
  - `allow_guardian_edit` (boolean, not null, default false) — whether the child has granted the guardian permission to edit this book
  - `edit_request_status` (text, nullable, check in 'pending'|'approved'|'denied') — status of a guardian's request to edit when permission was not granted

2. Flow
- Child saves a book reflection and can toggle "allow guardian to edit".
- Guardian views the book (always visible). If allow_guardian_edit is true, guardian can edit directly.
- If false, guardian can request edit access (edit_request_status = 'pending').
- Child sees the pending request and can approve (sets allow_guardian_edit = true, edit_request_status = 'approved') or deny (edit_request_status = 'denied').

3. Security
- No RLS policy changes — existing anon+authenticated CRUD policies on book_reflections remain.
*/

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'book_reflections' AND column_name = 'allow_guardian_edit'
  ) THEN
    ALTER TABLE book_reflections ADD COLUMN allow_guardian_edit boolean NOT NULL DEFAULT false;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'book_reflections' AND column_name = 'edit_request_status'
  ) THEN
    ALTER TABLE book_reflections ADD COLUMN edit_request_status text CHECK (edit_request_status IN ('pending', 'approved', 'denied'));
  END IF;
END $$;
