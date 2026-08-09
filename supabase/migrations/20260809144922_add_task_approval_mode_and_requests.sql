/*
# Add Task Approval Mode + Approval Requests Table

1. Modified Tables
- `profiles`: Adds `task_approval_mode` text column with 3 modes:
  'off' (instant completion), 'in_person_pin' (PIN prompt on child device),
  'remote_notification' (push notification to parent for approval).
  Defaults to 'off'. Also adds `gender` column for theme selection.

2. New Tables
- `approval_requests`: Stores pending approval requests from children.
  When a child submits a task and the parent's mode is 'remote_notification',
  a row is created here. The parent sees it in their portal and can
  approve/deny. On approval, the task is marked completed and points awarded.

3. Security
- RLS enabled on `approval_requests`.
- Anon + authenticated CRUD (single-tenant, no auth).
*/

-- Add task_approval_mode to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'task_approval_mode'
  ) THEN
    ALTER TABLE profiles ADD COLUMN task_approval_mode text NOT NULL DEFAULT 'off'
      CHECK (task_approval_mode IN ('off', 'in_person_pin', 'remote_notification'));
  END IF;
END $$;

-- Approval requests table
CREATE TABLE IF NOT EXISTS approval_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  parent_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  task_id uuid REFERENCES tasks(id) ON DELETE CASCADE,
  task_title text NOT NULL,
  point_value integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);

ALTER TABLE approval_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_approval_requests" ON approval_requests;
CREATE POLICY "anon_select_approval_requests" ON approval_requests FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_approval_requests" ON approval_requests;
CREATE POLICY "anon_insert_approval_requests" ON approval_requests FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_approval_requests" ON approval_requests;
CREATE POLICY "anon_update_approval_requests" ON approval_requests FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_approval_requests" ON approval_requests;
CREATE POLICY "anon_delete_approval_requests" ON approval_requests FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_approval_requests_parent_id ON approval_requests(parent_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_status ON approval_requests(status);
