-- The rewards table has a CHECK constraint on `status` that only allows
-- 'locked', 'claimed', 'approved', 'declined'. The app inserts new rewards
-- with status 'available', which is rejected by the constraint, so newly
-- added rewards silently fail to save. Add 'available' to the allowed set.

ALTER TABLE rewards
  DROP CONSTRAINT rewards_status_check,
  ADD CONSTRAINT rewards_status_check
    CHECK (status = ANY (ARRAY['locked'::text, 'claimed'::text, 'approved'::text, 'declined'::text, 'available'::text]));
