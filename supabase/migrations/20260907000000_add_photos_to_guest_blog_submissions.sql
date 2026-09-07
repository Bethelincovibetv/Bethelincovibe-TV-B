-- Migration: Add photos column to guest_blog_submissions table
-- Provides direct array persistence of photo URLs alongside the relational guest_submission_photos table
-- Ensures backward and forward compatibility for all guest blog submissions

ALTER TABLE public.guest_blog_submissions 
ADD COLUMN IF NOT EXISTS photos text[] DEFAULT '{}'::text[];

COMMENT ON COLUMN public.guest_blog_submissions.photos IS 'Direct array of photo URLs uploaded for the guest blog submission';

-- Ensure index exists for querying submissions by status and user
CREATE INDEX IF NOT EXISTS idx_guest_blog_submissions_user_status 
ON public.guest_blog_submissions(user_id, status);

-- Ensure RLS on guest_submission_photos permits users to insert photos for their own submissions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'guest_submission_photos' AND policyname = 'Users add own submission photos'
  ) THEN
    CREATE POLICY "Users add own submission photos" ON public.guest_submission_photos
      FOR INSERT WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.guest_blog_submissions s 
          WHERE s.id = submission_id AND s.user_id = auth.uid()
        )
      );
  END IF;
END $$;
