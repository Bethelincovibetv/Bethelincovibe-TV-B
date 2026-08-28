import { useEffect, useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { recordInteractionEvent } from "@/lib/analyticsTracker";

/** Floating "Join our WhatsApp community" pill. Reads URL from site_settings.whatsapp_community_url. */
export default function WhatsAppCommunityBanner() {
  const [url, setUrl] = useState("");
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setDismissed(sessionStorage.getItem("wa_community_dismissed") === "1");
    supabase.from("site_settings").select("value").eq("key", "whatsapp_community_url").maybeSingle()
      .then(({ data }) => { if (data?.value) setUrl(data.value); });
  }, []);

  if (!url || dismissed) return null;

  const handleClick = () => {
    recordInteractionEvent({
      eventName: "whatsapp_community_popup_click",
      category: "popup_click",
      source: "floating_popup",
      metadata: { target_url: url },
    });
  };

  return (
    <div className="fixed bottom-32 md:bottom-6 right-3 z-40 max-w-[260px]">
      <a
        href={url}
        target="_blank"
        rel="noopener"
        onClick={handleClick}
        className="group flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full shadow-xl pl-3 pr-4 py-2.5 transition"
      >
        <MessageCircle className="h-4 w-4 flex-shrink-0" />
        <span className="text-xs font-semibold">Join our WhatsApp community</span>
      </a>
      <button
        aria-label="Dismiss"
        onClick={() => { sessionStorage.setItem("wa_community_dismissed", "1"); setDismissed(true); }}
        className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-background border shadow flex items-center justify-center hover:bg-muted"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}