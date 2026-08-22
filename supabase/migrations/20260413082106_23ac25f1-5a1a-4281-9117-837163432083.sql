
CREATE TABLE public.supplier_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  caption TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.supplier_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Supplier images viewable by everyone"
ON public.supplier_images FOR SELECT USING (true);

CREATE POLICY "Admins can insert supplier images"
ON public.supplier_images FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update supplier images"
ON public.supplier_images FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete supplier images"
ON public.supplier_images FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));
