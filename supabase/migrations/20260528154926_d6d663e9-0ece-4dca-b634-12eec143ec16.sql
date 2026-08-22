
CREATE TABLE public.forum_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('question','discussion')),
  category text NOT NULL DEFAULT 'general',
  title text NOT NULL,
  content text NOT NULL,
  replies_count integer NOT NULL DEFAULT 0,
  likes_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.forum_posts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.forum_posts TO authenticated;
GRANT ALL ON public.forum_posts TO service_role;
ALTER TABLE public.forum_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Forum posts viewable by everyone" ON public.forum_posts FOR SELECT USING (true);
CREATE POLICY "Auth users create posts" ON public.forum_posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners or admins update posts" ON public.forum_posts FOR UPDATE USING (auth.uid() = user_id OR has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Owners or admins delete posts" ON public.forum_posts FOR DELETE USING (auth.uid() = user_id OR has_role(auth.uid(),'admin'::app_role));
CREATE INDEX idx_forum_posts_created ON public.forum_posts(created_at DESC);
CREATE INDEX idx_forum_posts_kind_cat ON public.forum_posts(kind, category);

CREATE TABLE public.forum_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL,
  user_id uuid NOT NULL,
  content text NOT NULL,
  likes_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.forum_replies TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.forum_replies TO authenticated;
GRANT ALL ON public.forum_replies TO service_role;
ALTER TABLE public.forum_replies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Forum replies viewable by everyone" ON public.forum_replies FOR SELECT USING (true);
CREATE POLICY "Auth users create replies" ON public.forum_replies FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners or admins delete replies" ON public.forum_replies FOR DELETE USING (auth.uid() = user_id OR has_role(auth.uid(),'admin'::app_role));
CREATE INDEX idx_forum_replies_post ON public.forum_replies(post_id);

CREATE TABLE public.forum_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  target_type text NOT NULL CHECK (target_type IN ('post','reply')),
  target_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, target_type, target_id)
);
GRANT SELECT, INSERT, DELETE ON public.forum_votes TO authenticated;
GRANT ALL ON public.forum_votes TO service_role;
ALTER TABLE public.forum_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Votes viewable by everyone" ON public.forum_votes FOR SELECT USING (true);
CREATE POLICY "Auth users vote" ON public.forum_votes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users remove own vote" ON public.forum_votes FOR DELETE USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.forum_reply_count_trg()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.forum_posts SET replies_count = replies_count + 1, updated_at = now() WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.forum_posts SET replies_count = GREATEST(replies_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER forum_replies_count
AFTER INSERT OR DELETE ON public.forum_replies
FOR EACH ROW EXECUTE FUNCTION public.forum_reply_count_trg();

CREATE OR REPLACE FUNCTION public.forum_vote_count_trg()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_type text; v_id uuid; v_delta int;
BEGIN
  IF TG_OP = 'INSERT' THEN v_type := NEW.target_type; v_id := NEW.target_id; v_delta := 1;
  ELSE v_type := OLD.target_type; v_id := OLD.target_id; v_delta := -1; END IF;
  IF v_type = 'post' THEN
    UPDATE public.forum_posts SET likes_count = GREATEST(likes_count + v_delta, 0) WHERE id = v_id;
  ELSE
    UPDATE public.forum_replies SET likes_count = GREATEST(likes_count + v_delta, 0) WHERE id = v_id;
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER forum_votes_count
AFTER INSERT OR DELETE ON public.forum_votes
FOR EACH ROW EXECUTE FUNCTION public.forum_vote_count_trg();
