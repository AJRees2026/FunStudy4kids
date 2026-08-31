/*
# Add birthday column to profiles

1. Modified Tables
- `profiles`: adds `birthday` column (date, nullable) to store each child's date of birth.
2. Security
- No RLS policy changes. Existing policies on `profiles` already cover the new column.
3. Important Notes
- The column is nullable so existing rows are unaffected.
- No data is lost; this is a purely additive change.
*/

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS birthday date;
