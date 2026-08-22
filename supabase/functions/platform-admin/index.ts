// AI General Administrator — a read-only conversational analyst for platform admins.
// It gathers live platform statistics server-side and answers admin questions about
// growth, content, users, revenue signals and what to do next.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { callAI } from "../_shared/ai.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const daysAgo = (n: number) => new Date(Date.now() - n * 864e5).toISOString();

async function count(sb: any, table: string, build?: (q: any) => any) {
  try {
    let q = sb.from(table).select("*", { count: "exact", head: true });
    if (build) q = build(q);
    const { count: c } = await q;
    return c ?? 0;
  } catch { return 0; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { question, history } = await req.json();

    const sbUrl = Deno.env.get("SUPABASE_URL")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // --- Verify the caller is an admin ---
    const authHeader = req.headers.get("Authorization") || "";
    const userClient = createClient(sbUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userRes } = await userClient.auth.getUser();
    const userId = userRes?.user?.id;
    if (!userId) {
      return new Response(JSON.stringify({ error: "UNAUTHORIZED", message: "Sign in required" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sb = createClient(sbUrl, service);
    const { data: isAdmin } = await sb.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "FORBIDDEN", message: "Admins only" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Live platform snapshot ---
    const week = daysAgo(7);
    const month = daysAgo(30);

    const [
      users, usersWeek, posts, postsPublished, postsWeek,
      businesses, businessesPending, products, forumPosts, forumWeek,
      salesPages, leads, leadsWeek, ads, adsPending, contacts, subscribers, courses, enrollments,
    ] = await Promise.all([
      count(sb, "profiles"),
      count(sb, "profiles", (q) => q.gte("created_at", week)),
      count(sb, "blog_posts"),
      count(sb, "blog_posts", (q) => q.eq("published", true)),
      count(sb, "blog_posts", (q) => q.gte("created_at", week)),
      count(sb, "suppliers", (q) => q.eq("status", "approved")),
      count(sb, "suppliers", (q) => q.eq("status", "pending")),
      count(sb, "directory_products", (q) => q.eq("active", true)),
      count(sb, "forum_posts"),
      count(sb, "forum_posts", (q) => q.gte("created_at", week)),
      count(sb, "sales_pages", (q) => q.eq("active", true)),
      count(sb, "sales_page_leads"),
      count(sb, "sales_page_leads", (q) => q.gte("created_at", week)),
      count(sb, "user_ads", (q) => q.eq("status", "approved")),
      count(sb, "user_ads", (q) => q.eq("status", "pending")),
      count(sb, "contact_submissions", (q) => q.eq("read", false)),
      count(sb, "email_subscribers", (q) => q.eq("active", true)),
      count(sb, "courses", (q) => q.eq("published", true)),
      count(sb, "course_enrollments"),
    ]);

    let walletTotal = 0;
    try {
      const { data: w } = await sb.from("wallets").select("balance");
      walletTotal = (w || []).reduce((s: number, r: any) => s + Number(r.balance || 0), 0);
    } catch { /* ignore */ }

    let recentTitles: string[] = [];
    try {
      const { data } = await sb.from("blog_posts").select("title,published,created_at")
        .order("created_at", { ascending: false }).limit(10);
      recentTitles = (data || []).map((p: any) => `${p.title}${p.published ? "" : " (draft)"}`);
    } catch { /* ignore */ }

    const snapshot = `LIVE PLATFORM SNAPSHOT (generated ${new Date().toISOString().slice(0, 16)}):
Users: ${users} total, ${usersWeek} new in last 7 days
Blog: ${posts} posts (${postsPublished} published), ${postsWeek} created in last 7 days
Recent posts: ${recentTitles.join("; ") || "none"}
Business directory: ${businesses} approved, ${businessesPending} awaiting approval
Products listed: ${products}
Community forum: ${forumPosts} threads, ${forumWeek} new this week
Sales pages: ${salesPages} active | Leads: ${leads} total, ${leadsWeek} this week
Banner ads: ${ads} approved, ${adsPending} pending review
Unread contact messages: ${contacts}
Email subscribers: ${subscribers}
Learning hub: ${courses} published courses, ${enrollments} enrolments
Total wallet balance held: NGN ${walletTotal.toLocaleString()}
30-day window starts: ${month.slice(0, 10)}`;

    const messages = [
      {
        role: "system",
        content:
          "You are the AI General Administrator of Bethelincovibe TV, a Nigerian business media and directory platform. " +
          "You advise the site owner using the live snapshot provided. Be direct, specific and numeric. " +
          "Plain text only — no markdown, no asterisks. Structure answers as short labelled lines or numbered steps. " +
          "When asked what to do, give 3-5 prioritised actions tied to the actual numbers, naming the admin screen to use " +
          "(Admin > Posts, Admin > Businesses, Admin > Ads, Admin > Notifications, Admin > AI Blogger, Admin > Settings). " +
          "Never invent statistics that are not in the snapshot; say when data is unavailable. " +
          "You are read-only: describe the action the admin should take rather than claiming you performed it.\n\n" +
          snapshot,
      },
      ...(Array.isArray(history) ? history.slice(-8).map((m: any) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: String(m.content || "").slice(0, 4000),
      })) : []),
      { role: "user", content: String(question || "Give me a health check of the platform and my top priorities.").slice(0, 2000) },
    ];

    const answer = await callAI(sb, messages);

    return new Response(JSON.stringify({ answer, snapshot }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    const code = e?.status === 402 ? "AI_CREDITS_EXHAUSTED" : e?.status === 429 ? "RATE_LIMITED" : "SERVICE_FAILED";
    const message = e?.status === 402
      ? "AI credits exhausted. Top up your AI balance to continue."
      : e?.status === 429
        ? "Rate limited — please try again shortly."
        : e?.message || "Administrator unavailable";
    return new Response(JSON.stringify({ error: code, message }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
