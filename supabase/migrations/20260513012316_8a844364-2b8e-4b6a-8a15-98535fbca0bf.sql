
-- 1. Admin emails whitelist
CREATE TABLE IF NOT EXISTS public.admin_emails (
  email text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_emails ENABLE ROW LEVEL SECURITY;

-- No client access; only SECURITY DEFINER trigger reads it
CREATE POLICY "No direct access to admin_emails"
  ON public.admin_emails FOR SELECT
  USING (false);

-- 2. Replace handle_new_user to also auto-assign admin role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
begin
  insert into public.profiles (id, nickname)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'nickname', null));

  if exists (select 1 from public.admin_emails where lower(email) = lower(new.email)) then
    insert into public.user_roles (user_id, role)
    values (new.id, 'admin'::app_role)
    on conflict do nothing;
  end if;

  return new;
end;
$$;

-- Ensure trigger exists on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Seed the admin email
INSERT INTO public.admin_emails (email) VALUES ('standard1414@g.skku.edu')
ON CONFLICT DO NOTHING;

-- 4. If this user already exists in auth.users, grant admin now
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin'::app_role
FROM auth.users u
WHERE lower(u.email) = lower('standard1414@g.skku.edu')
ON CONFLICT DO NOTHING;
