-- The tasks table column is named 'points_value' but all app code
-- references it as 'point_value'. Rename to match the codebase.
ALTER TABLE tasks RENAME COLUMN points_value TO point_value;
