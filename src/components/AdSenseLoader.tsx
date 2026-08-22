import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "react-router-dom";

export default function AdSenseLoader() {
  const [client, setClient] = useState<string | null>(null);
  const location = useLocation();
  let isAdmin = false;
  try {
    const auth = useAuth();
    isAdmin = auth?.isAdmin ?? false;
  } catch {
    // ignore
  }

  const isInAdminPortal = isAdmin || location.pathname.startsWith("/admin");

  useEffect(() => {
    const fetchSetting = async () => {
      try {
        const { data } = await supabase
          .from("site_settings")
          .select("value")
          .eq("key", "adsense_client_id")
          .single();

        if (data?.value && typeof data.value === "string" && data.value.trim().length > 0) {
          setClient(data.value.trim());
        }
      } catch {
        // Ignore
      }
    };

    fetchSetting();
  }, []);

  useEffect(() => {
    if (isInAdminPortal) {
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
      document.head.appendChild(script);
    }
  }, [client, isInAdminPortal]);

  return null;
}
