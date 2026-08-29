import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLocation } from "react-router-dom";

interface Props {
  placement: "header" | "footer" | "sidebar" | "in_article";
  className?: string;
}

export default function AdPlaceholder({ placement, className = "" }: Props) {
  const isHeader = placement === "header";
  const settingKey = `ad_${placement}`;
  const location = useLocation();

  // Exclude within admin backend management dashboard
  const isInAdminPortal = location.pathname.startsWith("/admin");

  const { data: settings } = useQuery({
    queryKey: ["ad-placement", settingKey],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("key, value")
        .in("key", [settingKey, "ads_global_enabled", "ads_provider_custom"]);
      const map: Record<string, string> = {};
      data?.forEach((r: any) => { map[r.key] = r.value || ""; });
      return map;
    },
    staleTime: 1000 * 60 * 2,
    enabled: !isInAdminPortal && !isHeader,
  });

  // Hard block for header placement ads as requested
  if (isHeader) return null;

  const globalDisabled = settings?.ads_global_enabled === "false";
  const providerDisabled = settings?.ads_provider_custom === "false";
  const adHtml = settings?.[settingKey] || "";

  // Block any adsterra content if present in custom placement
  const isAdsterra = /adsterra|alwingulla|highperformancegate/i.test(adHtml);

  if (isInAdminPortal || !settings || globalDisabled || providerDisabled || !adHtml || isAdsterra) return null;

  return (
    <div className={className} dangerouslySetInnerHTML={{ __html: adHtml }} />
  );
}
