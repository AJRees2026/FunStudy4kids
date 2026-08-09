/*
# StudyPulse Kids — Personalization Schema Update

## Overview
Updates the StudyPulse Kids schema to support the new personalization spec:
- Profiles now store child_name, grade, photo_url (from Supabase Storage), and theme_preference.
- A new `outfits` table holds unlockable costume overlays (transparent SVGs)
  that kids can earn and wear on top of their avatar photo.
- A `child_outfits` join table tracks which outfits each child has unlocked.
- Storage bucket `avatars` is created for child photo uploads.

## Modified Tables

### profiles (altered)
- `child_name` (text, nullable) — the child's display name, e.g. "Leo"
- `grade` (text, nullable) — e.g. "3rd Grade"
- `photo_url` (text, nullable) — public URL to the child's uploaded photo in Storage
- `theme_preference` (text, default 'space', check 'space' | 'unicorn')
- `active_outfit_id` (uuid, nullable) — FK to outfits.id, the currently equipped outfit

Old columns (age, avatar, gender) are kept for data safety but no longer drive the UI.

## New Tables

### outfits
- `id` (uuid, primary key)
- `title` (text — e.g. "Space Helmet", "Superhero Mask")
- `icon_url` (text — URL to transparent SVG overlay)
- `point_cost` (int — Star Points required to unlock)
- `theme` (text — 'space' | 'unicorn' | 'any' — which themes it suits)

### child_outfits
- `id` (uuid, primary key)
- `child_id` (uuid, FK to profiles.id)
- `outfit_id` (uuid, FK to outfits.id)
- `is_unlocked` (boolean, default false)
- `unlocked_at` (timestamptz, nullable)

## Storage
- Creates a public bucket `avatars` for child photo uploads.
- Storage policies allow anon upload/read on the avatars bucket.

## Security
- RLS enabled on outfits and child_outfits.
- All policies use `TO anon, authenticated` with `USING (true)` / `WITH CHECK (true)`
  because this is a single-tenant demo app with no sign-in — all data is intentionally shared.

## Demo Data
- 6 outfits seeded (Space Helmet, Astronaut Suit, Superhero Mask, Unicorn Crown, Rainbow Wings, Magic Wand)
- Leo and Maya updated with child_name, grade, theme_preference
- Both children get pre-unlocked outfits + locked rows for the rest
- Leo equips Space Helmet, Maya equips Unicorn Crown
*/

-- ── Step 1: Create outfits table first (no FK deps) ─────────
CREATE TABLE IF NOT EXISTS outfits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  icon_url text NOT NULL,
  point_cost int NOT NULL DEFAULT 20,
  theme text NOT NULL DEFAULT 'any' CHECK (theme IN ('space', 'unicorn', 'any')),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE outfits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_outfits" ON outfits;
CREATE POLICY "anon_select_outfits" ON outfits FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_outfits" ON outfits;
CREATE POLICY "anon_insert_outfits" ON outfits FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_outfits" ON outfits;
CREATE POLICY "anon_update_outfits" ON outfits FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_outfits" ON outfits;
CREATE POLICY "anon_delete_outfits" ON outfits FOR DELETE
  TO anon, authenticated USING (true);

-- ── Step 2: Alter profiles (now outfits exists for FK) ──────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS child_name text,
  ADD COLUMN IF NOT EXISTS grade text,
  ADD COLUMN IF NOT EXISTS photo_url text,
  ADD COLUMN IF NOT EXISTS theme_preference text NOT NULL DEFAULT 'space'
    CHECK (theme_preference IN ('space', 'unicorn')),
  ADD COLUMN IF NOT EXISTS active_outfit_id uuid REFERENCES outfits(id) ON DELETE SET NULL;

-- ── Step 3: child_outfits join table ────────────────────────
CREATE TABLE IF NOT EXISTS child_outfits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  outfit_id uuid NOT NULL REFERENCES outfits(id) ON DELETE CASCADE,
  is_unlocked boolean NOT NULL DEFAULT false,
  unlocked_at timestamptz,
  UNIQUE (child_id, outfit_id)
);
ALTER TABLE child_outfits ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_child_outfits_child ON child_outfits(child_id);

