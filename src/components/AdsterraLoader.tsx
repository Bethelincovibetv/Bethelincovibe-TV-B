import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

/** Injects Adsterra head scripts (site-verification / anti-adblock / social bar) when the admin has added code. */
export default function AdsterraLoader() {
  const location = useLocation();
  let suppressAds = false;
  try {
    const auth = useAuth();
    suppressAds = auth?.isAdmin || auth?.user?.email?.toLowerCase() === "bethelgoodgift3@gmail.com";
  } catch {}

  const isAdmin = suppressAds || location.pathname.startsWith("/admin");
  const { data: settings } = useQuery({
    queryKey: ["site-settings-adsterra"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("key, value")
        .in("key", ["adsterra_head", "adsterra_body", "ads_global_enabled", "ads_provider_adsterra"]);
      const map: Record<string, string> = {};
      data?.forEach((s: any) => { map[s.key] = s.value || ""; });
      return map;
    },
    staleTime: 1000 * 60 * 2,
  });

  const globalDisabled = settings?.ads_global_enabled === "false";
  const providerDisabled = settings?.ads_provider_adsterra === "false";
  const shouldRun = !isAdmin && !!settings && !globalDisabled && !providerDisabled;

  useEffect(() => {
    if (!shouldRun) {
      document.querySelectorAll('script[data-adsterra="head"], meta[data-adsterra="head"]').forEach((n) => n.remove());
      return;
    }
    const head = settings?.adsterra_head;
    if (!head) return;
    if (document.querySelector('script[data-adsterra="head"]')) return;

    const parser = new DOMParser();
    const doc = parser.parseFromString(head, "text/html");
    doc.querySelectorAll("script").forEach((s) => {
      const script = document.createElement("script");
      if (s.src) script.src = s.src;
      if (s.type) script.type = s.type;
      Array.from(s.attributes).forEach((attr) => {
        if (!["src", "type"].includes(attr.name)) script.setAttribute(attr.name, attr.value);
      });
      if (s.textContent) script.textContent = s.textContent;
      script.async = true;
      script.dataset.adsterra = "head";
      document.head.appendChild(script);
    });
    doc.querySelectorAll("meta").forEach((m) => {
      const meta = document.createElement("meta");
      Array.from(m.attributes).forEach((a) => meta.setAttribute(a.name, a.value));
      meta.dataset.adsterra = "head";
      document.head.appendChild(meta);
    });
  }, [settings?.adsterra_head, isAdmin, shouldRun]);

  return null;
}
