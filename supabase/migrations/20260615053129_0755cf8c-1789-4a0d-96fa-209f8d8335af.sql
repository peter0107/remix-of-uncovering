ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS share_verification_status text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS share_verification_image_path text,
  ADD COLUMN IF NOT EXISTS share_verification_image_name text,
  ADD COLUMN IF NOT EXISTS share_verification_submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS share_verification_reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS share_verification_rejection_note text;