DROP POLICY IF EXISTS "anon_select_child_outfits" ON child_outfits;
CREATE POLICY "anon_select_child_outfits" ON child_outfits FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_child_outfits" ON child_outfits;
CREATE POLICY "anon_insert_child_outfits" ON child_outfits FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_child_outfits" ON child_outfits;
CREATE POLICY "anon_update_child_outfits" ON child_outfits FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_child_outfits" ON child_outfits;
CREATE POLICY "anon_delete_child_outfits" ON child_outfits FOR DELETE
  TO anon, authenticated USING (true);

-- ── Step 4: Storage bucket for avatars ──────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "anon_read_avatars" ON storage.objects;
CREATE POLICY "anon_read_avatars" ON storage.objects
  FOR SELECT TO anon, authenticated USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "anon_upload_avatars" ON storage.objects;
CREATE POLICY "anon_upload_avatars" ON storage.objects
  FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'avatars');

DROP POLICY IF EXISTS "anon_update_avatars" ON storage.objects;
CREATE POLICY "anon_update_avatars" ON storage.objects
  FOR UPDATE TO anon, authenticated USING (bucket_id = 'avatars')
  WITH CHECK (bucket_id = 'avatars');

-- ── Step 5: Seed outfits ────────────────────────────────────
INSERT INTO outfits (title, icon_url, point_cost, theme) VALUES
  ('Space Helmet', '/outfits/space-helmet.svg', 30, 'space'),
  ('Astronaut Suit', '/outfits/astronaut-suit.svg', 50, 'space'),
  ('Superhero Mask', '/outfits/superhero-mask.svg', 40, 'any'),
  ('Unicorn Crown', '/outfits/unicorn-crown.svg', 30, 'unicorn'),
  ('Rainbow Wings', '/outfits/rainbow-wings.svg', 60, 'unicorn'),
  ('Magic Wand', '/outfits/magic-wand.svg', 25, 'unicorn')
ON CONFLICT DO NOTHING;

-- ── Step 6: Update demo profiles ────────────────────────────
UPDATE profiles SET
  child_name = 'Leo',
  grade = '3rd Grade',
  theme_preference = 'space'
WHERE name = 'Leo';

UPDATE profiles SET
  child_name = 'Maya',
  grade = '5th Grade',
  theme_preference = 'unicorn'
WHERE name = 'Maya';

-- ── Step 7: Seed child_outfits ──────────────────────────────
-- Leo: Space Helmet + Superhero Mask unlocked
INSERT INTO child_outfits (child_id, outfit_id, is_unlocked, unlocked_at)
SELECT p.id, o.id, true, now()
FROM profiles p, outfits o
WHERE p.name = 'Leo' AND o.title IN ('Space Helmet', 'Superhero Mask')
ON CONFLICT (child_id, outfit_id) DO UPDATE SET is_unlocked = true, unlocked_at = now();

-- Maya: Unicorn Crown + Rainbow Wings unlocked
INSERT INTO child_outfits (child_id, outfit_id, is_unlocked, unlocked_at)
SELECT p.id, o.id, true, now()
FROM profiles p, outfits o
WHERE p.name = 'Maya' AND o.title IN ('Unicorn Crown', 'Rainbow Wings')
ON CONFLICT (child_id, outfit_id) DO UPDATE SET is_unlocked = true, unlocked_at = now();

-- All other outfits: locked rows for both kids
INSERT INTO child_outfits (child_id, outfit_id, is_unlocked)
SELECT p.id, o.id, false
FROM profiles p
CROSS JOIN outfits o
WHERE p.role = 'child'
  AND NOT EXISTS (
    SELECT 1 FROM child_outfits co WHERE co.child_id = p.id AND co.outfit_id = o.id
  )
ON CONFLICT DO NOTHING;

-- ── Step 8: Equip default outfits ───────────────────────────
UPDATE profiles SET active_outfit_id = (
  SELECT id FROM outfits WHERE title = 'Space Helmet'
) WHERE name = 'Leo';

UPDATE profiles SET active_outfit_id = (
  SELECT id FROM outfits WHERE title = 'Unicorn Crown'
) WHERE name = 'Maya';
