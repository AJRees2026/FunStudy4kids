/*
# Add DELETE policy for avatars storage bucket

1. Security Changes
- Adds a DELETE policy to the storage.objects table for the 'avatars' bucket.
- Allows anon and authenticated roles to delete files in the 'avatars' bucket.
- This complements the existing SELECT, INSERT, and UPDATE policies already on the bucket.
- Needed so children can replace their profile photo (delete old, upload new).
*/

DROP POLICY IF EXISTS "anon_delete_avatars" ON storage.objects;
CREATE POLICY "anon_delete_avatars"
ON storage.objects FOR DELETE
TO anon, authenticated
USING (bucket_id = 'avatars');