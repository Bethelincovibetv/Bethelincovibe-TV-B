import { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useLocation } from "react-router-dom";

/**
 * Best-effort Google AdSense click tracker.
 * Google ads are cross-origin iframes, so click events can't be read directly.
 * Trick: when a user clicks an ad iframe the window loses focus and the
 * iframe becomes document.activeElement. We watch for that pattern.
 */
export default function AdClickTracker() {
  const { user } = useAuth();
  const location = useLocation();
  const isAdmin = location.pathname.startsWith("/admin");
  const lastHoverIframe = useRef<HTMLIFrameElement | null>(null);
  const crediting = useRef(false);

  useEffect(() => {
    if (!user || isAdmin) return;

    const isAdIframe = (el: Element | null): el is HTMLIFrameElement => {
      if (!el || el.tagName !== "IFRAME") return false;
      const ifr = el as HTMLIFrameElement;
      const src = (ifr.src || ifr.getAttribute("data-google-container-id") || "") + " " + (ifr.id || "") + " " + (ifr.name || "");
      return /googleads|googlesyndication|adsbygoogle|aswift_|google_ads/i.test(src);
    };

    const onMouseOver = (e: MouseEvent) => {
      const t = e.target as Element;
      if (isAdIframe(t)) lastHoverIframe.current = t as HTMLIFrameElement;
    };

    const credit = async (slot?: string) => {
      if (crediting.current) return;
      crediting.current = true;
      try {
        const { data, error } = await supabase.rpc("credit_ad_click", {
          _page_path: window.location.pathname,
          _ad_slot: slot || null,
        });
        if (error) return;
        const res = data as any;
        if (res?.success) {
          toast.success(`+₦${res.amount} ad reward credited!`);
        }
      } finally {
        setTimeout(() => { crediting.current = false; }, 1500);
      }
    };

    const onBlur = () => {
      setTimeout(() => {
        const active = document.activeElement;
        if (isAdIframe(active) || (lastHoverIframe.current && lastHoverIframe.current === active)) {
          const ifr = active as HTMLIFrameElement;
          credit(ifr.id || ifr.name || undefined);
        }
      }, 50);
    };

    window.addEventListener("mouseover", onMouseOver, true);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("mouseover", onMouseOver, true);
      window.removeEventListener("blur", onBlur);
    };
  }, [user, isAdmin]);

  return null;
}