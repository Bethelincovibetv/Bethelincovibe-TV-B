
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Remove any prior schedule with the same name
DO $$
BEGIN
  PERFORM cron.unschedule('auto-blog-publish');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'auto-blog-publish',
  '0 * * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://ppfpwurzeftyepqquedv.supabase.co/functions/v1/auto-blog-scheduler',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwZnB3dXJ6ZWZ0eWVwcXF1ZWR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5MjAxNzYsImV4cCI6MjA5NDQ5NjE3Nn0.L9iobXwCLjYSsUYnugnN5Zkym4om9ZTkU5uBS-FzRuQ'),
    body := '{}'::jsonb
  ) as request_id;
  $cron$
);

INSERT INTO site_settings (key, value)
VALUES ('gemini_api_key', '')
ON CONFLICT (key) DO NOTHING;
