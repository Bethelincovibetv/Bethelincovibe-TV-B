
-- Allow authenticated users to upload to supplier-logos (was admin-only, breaking listing logo upload)
CREATE POLICY "Users upload supplier logos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'supplier-logos');

CREATE POLICY "Users update own supplier logos"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'supplier-logos' AND owner = auth.uid());

CREATE POLICY "Users delete own supplier logos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'supplier-logos' AND owner = auth.uid());
