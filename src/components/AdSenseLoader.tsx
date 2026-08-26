import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "react-router-dom";

export default function AdSenseLoader() {
  const [client, setClient] = useState<string | null>(null);
  const location = useLocation();
  let suppressAds = false;
  try {
    const auth = useAuth();
    const email = auth?.user?.email?.toLowerCase();
    suppressAds = auth?.isAdmin || email === "bethelgoodgift3@gmail.com" || email === "goodgiftdigital@gmail.com";
  } catch {
    // ignore
  }

  const isInAdminPortal = suppressAds || location.pathname.startsWith("/admin");

  const { data: adSettings } = useQuery({
    queryKey: ["ad-settings-adsense"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("key, value")
        .in("key", ["adsense_client_id", "ads_global_enabled", "ads_provider_adsense"]);
      const map: Record<string, string> = {};
      data?.forEach((s: any) => { map[s.key] = s.value || ""; });
      return map;
    },
    staleTime: 1000 * 60 * 2,
  });

  const globalDisabled = adSettings?.ads_global_enabled === "false";
  const providerDisabled = adSettings?.ads_provider_adsense === "false";
  const isAdActive = !!adSettings && !globalDisabled && !providerDisabled && !isInAdminPortal;

  useEffect(() => {
    if (adSettings?.adsense_client_id && adSettings.adsense_client_id.trim().length > 0) {
      setClient(adSettings.adsense_client_id.trim());
    }
  }, [adSettings]);

  useEffect(() => {
    if (!isAdActive) {
      const existing = document.getElementById("adsense-script") || document.querySelector('script[data-adsense="true"]');
      if (existing) existing.remove();
      return;
    }

    if (!client) return;

    const scriptId = "adsense-script";
    if (!document.getElementById(scriptId)) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`;
      script.async = true;
      script.crossOrigin = "anonymous";
      script.dataset.adsense = "true";
      script.onerror = () => {
        // Gracefully ignore ad blocker or network errors
      };
      document.head.appendChild(script);
    }
  }, [client, isAdActive]);

  return null;
}

