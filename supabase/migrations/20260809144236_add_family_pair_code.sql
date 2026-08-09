/*
# Add Family Pair Code and Linked Parent to Profiles

1. Modified Tables
- `profiles`: Adds `family_pair_code` (text, unique pair code for linking
  child to parent) and `linked_parent_id` (uuid, FK to profiles.id for the
  parent this child is linked to).

2. Security
- No new tables. RLS already enabled on `profiles`.
- No policy changes needed — existing anon/authenticated policies cover
  the new columns.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'family_pair_code'
  ) THEN
    ALTER TABLE profiles ADD COLUMN family_pair_code text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'linked_parent_id'
  ) THEN
    ALTER TABLE profiles ADD COLUMN linked_parent_id uuid REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_profiles_family_pair_code ON profiles(family_pair_code);
