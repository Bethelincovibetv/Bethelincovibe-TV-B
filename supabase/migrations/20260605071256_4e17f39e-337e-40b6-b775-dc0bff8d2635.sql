-- Seed Classic template as default
INSERT INTO public.sales_page_templates (key, name, description, enabled, is_default, display_order, is_premium, premium_price)
VALUES ('classic', 'Classic (Recommended)', 'Full-length high-converting layout: Problem → Solution → Benefits → Proof → Urgency.', true, true, 0, false, 0)
ON CONFLICT (key) DO UPDATE SET is_default = true, enabled = true, display_order = 0, name = EXCLUDED.name, description = EXCLUDED.description;

-- Demote others
UPDATE public.sales_page_templates SET is_default = false WHERE key <> 'classic';

-- Backfill existing pages with NULL/old defaults to classic
UPDATE public.sales_pages SET template_key = 'classic' WHERE template_key IS NULL OR template_key = '';