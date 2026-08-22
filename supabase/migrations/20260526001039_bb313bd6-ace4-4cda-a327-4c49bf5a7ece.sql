
-- ============ JINGLES ============
CREATE TABLE public.site_jingles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  audio_url text NOT NULL,
  volume numeric NOT NULL DEFAULT 0.3,
  active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.site_jingles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone view active jingle" ON public.site_jingles FOR SELECT USING (active = true OR has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Admins manage jingles" ON public.site_jingles FOR ALL USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));

CREATE OR REPLACE FUNCTION public.jingles_single_active()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.active = true THEN
    UPDATE public.site_jingles SET active = false WHERE id <> NEW.id AND active = true;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_jingles_single_active
  BEFORE INSERT OR UPDATE ON public.site_jingles
  FOR EACH ROW EXECUTE FUNCTION public.jingles_single_active();

CREATE TRIGGER trg_jingles_updated
  BEFORE UPDATE ON public.site_jingles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO storage.buckets (id, name, public) VALUES ('jingles','jingles',true) ON CONFLICT DO NOTHING;
CREATE POLICY "Public read jingles" ON storage.objects FOR SELECT USING (bucket_id = 'jingles');
CREATE POLICY "Admins upload jingles" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'jingles' AND has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Admins update jingles" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'jingles' AND has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Admins delete jingles" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'jingles' AND has_role(auth.uid(),'admin'::app_role));

-- ============ COURSES ============
CREATE TABLE public.courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  thumbnail_url text,
  video_url text,
  youtube_url text,
  instructor_name text,
  category text,
  price_naira numeric NOT NULL DEFAULT 0,
  duration_minutes integer,
  published boolean NOT NULL DEFAULT false,
  display_order integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published courses viewable" ON public.courses FOR SELECT USING (published = true OR has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Admins manage courses" ON public.courses FOR ALL USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));

CREATE TRIGGER trg_courses_updated
  BEFORE UPDATE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.course_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL,
  user_id uuid NOT NULL,
  amount_paid numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(course_id, user_id)
);
ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own enrollments" ON public.course_enrollments FOR SELECT USING (auth.uid() = user_id OR has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Users create own enrollments" ON public.course_enrollments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins manage enrollments" ON public.course_enrollments FOR ALL USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));

-- Enroll function: charges wallet if price > 0
CREATE OR REPLACE FUNCTION public.enroll_in_course(_course_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid();
  v_price numeric;
  v_title text;
  v_existing uuid;
  v_paid boolean;
BEGIN
  IF v_user IS NULL THEN RETURN jsonb_build_object('success',false,'error','login_required'); END IF;
  SELECT price_naira, title INTO v_price, v_title FROM public.courses WHERE id = _course_id AND published = true;
  IF v_title IS NULL THEN RETURN jsonb_build_object('success',false,'error','course_not_found'); END IF;
  SELECT id INTO v_existing FROM public.course_enrollments WHERE course_id = _course_id AND user_id = v_user;
  IF v_existing IS NOT NULL THEN RETURN jsonb_build_object('success',true,'already_enrolled',true); END IF;
  IF v_price > 0 THEN
    v_paid := public.deduct_wallet(v_user, v_price, 'Course: ' || v_title, _course_id);
    IF NOT v_paid THEN RETURN jsonb_build_object('success',false,'error','insufficient_balance'); END IF;
  END IF;
  INSERT INTO public.course_enrollments (course_id, user_id, amount_paid) VALUES (_course_id, v_user, v_price);
  RETURN jsonb_build_object('success',true,'amount',v_price);
END $$;

INSERT INTO storage.buckets (id, name, public) VALUES ('course-videos','course-videos',true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('course-thumbnails','course-thumbnails',true) ON CONFLICT DO NOTHING;
CREATE POLICY "Public read course videos" ON storage.objects FOR SELECT USING (bucket_id = 'course-videos');
CREATE POLICY "Admins manage course videos" ON storage.objects FOR ALL TO authenticated USING (bucket_id = 'course-videos' AND has_role(auth.uid(),'admin'::app_role)) WITH CHECK (bucket_id = 'course-videos' AND has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Public read course thumbs" ON storage.objects FOR SELECT USING (bucket_id = 'course-thumbnails');
CREATE POLICY "Admins manage course thumbs" ON storage.objects FOR ALL TO authenticated USING (bucket_id = 'course-thumbnails' AND has_role(auth.uid(),'admin'::app_role)) WITH CHECK (bucket_id = 'course-thumbnails' AND has_role(auth.uid(),'admin'::app_role));
