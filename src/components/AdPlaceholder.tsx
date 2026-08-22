import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  placement: "header" | "footer" | "sidebar" | "in_article";
  className?: string;
}

export default function AdPlaceholder({ placement, className = "" }: Props) {
  const settingKey = `ad_${placement}`;
  const location = useLocation();
  let isUserAdmin = false;
  try {
    const auth = useAuth();
    isUserAdmin = auth?.isAdmin ?? false;
  } catch {
    // ignore
  }
  const isAdmin = isUserAdmin || location.pathname.startsWith("/admin");

  const { data: adHtml } = useQuery({
    queryKey: ["ad-placement", settingKey],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("value").eq("key", settingKey).maybeSingle();
      return data?.value || "";
    },
    staleTime: 1000 * 60 * 10,
    enabled: !isAdmin,
  });

  if (isAdmin || !adHtml) return null;

  return (
    <div className={className} dangerouslySetInnerHTML={{ __html: adHtml }} />
  );
}
