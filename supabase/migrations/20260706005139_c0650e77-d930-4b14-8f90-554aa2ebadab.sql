-- Deduplicate then add unique constraint on ASIN so bulk import can upsert cleanly
DELETE FROM public.amazon_products a USING public.amazon_products b
  WHERE a.ctid < b.ctid AND a.asin = b.asin;
ALTER TABLE public.amazon_products ADD CONSTRAINT amazon_products_asin_key UNIQUE (asin);