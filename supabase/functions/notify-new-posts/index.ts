// Sends web push for newly published blog posts (marks push_notified=true)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import webpush from "https://esm.sh/web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY");
    const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY");
    const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || "mailto:bethelgoodgift3@gmail.com";

    const { data: posts } = await sb
      .from("blog_posts")
      .select("id, title, slug, excerpt, featured_image")
      .eq("published", true)
      .eq("push_notified", false)
      .order("published_at", { ascending: false })
      .limit(5);

    if (!posts || posts.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: "no new posts" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let totalSent = 0;
    const canPush = VAPID_PUBLIC && VAPID_PRIVATE;
    if (canPush) webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC!, VAPID_PRIVATE!);

    for (const post of posts) {
      // Record notification
      await sb.from("push_notifications").insert({
        title: `New: ${post.title}`,
        body: post.excerpt || "Read the latest article on Bethelincovibe TV",
        url: `/blog/${post.slug}`,
      });

      if (canPush) {
        const { data: subs } = await sb.from("push_subscriptions").select("*");
        for (const s of subs || []) {
          try {
            // Skip placeholder subs (no real endpoint)
            if (!s.endpoint?.startsWith("http")) continue;
            await webpush.sendNotification(
              { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
              JSON.stringify({
                title: post.title,
                body: post.excerpt || "New article on Bethelincovibe TV",
                url: `/blog/${post.slug}`,
                icon: post.featured_image || "/logo.png",
              })
            );
            totalSent++;
          } catch (e: any) {
            // Clean up dead subscriptions
            if (e?.statusCode === 410 || e?.statusCode === 404) {
              await sb.from("push_subscriptions").delete().eq("id", s.id);
            }
          }
        }
      }

      await sb.from("blog_posts").update({ push_notified: true }).eq("id", post.id);
    }

    return new Response(JSON.stringify({ sent: totalSent, posts: posts.length, vapid_configured: canPush }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("notify-new-posts error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
