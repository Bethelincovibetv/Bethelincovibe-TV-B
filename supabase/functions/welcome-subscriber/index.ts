import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SubscriberRecord {
  email?: string;
  name?: string;
  full_name?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY") || "";
    const resendApiKey = Deno.env.get("RESEND_API_KEY") || "";

    const sb = createClient(supabaseUrl, supabaseServiceKey);

    let bodyData: any = {};
    try {
      bodyData = await req.json();
    } catch {
      bodyData = {};
    }

    // Support Supabase Database Webhook trigger format AND direct invoke format
    const record: SubscriberRecord = bodyData.record || bodyData;
    const email = record.email || bodyData.email || "";
    const rawName = record.name || record.full_name || bodyData.name || bodyData.subscriberName || "";
    const cleanName = rawName ? rawName.trim() : "";
    const displayName = cleanName || "Valued Reader";

    if (!email) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required subscriber email" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch top 3 latest published blog posts to feature in the template
    let featuredBlogs: Array<{ title: string; slug: string; excerpt: string; featured_image?: string; reading_time_minutes?: number }> = [];

    try {
      const { data: posts } = await sb
        .from("blog_posts")
        .select("title, slug, excerpt, featured_image, reading_time_minutes")
        .eq("published", true)
        .order("published_at", { ascending: false })
        .limit(3);

      if (posts && posts.length > 0) {
        featuredBlogs = posts;
      }
    } catch (dbErr) {
      console.warn("Notice fetching blog posts for welcome email:", dbErr);
    }

    // Fallback blogs if none returned from database
    if (featuredBlogs.length === 0) {
      featuredBlogs = [
        {
          title: "10 Proven Strategies to Scale Your Business in Nigeria & West Africa",
          slug: "10-proven-strategies-to-scale-your-business",
          excerpt: "Discover essential growth tactics, cash flow management tips, and marketing frameworks for modern entrepreneurs.",
          featured_image: "https://images.unsplash.com/photo-1553729459-efe14ef6055d?auto=format&fit=crop&w=800&q=80",
          reading_time_minutes: 5,
        },
        {
          title: "How to Secure Angel Funding & Startup Grants in 2026",
          slug: "securing-angel-funding-and-grants",
          excerpt: "A comprehensive guide on pitch decks, investor metrics, and navigating seed funding in emerging markets.",
          featured_image: "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=800&q=80",
          reading_time_minutes: 7,
        },
        {
          title: "Digital Marketing Blueprint: Turning Social Traffic into Paying Clients",
          slug: "digital-marketing-blueprint-paying-clients",
          excerpt: "Learn how to build high-converting landing pages and automate customer acquisition effortlessly.",
          featured_image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80",
          reading_time_minutes: 6,
        },
      ];
    }

    const appOrigin = "https://bethelincovibe.tv";

    // Build Blog Cards HTML
    const blogCardsHtml = featuredBlogs
      .map((post) => {
        const postUrl = `${appOrigin}/blog/${post.slug}`;
        const imageUrl = post.featured_image || "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?auto=format&fit=crop&w=800&q=80";
        const readTime = post.reading_time_minutes ? `${post.reading_time_minutes} min read` : "Quick read";

        return `
          <div style="background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.04);">
            <img src="${imageUrl}" alt="${post.title}" style="width: 100%; height: 160px; object-fit: cover; display: block;" />
            <div style="padding: 16px;">
              <span style="font-size: 11px; font-weight: 700; color: #6366f1; text-transform: uppercase; tracking: 0.5px;">🔥 ${readTime}</span>
              <h3 style="margin: 6px 0 8px; font-size: 16px; font-weight: 700; color: #0f172a; line-height: 1.4;">${post.title}</h3>
              <p style="margin: 0 0 12px; font-size: 13px; color: #64748b; line-height: 1.5;">${post.excerpt || "Read this featured insight on Bethelincovibe TV."}</p>
              <a href="${postUrl}" style="display: inline-block; background: #4f46e5; color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 700; padding: 8px 16px; border-radius: 8px;">Read Article →</a>
            </div>
          </div>
        `;
      })
      .join("");

    // Build Full Responsive HTML Template
    const htmlBody = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to Bethelincovibe TV</title>
          <style>
            body { font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
            .container { max-width: 620px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 8px 30px rgba(0,0,0,0.08); border: 1px solid #e2e8f0; }
            .header { background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #2563eb 100%); padding: 36px 24px; text-align: center; color: #ffffff; }
            .header h1 { margin: 0; font-size: 26px; font-weight: 900; letter-spacing: -0.5px; }
            .header p { margin: 8px 0 0; opacity: 0.92; font-size: 14px; font-weight: 500; }
            .content { padding: 32px 24px; }
            .badge { display: inline-block; background: #e0e7ff; color: #3730a3; font-weight: 800; font-size: 11px; padding: 6px 14px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 16px; }
            .hero-greeting { font-size: 22px; font-weight: 800; color: #0f172a; margin-top: 0; margin-bottom: 12px; }
            .lead-text { font-size: 15px; color: #334155; line-height: 1.6; margin-bottom: 24px; }
            .section-title { font-size: 18px; font-weight: 800; color: #0f172a; margin: 28px 0 16px; padding-bottom: 8px; border-bottom: 2px solid #e0e7ff; }
            .perks-grid { display: table; width: 100%; margin-bottom: 24px; }
            .perk-item { padding: 12px; background: #f8fafc; border-radius: 12px; margin-bottom: 10px; border: 1px solid #f1f5f9; }
            .perk-title { font-weight: 700; font-size: 14px; color: #1e1b4b; }
            .perk-desc { font-size: 12px; color: #64748b; margin-top: 2px; }
            .main-cta { display: block; width: 100%; max-width: 280px; margin: 28px auto 10px; text-align: center; background: linear-gradient(135deg, #4f46e5, #7c3aed); color: #ffffff; text-decoration: none; font-weight: 800; font-size: 15px; padding: 14px 28px; border-radius: 12px; box-shadow: 0 4px 14px rgba(79,70,229,0.3); }
            .footer { background: #f1f5f9; padding: 24px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
            .footer a { color: #4f46e5; text-decoration: none; font-weight: 600; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Bethelincovibe TV</h1>
              <p>Your Premier Hub for Business, Tech & Startup Insights</p>
            </div>
            <div class="content">
              <span class="badge">✨ VIP Subscription Confirmed</span>
              <h2 class="hero-greeting">Welcome aboard, ${displayName}! 👋</h2>
              <p class="lead-text">
                Thank you for subscribing to <strong>Bethelincovibe TV</strong>! You're now officially connected to an exclusive community of business leaders, entrepreneurs, and innovators.
              </p>

              <div class="section-title">💡 What You'll Receive in Your Inbox</div>
              <div class="perks-grid">
                <div class="perk-item">
                  <div class="perk-title">🚀 Daily Startup & Marketing Guides</div>
                  <div class="perk-desc">Actionable strategies for business growth, sales page optimization, and branding.</div>
                </div>
                <div class="perk-item">
                  <div class="perk-title">🛍️ Verified Seller & Product Directory</div>
                  <div class="perk-desc">Exclusive deals on top business tools, verified listings, and marketplace highlights.</div>
                </div>
                <div class="perk-item">
                  <div class="perk-title">💰 Investment & Funding Alerts</div>
                  <div class="perk-desc">Get notified early about grant opportunities, loans, and investor roundups.</div>
                </div>
              </div>

              <div class="section-title">📰 Trending Blogs You Shouldn't Miss</div>
              <div>
                ${blogCardsHtml}
              </div>

              <a href="${appOrigin}/blog" class="main-cta">Explore All Articles →</a>
            </div>

            <div class="footer">
              <p><strong>Bethelincovibe TV</strong> — Empowering Businesses across Nigeria & Worldwide</p>
              <p>Lagos, Nigeria | You received this because you subscribed at <a href="${appOrigin}">${appOrigin}</a></p>
              <p style="margin-top: 12px; font-size: 11px; opacity: 0.8;">
                <a href="${appOrigin}/unsubscribe?email=${encodeURIComponent(email)}">Unsubscribe from these emails</a>
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    let emailSent = false;
    let providerUsed = "template_generated";

    // Send via Resend API if API Key is set in Supabase Secrets
    if (resendApiKey) {
      try {
        const resendResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Bethelincovibe TV <onboarding@resend.dev>",
            to: [email],
            subject: `Welcome to Bethelincovibe TV, ${displayName}! 🚀`,
            html: htmlBody,
          }),
        });

        if (resendResponse.ok) {
          emailSent = true;
          providerUsed = "resend";
        } else {
          const resData = await resendResponse.json().catch(() => ({}));
          console.warn("Resend API response warning:", resData);
        }
      } catch (sendErr) {
        console.warn("Notice triggering Resend email API:", sendErr);
      }
    }

    // Record welcome email event in email logs database if available
    try {
      await sb.from("broadcast_logs").insert({
        subject: `Welcome Welcome Email for ${displayName}`,
        sender_email: "system@bethelincovibe.tv",
        recipient_count: 1,
        success_count: 1,
        created_at: new Date().toISOString(),
      });
    } catch {
      // Ignore if table schema varies
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Welcome email successfully triggered for ${displayName} (${email})`,
        emailSent,
        providerUsed,
        recipient: { email, name: displayName },
        featuredBlogsCount: featuredBlogs.length,
        htmlBody,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    console.error("Welcome subscriber Edge Function error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message || "Failed processing welcome subscriber event" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
