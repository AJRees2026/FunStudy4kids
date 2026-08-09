/*
# Add Guardian Security Settings to Profiles

1. New Columns on `profiles`
- `require_pin_for_tasks` (boolean, default true) — when ON, completing a task
  requires the guardian PIN before points are awarded.
- `require_pin_for_rewards` (boolean, default true) — when ON, redeeming a
  reward in the Reward Shop requires the guardian PIN before points are spent.

2. Security
- No new tables. RLS already enabled on `profiles`.
- No policy changes needed — existing anon/authenticated policies cover the
  new columns.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'require_pin_for_tasks'
  ) THEN
    ALTER TABLE profiles ADD COLUMN require_pin_for_tasks boolean NOT NULL DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'require_pin_for_rewards'
  ) THEN
    ALTER TABLE profiles ADD COLUMN require_pin_for_rewards boolean NOT NULL DEFAULT true;
  END IF;
END $$;
