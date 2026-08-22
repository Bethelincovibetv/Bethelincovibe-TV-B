import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/** Random native banner from our own ad server. Shown on blog pages. */
export default function RotatingBlogAd({ placement = "blog" }: { placement?: string }) {
  const [ad, setAd] = useState<any>(null);
  const [watermark, setWatermark] = useState<{text?: string; url?: string}>({});
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ad-server?placement=${placement}&page=${encodeURIComponent(window.location.pathname)}`;
        const [res, wm] = await Promise.all([
          fetch(url),
          supabase.from("site_settings").select("key,value").in("key", ["ad_watermark_text","ad_watermark_url"]),
        ]);
        const d = await res.json();
        if (!cancelled && d?.ad) setAd(d.ad);
        if (!cancelled) {
          const m: any = {};
          (wm.data || []).forEach((r:any)=>{ m[r.key] = r.value; });
          setWatermark({ text: m.ad_watermark_text, url: m.ad_watermark_url });
        }
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [placement]);

  if (!ad) return null;
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