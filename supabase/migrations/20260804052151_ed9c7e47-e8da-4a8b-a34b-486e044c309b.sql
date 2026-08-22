CREATE POLICY "Owners can delete own listings"
ON public.suppliers FOR DELETE TO authenticated
USING (auth.uid() = submitted_by);

CREATE POLICY "Owners can delete own listing images"
ON public.supplier_images FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.suppliers s WHERE s.id = supplier_images.supplier_id AND s.submitted_by = auth.uid()));