ALTER TABLE public.sales_pages
  ADD COLUMN IF NOT EXISTS youtube_video_url text,
  ADD COLUMN IF NOT EXISTS gallery_image_urls jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE OR REPLACE FUNCTION public.send_push_via_onesignal(_title text, _body text, _url text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM net.http_post(
    url := 'https://gndcgttnpxsjufmehgyi.supabase.co/functions/v1/onesignal-send',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImduZGNndHRucHhzanVmbWVoZ3lpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3MjM5MTMsImV4cCI6MjA5NTI5OTkxM30.N4TQQbIGQfp80iCm8txx72_3XdnJ2HuK6-xQQ1yNJmQ'
    ),
    body := jsonb_build_object('mode','all','title',_title,'message',_body,'url',_url)
  );
EXCEPTION WHEN OTHERS THEN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.send_push_to_user_via_onesignal(_user_id uuid, _title text, _body text, _url text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF _user_id IS NULL THEN
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := 'https://gndcgttnpxsjufmehgyi.supabase.co/functions/v1/onesignal-send',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImduZGNndHRucHhzanVmbWVoZ3lpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3MjM5MTMsImV4cCI6MjA5NTI5OTkxM30.N4TQQbIGQfp80iCm8txx72_3XdnJ2HuK6-xQQ1yNJmQ'
    ),
    body := jsonb_build_object(
      'mode','users',
      'user_ids', jsonb_build_array(_user_id),
      'title', _title,
      'message', _body,
      'url', _url
    )
  );
EXCEPTION WHEN OTHERS THEN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_blog_post_published()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.published = true AND COALESCE(OLD.published, false) = false AND COALESCE(NEW.push_notified, false) = false THEN
    PERFORM public.send_push_via_onesignal(
      'New post: ' || NEW.title,
      COALESCE(NEW.excerpt, 'Read the latest update on Bethelincovibe TV'),
      '/blog/' || NEW.slug
    );
    NEW.push_notified := true;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_forum_post_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM public.send_push_via_onesignal(
    'New community post',
    NEW.title,
    '/forum/' || NEW.id::text
  );
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_supplier_approved()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'approved' AND COALESCE(OLD.status,'') <> 'approved' THEN
    PERFORM public.send_push_via_onesignal(
      'New business listed: ' || NEW.name,
      'Check out the latest addition to our directory',
      '/businesses/' || COALESCE(NEW.slug, NEW.id::text)
    );
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_business_message_received()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_owner_id uuid;
  v_business_name text;
  v_sender_name text;
BEGIN
  SELECT s.submitted_by, s.name
    INTO v_owner_id, v_business_name
  FROM public.suppliers s
  WHERE s.id = NEW.business_id;

  IF v_owner_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_sender_name := COALESCE(NULLIF(NEW.sender_name, ''), 'A customer');

  INSERT INTO public.user_notifications (user_id, title, body, url, type)
  VALUES (
    v_owner_id,
    'New business inquiry',
    v_sender_name || ' sent you a message about ' || COALESCE(v_business_name, 'your business') || '.',
    '/dashboard/messages',
    'business_message'
  );

  PERFORM public.send_push_to_user_via_onesignal(
    v_owner_id,
    'New business inquiry',
    v_sender_name || ' sent you a message about ' || COALESCE(v_business_name, 'your business') || '.',
    '/dashboard/messages'
  );

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_forum_reply_received()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_post_owner uuid;
  v_post_title text;
  v_author_name text;
BEGIN
  SELECT p.user_id, p.title
    INTO v_post_owner, v_post_title
  FROM public.forum_posts p
  WHERE p.id = NEW.post_id;

  IF v_post_owner IS NULL OR v_post_owner = NEW.user_id THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(NULLIF(display_name, ''), NULLIF(username, ''), 'Someone')
    INTO v_author_name
  FROM public.profiles
  WHERE user_id = NEW.user_id;

  INSERT INTO public.user_notifications (user_id, title, body, url, type)
  VALUES (
    v_post_owner,
    'New reply to your forum post',
    COALESCE(v_author_name, 'Someone') || ' replied to "' || COALESCE(v_post_title, 'your post') || '".',
    '/forum/' || NEW.post_id::text,
    'forum_reply'
  );

  PERFORM public.send_push_to_user_via_onesignal(
    v_post_owner,
    'New reply to your forum post',
    COALESCE(v_author_name, 'Someone') || ' replied to "' || COALESCE(v_post_title, 'your post') || '".',
    '/forum/' || NEW.post_id::text
  );

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_sales_page_viewed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_owner_id uuid;
  v_page_name text;
BEGIN
  IF NEW.type <> 'view' THEN
    RETURN NEW;
  END IF;

  SELECT p.user_id, p.product_name
    INTO v_owner_id, v_page_name
  FROM public.sales_pages p
  WHERE p.id = NEW.sales_page_id;

  IF v_owner_id IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.user_notifications (user_id, title, body, url, type)
  VALUES (
    v_owner_id,
    'Sales page viewed',
    'Someone viewed your sales page for ' || COALESCE(v_page_name, 'your product') || '.',
    '/dashboard/sales-pages',
    'sales_page_view'
  );

  PERFORM public.send_push_to_user_via_onesignal(
    v_owner_id,
    'Sales page viewed',
    'Someone viewed your sales page for ' || COALESCE(v_page_name, 'your product') || '.',
    '/dashboard/sales-pages'
  );

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_wallet_transaction_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_title text;
  v_body text;
BEGIN
  IF COALESCE(NEW.amount, 0) = 0 THEN
    RETURN NEW;
  END IF;

  IF NEW.amount > 0 THEN
    v_title := 'Wallet credited';
    v_body := '₦' || trim(to_char(NEW.amount, 'FM999999999990D00')) || ' was added to your wallet.';
  ELSE
    v_title := 'Wallet debited';
    v_body := '₦' || trim(to_char(abs(NEW.amount), 'FM999999999990D00')) || ' was removed from your wallet.';
  END IF;

  IF COALESCE(NEW.description, '') <> '' THEN
    v_body := v_body || ' ' || NEW.description;
  END IF;

  INSERT INTO public.user_notifications (user_id, title, body, url, type)
  VALUES (NEW.user_id, v_title, v_body, '/dashboard/wallet', 'wallet');

  PERFORM public.send_push_to_user_via_onesignal(
    NEW.user_id,
    v_title,
    v_body,
    '/dashboard/wallet'
  );

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_notify_business_message_received ON public.business_messages;
CREATE TRIGGER trg_notify_business_message_received
  AFTER INSERT ON public.business_messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_business_message_received();

DROP TRIGGER IF EXISTS trg_notify_forum_reply_received ON public.forum_replies;
CREATE TRIGGER trg_notify_forum_reply_received
  AFTER INSERT ON public.forum_replies
  FOR EACH ROW EXECUTE FUNCTION public.notify_forum_reply_received();

DROP TRIGGER IF EXISTS trg_notify_sales_page_viewed ON public.sales_page_events;
CREATE TRIGGER trg_notify_sales_page_viewed
  AFTER INSERT ON public.sales_page_events
  FOR EACH ROW EXECUTE FUNCTION public.notify_sales_page_viewed();

DROP TRIGGER IF EXISTS trg_notify_wallet_transaction_change ON public.wallet_transactions;
CREATE TRIGGER trg_notify_wallet_transaction_change
  AFTER INSERT ON public.wallet_transactions
  FOR EACH ROW EXECUTE FUNCTION public.notify_wallet_transaction_change();