/*
# Add reward_id to tasks for task-reward linking

1. Modified Tables
- `tasks`: Adds `reward_id` uuid column (nullable) referencing rewards(id).
  When set, the child sees a glowing reward badge on that task card.

2. Security
- No new tables. Existing RLS policies on `tasks` cover this column.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'reward_id'
  ) THEN
    ALTER TABLE tasks ADD COLUMN reward_id uuid REFERENCES rewards(id) ON DELETE SET NULL;
  END IF;
END $$;
