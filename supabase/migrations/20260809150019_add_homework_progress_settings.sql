/*
# Homework Progress Settings

1. Modified Tables
- `profiles`: Adds four columns for homework progress settings:
  * `progress_display_mode` text: 'percentage' | 'task_count' | 'theme_gauge' (default 'percentage')
  * `active_subjects` jsonb: array of enabled subject strings (default all six)
  * `daily_cutoff_time` text: HH:MM format (default '18:00')
  * `auto_archive_daily` boolean: auto-archive completed tasks each morning (default false)

2. Security
- No new tables. Existing RLS policies on `profiles` cover these columns.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'progress_display_mode'
  ) THEN
    ALTER TABLE profiles ADD COLUMN progress_display_mode text NOT NULL DEFAULT 'percentage'
      CHECK (progress_display_mode IN ('percentage', 'task_count', 'theme_gauge'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'active_subjects'
  ) THEN
    ALTER TABLE profiles ADD COLUMN active_subjects jsonb NOT NULL DEFAULT
      '["Math","Reading","Science","History","Foreign Languages","Art"]'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'daily_cutoff_time'
  ) THEN
    ALTER TABLE profiles ADD COLUMN daily_cutoff_time text NOT NULL DEFAULT '18:00';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'auto_archive_daily'
  ) THEN
    ALTER TABLE profiles ADD COLUMN auto_archive_daily boolean NOT NULL DEFAULT false;
  END IF;
END $$;
