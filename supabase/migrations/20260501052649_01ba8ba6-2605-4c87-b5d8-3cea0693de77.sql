-- Allow users to submit supplier listings for admin approval
ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS submitted_by uuid,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS rejection_reason text;

-- Backfill existing rows so they remain visible
UPDATE public.suppliers SET status = 'approved' WHERE status IS NULL;

-- Update public visibility: only approved + active suppliers (admins see all)
DROP POLICY IF EXISTS "Active suppliers are viewable by everyone" ON public.suppliers;
CREATE POLICY "Approved active suppliers are viewable by everyone"
  ON public.suppliers
  FOR SELECT
  USING (
    (active = true AND status = 'approved')
    OR has_role(auth.uid(), 'admin'::app_role)
    OR (auth.uid() IS NOT NULL AND submitted_by = auth.uid())
  );

-- Allow authenticated users to submit their own listings (pending)
CREATE POLICY "Users can submit suppliers"
  ON public.suppliers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = submitted_by
    AND status = 'pending'
    AND active = false
  );

-- Allow users to update their own pending submissions (e.g. before approval)
CREATE POLICY "Users can update own pending submissions"
  ON public.suppliers
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = submitted_by AND status = 'pending')
  WITH CHECK (auth.uid() = submitted_by AND status = 'pending');
