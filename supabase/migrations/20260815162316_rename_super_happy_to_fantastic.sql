ALTER TABLE mood_entries DROP CONSTRAINT IF EXISTS mood_entries_mood_check;

UPDATE mood_entries SET mood = 'fantastic' WHERE mood = 'super_happy';

ALTER TABLE mood_entries
  ADD CONSTRAINT mood_entries_mood_check
  CHECK (mood IN ('fantastic', 'good', 'okay', 'sad', 'frustrated'));