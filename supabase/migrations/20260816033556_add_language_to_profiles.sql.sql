/*
# Add language preference to profiles

1. Changes
- Add `language` text column to `profiles` table, defaulting to 'en-US'.
- This stores each user's UI language preference (e.g. 'en-US', 'ko-KR').
- Guardians pick their language at signup; children inherit their guardian's language when linking.

2. Security
- No RLS policy changes — existing policies on `profiles` already cover the new column.
*/

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'en-US';
