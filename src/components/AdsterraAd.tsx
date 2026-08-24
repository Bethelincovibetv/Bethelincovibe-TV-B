import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useFeatureFlags } from "@/contexts/FeatureFlagsContext";

/**
 * Renders an Adsterra ad unit inside a sandboxed iframe.
 * `slot` maps to a `adsterra_show_<slot>` site setting toggled by admin.
 * Blog slots default to ON; every other slot defaults to OFF.
 */
type Slot =
  | "blog_top"
  | "blog_bottom"
  | "home_top"
  | "home_bottom"
  | "directory"
  | "forum"
  | "sales_directory"
  | "learn";

const DEFAULT_ON: Slot[] = ["blog_top", "blog_bottom"];

export default function AdsterraAd({
  slot = "blog_top",
  className = "",
  height = 280,
}: {
  slot?: Slot;
  className?: string;
  height?: number;
}) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const location = useLocation();
  const { flags } = useFeatureFlags();
  let suppressAds = false;
  try {
    const auth = useAuth();
    suppressAds = auth?.isAdmin || auth?.user?.email?.toLowerCase() === "bethelgoodgift3@gmail.com";
  } catch {}

  const isAdmin = suppressAds || location.pathname.startsWith("/admin");
  const featureDisabled = flags.advertise === false;

  const settingKey = `adsterra_show_${slot}`;

  const { data } = useQuery({
    queryKey: ["adsterra-slot", slot],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("key, value")
        .in("key", ["adsterra_body", settingKey, "ads_global_enabled", "ads_provider_adsterra"]);
      const map: Record<string, string> = {};
      data?.forEach((r: any) => { map[r.key] = r.value || ""; });
      return map;
    },
    staleTime: 1000 * 60 * 2,
    enabled: !isAdmin && !featureDisabled,
  });

  const globalDisabled = data?.ads_global_enabled === "false";
  const providerDisabled = data?.ads_provider_adsterra === "false";
  const adHtml = data?.adsterra_body || "";
  const toggleValue = data?.[settingKey];
  const slotDisabled = toggleValue === "false" || toggleValue === "off" || toggleValue === "0";
  const slotEnabled = toggleValue === undefined || toggleValue === ""
    ? DEFAULT_ON.includes(slot)
    : ["true", "on", "1"].includes(toggleValue);

  const enabled = !featureDisabled && !!data && !globalDisabled && !providerDisabled && !slotDisabled && slotEnabled && !!adHtml;

  useEffect(() => {
    if (isAdmin || !enabled || !adHtml || !iframeRef.current) return;
    const iframe = iframeRef.current;
    const doc = iframe.contentDocument;
    if (!doc) return;
    doc.open();
    doc.write(`<!doctype html><html><head><meta charset="utf-8"><style>
      html,body{margin:0;padding:0;background:transparent;font-family:system-ui,-apple-system,sans-serif;}
      body{display:flex;align-items:center;justify-content:center;overflow:hidden;}
      *{max-width:100%;}
    </style></head><body>${adHtml}</body></html>`);
    doc.close();
  }, [adHtml, isAdmin, enabled]);

  if (isAdmin || !enabled || !adHtml) return null;
  return (
    <div className={`my-6 text-center ${className}`}>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Advertisement</div>
      <iframe
        ref={iframeRef}
        title="Advertisement"
        style={{ width: "100%", height, border: 0, display: "block" }}
        sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox allow-same-origin"
        scrolling="no"
      />
    </div>
  );
}
