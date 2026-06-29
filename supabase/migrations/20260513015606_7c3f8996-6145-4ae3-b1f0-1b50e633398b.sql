CREATE TABLE public.orders (
  id text PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email text NOT NULL DEFAULT '',
  job_slug text NOT NULL,
  product_id text NOT NULL,
  status text NOT NULL DEFAULT 'in_progress',
  answers jsonb,
  submitted_at timestamptz,
  feedback_requested boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own orders"
  ON public.orders FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users insert own orders"
  ON public.orders FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own orders"
  ON public.orders FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete orders"
  ON public.orders FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_orders_user_id ON public.orders(user_id);
CREATE INDEX idx_orders_created_at ON public.orders(created_at DESC);