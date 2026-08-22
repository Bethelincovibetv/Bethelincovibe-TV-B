
-- Contact submissions table
CREATE TABLE public.contact_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit contact form"
  ON public.contact_submissions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view submissions"
  ON public.contact_submissions FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update submissions"
  ON public.contact_submissions FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete submissions"
  ON public.contact_submissions FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Blog comments table
CREATE TABLE public.blog_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.blog_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Comments are viewable by everyone"
  ON public.blog_comments FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can comment"
  ON public.blog_comments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comments"
  ON public.blog_comments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments or admin can"
  ON public.blog_comments FOR DELETE
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_blog_comments_updated_at
  BEFORE UPDATE ON public.blog_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Slider images storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('slider-images', 'slider-images', true);

CREATE POLICY "Slider images are public" ON storage.objects
  FOR SELECT USING (bucket_id = 'slider-images');

CREATE POLICY "Admins can upload slider images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'slider-images' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update slider images" ON storage.objects
  FOR UPDATE USING (bucket_id = 'slider-images' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete slider images" ON storage.objects
  FOR DELETE USING (bucket_id = 'slider-images' AND has_role(auth.uid(), 'admin'::app_role));
