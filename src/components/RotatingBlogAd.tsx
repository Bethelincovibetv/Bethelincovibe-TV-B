import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/** Random native banner from our own ad server. Shown on blog pages. */
export default function RotatingBlogAd({ placement = "blog" }: { placement?: string }) {
  const [ad, setAd] = useState<any>(null);
  const [watermark, setWatermark] = useState<{text?: string; url?: string}>({});
  let suppressAds = false;
  try {
    const auth = useAuth();
    const email = auth?.user?.email?.toLowerCase();
    suppressAds = auth?.isAdmin || email === "bethelgoodgift3@gmail.com" || email === "goodgiftdigital@gmail.com";
  } catch {}

  useEffect(() => {
    if (suppressAds) return;
    let cancelled = false;
    (async () => {
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const [wmRes, adRes] = await Promise.all([
          supabase.from("site_settings").select("key,value").in("key", [
            "ad_watermark_text",
            "ad_watermark_url",
            "ads_global_enabled",
            "ads_provider_native",
            "ad_server_enabled"
          ]),
          supabaseUrl
            ? fetch(`${supabaseUrl}/functions/v1/ad-server?placement=${placement}&page=${encodeURIComponent(window.location.pathname)}`).catch(() => null)
            : Promise.resolve(null),
        ]);

        const m: Record<string, string> = {};
        (wmRes.data || []).forEach((r: any) => { m[r.key] = r.value || ""; });

        if (m.ads_global_enabled === "false" || m.ads_provider_native === "false" || m.ad_server_enabled === "false") {
          if (!cancelled) setAd(null);
          return;
        }

        if (adRes && typeof adRes.json === "function") {
          const d = await adRes.json().catch(() => null);
          if (!cancelled && d?.ad) setAd(d.ad);
        }
        if (!cancelled) {
          setWatermark({ text: m.ad_watermark_text, url: m.ad_watermark_url });
        }
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [placement, suppressAds]);

  if (suppressAds || !ad) return null;
  return (
    <div className="my-6 text-center">
      <a href={ad.click_url} target="_blank" rel="noopener sponsored" className="inline-block relative">
        <img src={ad.image_url} alt={ad.title} loading="lazy" className="mx-auto max-w-full h-auto rounded-xl shadow-md" />
        {(watermark.url || watermark.text) && (
          <span className="absolute bottom-2 right-2 bg-black/55 text-white text-[10px] px-2 py-1 rounded-md flex items-center gap-1 pointer-events-none">
            {watermark.url && <img src={watermark.url} alt="" className="h-3 w-3 object-contain" />}
            {watermark.text || "Bethelincovibe TV"}
          </span>
        )}
        <p className="text-[11px] text-muted-foreground mt-1">Ad · {ad.title}</p>
      </a>
    </div>
  );
}