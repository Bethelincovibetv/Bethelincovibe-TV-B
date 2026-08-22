CREATE TABLE IF NOT EXISTS public.custom_code_injections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  route_pattern text NOT NULL DEFAULT '*',
  location text NOT NULL DEFAULT 'head',
  code text NOT NULL DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.custom_code_injections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active injections viewable" ON public.custom_code_injections
  FOR SELECT USING (active = true OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage injections" ON public.custom_code_injections
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_custom_code_injections_updated_at
BEFORE UPDATE ON public.custom_code_injections
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();