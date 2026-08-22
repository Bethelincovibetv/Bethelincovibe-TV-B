
CREATE TABLE public.tv_videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  youtube_url TEXT NOT NULL,
  description TEXT,
  placement TEXT NOT NULL DEFAULT 'both' CHECK (placement IN ('home', 'about', 'both')),
  display_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.tv_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active videos are viewable by everyone"
ON public.tv_videos FOR SELECT
USING (active = true OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert videos"
ON public.tv_videos FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update videos"
ON public.tv_videos FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete videos"
ON public.tv_videos FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_tv_videos_updated_at
BEFORE UPDATE ON public.tv_videos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert the default video
INSERT INTO public.tv_videos (title, youtube_url, placement, display_order)
VALUES ('Welcome to Bethelincovibe TV', 'https://youtu.be/GrxILusB2QI', 'both', 1);
