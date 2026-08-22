
CREATE OR REPLACE FUNCTION public.serve_random_ad(_placement text DEFAULT 'blog'::text)
 RETURNS TABLE(id uuid, title text, description text, image_url text, target_url text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE r record;
BEGIN
  SELECT a.id, a.title, a.description, a.image_url, a.target_url INTO r
  FROM public.user_ads a
  WHERE a.status = 'active'
    AND (a.starts_at IS NULL OR a.starts_at <= now())
    AND (a.ends_at IS NULL OR a.ends_at >= now())
    AND (
      a.placement = _placement
      OR a.placement = 'all'
      OR a.placement ILIKE '%all%'
      OR (',' || replace(a.placement, ' ', '') || ',') ILIKE ('%,' || _placement || ',%')
    )
  ORDER BY random() LIMIT 1;
  IF r.id IS NULL THEN RETURN; END IF;
  UPDATE public.user_ads SET impressions = impressions + 1 WHERE user_ads.id = r.id;
  id := r.id; title := r.title; description := r.description;
  image_url := r.image_url; target_url := r.target_url;
  RETURN NEXT;
END $function$;
