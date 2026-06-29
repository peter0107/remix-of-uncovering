
-- Storage bucket for mission submission files (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('mission-submissions', 'mission-submissions', false)
ON CONFLICT (id) DO NOTHING;

-- Users can upload files into a folder named with their own user id
CREATE POLICY "Users upload own submission files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'mission-submissions'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can read their own files; admins can read all
CREATE POLICY "Users read own submission files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'mission-submissions'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);

-- Users can replace their own files (update)
CREATE POLICY "Users update own submission files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'mission-submissions'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can delete their own files
CREATE POLICY "Users delete own submission files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'mission-submissions'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
