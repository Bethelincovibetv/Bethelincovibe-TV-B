import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

declare const EdgeRuntime: { waitUntil?: (promise: Promise<unknown>) => void } | undefined;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function runScheduler() {
  const sbUrl = Deno.env.get("SUPABASE_URL")!;
  const sbKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sb = createClient(sbUrl, sbKey);

  const { data: schedules } = await sb.from("autoblog_schedule").select("*").eq("enabled", true);
  if (!schedules || schedules.length === 0) return { message: "No active schedules" };

  const results: any[] = [];

  for (const schedule of schedules) {
    if (schedule.last_run_at) {
      const lastRun = new Date(schedule.last_run_at);
      const hoursElapsed = (Date.now() - lastRun.getTime()) / (1000 * 60 * 60);
      if (hoursElapsed < schedule.interval_hours) {
        results.push({ id: schedule.id, status: "skipped", reason: "Too soon" });
        continue;
      }
    }

    const { data: adminRole } = await sb.from("user_roles").select("user_id").eq("role", "admin").limit(1).single();
    if (!adminRole) {
      results.push({ id: schedule.id, status: "error", reason: "No admin user found" });
      continue;
    }

    let categoryIds: (string | null)[] = [schedule.category_id || null];
    if (schedule.mode === "multi") {
      const { data: cats } = await sb.from("autoblog_categories").select("category_id").eq("schedule_id", schedule.id);
      if (cats && cats.length > 0) categoryIds = cats.map((c: any) => c.category_id);
    }

    const postsPerRun = Math.max(1, Math.min(schedule.posts_per_run || 1, 5));
    const runResults: any[] = [];

    for (let i = 0; i < postsPerRun; i++) {
      const catId = categoryIds[i % categoryIds.length];
      try {
        const blogRes = await fetch(`${sbUrl}/functions/v1/ai-blogger`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${sbKey}` },
          body: JSON.stringify({
            useTrending: true,
            keywords: schedule.keywords || "",
            tone: "casual",
            autoPublish: schedule.auto_approve !== false,
            authorId: adminRole.user_id,
            categoryId: catId,
          }),
        });
        const blogData = await blogRes.json();
        runResults.push({
          status: blogData.auto_published ? "published" : blogData.skipped ? "skipped" : blogData.error ? "error" : "generated",
          title: blogData.title,
          error: blogData.error || blogData.auto_publish_error || null,
          category_id: catId,
        });
        if (i < postsPerRun - 1) await new Promise((r) => setTimeout(r, 2000));
      } catch (e) {
        runResults.push({ status: "error", reason: e instanceof Error ? e.message : "Unknown" });
      }
    }

    await sb.from("autoblog_schedule").update({ last_run_at: new Date().toISOString() }).eq("id", schedule.id);
    results.push({ id: schedule.id, mode: schedule.mode || "single", posts: runResults });
  }

  return { results };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    let body: any = {};
    try { body = await req.clone().json(); } catch {}

    if (body?.async === true) {
      const job = runScheduler().catch((e) => console.error("scheduler async error:", e));
      if (typeof EdgeRuntime !== "undefined" && EdgeRuntime.waitUntil) EdgeRuntime.waitUntil(job);
      return new Response(JSON.stringify({ queued: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const result = await runScheduler();
    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("scheduler error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
