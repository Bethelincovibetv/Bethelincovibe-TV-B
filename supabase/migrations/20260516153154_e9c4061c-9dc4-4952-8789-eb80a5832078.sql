
-- 1. Attach handle_new_user trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Backfill profiles and wallets for any existing users missing them
INSERT INTO public.profiles (user_id, email, display_name)
SELECT u.id, u.email, COALESCE(u.raw_user_meta_data->>'display_name', split_part(u.email,'@',1))
FROM auth.users u
LEFT JOIN public.profiles p ON p.user_id = u.id
WHERE p.id IS NULL;

INSERT INTO public.wallets (user_id, balance)
SELECT u.id, 0 FROM auth.users u
LEFT JOIN public.wallets w ON w.user_id = u.id
WHERE w.id IS NULL;

-- 3. Suppliers: services jsonb
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS services jsonb NOT NULL DEFAULT '[]'::jsonb;

-- 4. Auto-approve trigger driven by site_settings
CREATE OR REPLACE FUNCTION public.suppliers_auto_approve()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v text;
BEGIN
  IF NEW.status = 'pending' THEN
    SELECT value INTO v FROM public.site_settings WHERE key = 'feature_business_auto_approve';
    IF v IN ('on','true','1') THEN
      NEW.status := 'approved';
      NEW.active := true;
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_suppliers_auto_approve ON public.suppliers;
CREATE TRIGGER trg_suppliers_auto_approve
  BEFORE INSERT ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION public.suppliers_auto_approve();

-- 5. Chat / messages
CREATE TABLE IF NOT EXISTS public.business_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  service_title text,
  sender_user_id uuid,
  sender_name text NOT NULL,
  sender_email text,
  sender_phone text,
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.business_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can send a message"
  ON public.business_messages FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Owners & admins view messages"
  ON public.business_messages FOR SELECT
  USING (
    has_role(auth.uid(),'admin'::app_role)
    OR EXISTS (SELECT 1 FROM public.suppliers s WHERE s.id = business_messages.business_id AND s.submitted_by = auth.uid())
  );

CREATE POLICY "Owners & admins update messages"
  ON public.business_messages FOR UPDATE
  USING (
    has_role(auth.uid(),'admin'::app_role)
    OR EXISTS (SELECT 1 FROM public.suppliers s WHERE s.id = business_messages.business_id AND s.submitted_by = auth.uid())
  );

CREATE POLICY "Owners & admins delete messages"
  ON public.business_messages FOR DELETE
  USING (
    has_role(auth.uid(),'admin'::app_role)
    OR EXISTS (SELECT 1 FROM public.suppliers s WHERE s.id = business_messages.business_id AND s.submitted_by = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_business_messages_business ON public.business_messages(business_id, created_at DESC);

-- 6. Seed auto-approve flag (default off)
INSERT INTO public.site_settings (key, value)
VALUES ('feature_business_auto_approve','off')
ON CONFLICT (key) DO NOTHING;
