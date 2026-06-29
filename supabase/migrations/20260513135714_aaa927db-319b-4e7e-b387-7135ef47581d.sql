ALTER TABLE public.missions
  ADD COLUMN IF NOT EXISTS company_size text,
  ADD COLUMN IF NOT EXISTS industry text,
  ADD COLUMN IF NOT EXISTS verification_file_url text;

INSERT INTO storage.buckets (id, name, public)
VALUES ('expert-verification', 'expert-verification', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users upload own verification" ON storage.objects;
CREATE POLICY "Users upload own verification"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'expert-verification'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users read own verification" ON storage.objects;
CREATE POLICY "Users read own verification"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'expert-verification'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users delete own verification" ON storage.objects;
CREATE POLICY "Users delete own verification"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'expert-verification'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Admins read all verification" ON storage.objects;
CREATE POLICY "Admins read all verification"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'expert-verification'
  AND public.has_role(auth.uid(), 'admin')
);