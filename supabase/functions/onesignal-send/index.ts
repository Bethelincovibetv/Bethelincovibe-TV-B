// OneSignal v16 REST API sender.
// Modes:
//   all       - broadcast to "Subscribed Users" segment
//   users     - target by our app's user_ids (uses external_id alias via OneSignal.login)
//   players   - direct subscription IDs
//   segments  - custom segment list
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const ONESIGNAL_API = "https://api.onesignal.com/notifications?c=push";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const title: string = (body.title || "").toString().trim();
    const message: string = (body.message || body.body || "").toString().trim();
    const url: string | undefined = body.url || undefined;
    const mode: string = body.mode || "all";

    if (!title || !message) {
      return json({ error: "title and message required" }, 400);
    }

    const { data: settingsRows } = await sb
      .from("site_settings")
      .select("key,value")
      .in("key", ["onesignal_app_id", "site_logo_url"]);
    const settings: Record<string, string> = {};
    settingsRows?.forEach((r: any) => (settings[r.key] = r.value || ""));

    const appId = (settings.onesignal_app_id || "9feae3e2-da34-441b-8bf6-ecffe4040375").trim();
    const restKey = Deno.env.get("ONESIGNAL_REST_API_KEY");
    if (!appId || !restKey) {
      return json({ error: "OneSignal not configured (missing app id or REST key)" }, 400);
    }

    const icon = settings.site_logo_url || `${new URL(req.url).origin}/logo.png`;
    const absoluteUrl = (() => {
      if (!url) return undefined;
      if (/^https?:\/\//i.test(url)) return url;
      return url;
    })();

    const payload: Record<string, unknown> = {
      app_id: appId,
      target_channel: "push",
      headings: { en: title },
      contents: { en: message },
      chrome_web_icon: icon,
      firefox_icon: icon,
      large_icon: icon,
      web_url: absoluteUrl,
      url: absoluteUrl,
      ttl: 259200,
    };

    if (mode === "all") {
      payload.included_segments = ["All"];
    } else if (mode === "segments") {
      payload.included_segments = body.segments || ["All"];
    } else if (mode === "players") {
      payload.include_subscription_ids = body.player_ids || [];
      if (!(payload.include_subscription_ids as string[]).length) {
        return json({ sent: 0, note: "No player IDs supplied" });
      }
    } else if (mode === "users") {
      const userIds: string[] = (body.user_ids || []).map(String).filter(Boolean);
      if (!userIds.length) return json({ sent: 0, note: "No user IDs supplied" });

      // IMPORTANT: user-targeted sends use only the OneSignal external_id alias.
      // Do not mix in FCM tokens or profile fields as OneSignal subscription IDs.
      // OneSignal.login(user.id) associates every subscription for that user with this alias.
      payload.include_aliases = { external_id: userIds };
      payload.target_channel = "push";
    } else {
      return json({ error: "invalid mode" }, 400);
    }

    if (body.send_after) payload.send_after = body.send_after;

    const osRes = await fetch(ONESIGNAL_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Authorization: `Basic ${restKey}`,
      },
      body: JSON.stringify(payload),
    });
    const osData = await osRes.json().catch(() => ({}));

    const authHeader = req.headers.get("Authorization");
    let sentBy: string | null = null;
    if (authHeader) {
      const { data: { user } } = await sb.auth.getUser(authHeader.replace("Bearer ", ""));
      sentBy = user?.id ?? null;
    }
    await sb.from("push_notifications").insert({
      title, body: message, url: absoluteUrl ?? null,
      sent_by: sentBy,
      recipient_count: osData.recipients || 0,
    });

    if (!osRes.ok) {
      console.error("OneSignal API error", osData);
      return json({ ok: false, error: osData.errors || osData, status: osRes.status }, 400);
    }

    return json({
      ok: true,
      recipients: osData.recipients || 0,
      onesignal_id: osData.id,
      errors: osData.errors,
    });
  } catch (e) {
    console.error("onesignal-send error", e);
    return json({ error: e instanceof Error ? e.message : "Unknown" }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
