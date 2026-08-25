import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function GoogleAnalytics() {
  const location = useLocation();

  const { data: gaId } = useQuery({
    queryKey: ["site-settings-ga"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("value").eq("key", "ga_measurement_id").maybeSingle();
      return data?.value || "";
    },
    staleTime: 1000 * 60 * 30,
  });

  // Load GA script once
  useEffect(() => {
    if (!gaId) return;
    if (document.querySelector(`script[src*="gtag/js?id=${gaId}"]`)) return;

    const script = document.createElement("script");
    script.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
    script.async = true;
    script.onerror = () => {
      // Gracefully ignore script loading errors (e.g. ad blockers or offline mode)
    };
    document.head.appendChild(script);

    const inline = document.createElement("script");
    inline.textContent = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${gaId}');`;
    document.head.appendChild(inline);
  }, [gaId]);

  // Track page views
  useEffect(() => {
    if (!gaId || !(window as any).gtag) return;
    (window as any).gtag("config", gaId, { page_path: location.pathname + location.search });
  }, [location, gaId]);

  return null;
}
