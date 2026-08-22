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
      'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImduZGNndHRucHhzanVmbWVoZ3lpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3MjM5MTMsImV4cCI6MjA5NTI5OTkxM30.N4TQQbIGQfp80iCm8txx72_3XdnJ2HuK6-xQQ1yNJmQ'
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