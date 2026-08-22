CREATE POLICY "Sellers manage own digital files" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'digital-products' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'digital-products' AND (storage.foldername(name))[1] = auth.uid()::text);