import { useEffect, useLayoutEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useFeatureFlags } from "@/contexts/FeatureFlagsContext";

const CACHE_KEY = "thirdparty_ads_cache_v1";

/**
 * Injects Monetag & Start.io ad scripts (head + body) when admin has added code.
 * - Head scripts (verification / anti-adblock / social bar) inject into <head>
 * - Body scripts inject into <body> once per provider
 */
const KEYS = ["monetag_head", "monetag_body", "startio_head", "startio_body"] as const;

function injectHtml(html: string, target: HTMLElement, marker: string) {
  if (!html || document.querySelector(`[data-thirdparty-ad="${marker}"]`)) return;
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const nodes = [...doc.head.childNodes, ...doc.body.childNodes];
  nodes.forEach((n) => {
    if (n.nodeType === 1) {
      const el = n as HTMLElement;
      if (el.tagName === "SCRIPT") {
        const s = document.createElement("script");
        const src = (el as HTMLScriptElement).src;
        if (src) s.src = src;
        Array.from(el.attributes).forEach((a) => {
          if (!["src"].includes(a.name)) s.setAttribute(a.name, a.value);
        });
        if (el.textContent) s.textContent = el.textContent;
        s.async = true;
        s.onerror = () => {};
        s.dataset.thirdpartyAd = marker;
        target.appendChild(s);
      } else {
        const clone = el.cloneNode(true) as HTMLElement;
        clone.dataset.thirdpartyAd = marker;
        target.appendChild(clone);
      }
    }
  });
}

export default function ThirdPartyAdLoader() {
  const location = useLocation();
  const { flags } = useFeatureFlags();
  let suppressAds = false;
  try {
    const auth = useAuth();
    const email = auth?.user?.email?.toLowerCase();
    suppressAds = auth?.isAdmin || email === "bethelgoodgift3@gmail.com" || email === "goodgiftdigital@gmail.com";
  } catch {}

  const isAdmin = suppressAds || location.pathname.startsWith("/admin");
  const featureDisabled = flags.advertise === false;

  // Synchronously inject the last-known verification/head snippets from
  // localStorage before React Query fetches — UNLESS ads are disabled.
  useLayoutEffect(() => {
    if (featureDisabled || isAdmin) {
      document.querySelectorAll('[data-thirdparty-ad]').forEach((n) => n.remove());
      return;
    }
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || "{}");
      if (cached.ads_global_enabled === "false") return;
      if (cached.ads_provider_monetag !== "false" && cached.monetag_head) injectHtml(cached.monetag_head, document.head, "monetag-head");
      if (cached.ads_provider_startio !== "false" && cached.startio_head) injectHtml(cached.startio_head, document.head, "startio-head");
    } catch {}
  }, [featureDisabled, isAdmin]);

  const { data: settings } = useQuery({
    queryKey: ["site-settings-thirdparty-ads"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("key, value")
        .in("key", [...KEYS, "ads_global_enabled", "ads_provider_monetag", "ads_provider_startio"] as string[]);
      const map: Record<string, string> = {};
      data?.forEach((s: any) => { map[s.key] = s.value || ""; });
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(map)); } catch {}
      return map;
    },
    staleTime: 1000 * 60 * 2,
    enabled: !featureDisabled && !isAdmin,
  });

  const globalDisabled = settings?.ads_global_enabled === "false";
  const monetagDisabled = globalDisabled || settings?.ads_provider_monetag === "false";
  const startioDisabled = globalDisabled || settings?.ads_provider_startio === "false";

  useEffect(() => {
    if (featureDisabled || isAdmin || globalDisabled) {
      document.querySelectorAll('[data-thirdparty-ad]').forEach((n) => n.remove());
      return;
    }
    if (!settings) return;

    if (!monetagDisabled) {
      if (settings.monetag_head) injectHtml(settings.monetag_head, document.head, "monetag-head");
      if (!isAdmin && settings.monetag_body) injectHtml(settings.monetag_body, document.body, "monetag-body");
    } else {
      document.querySelectorAll('[data-thirdparty-ad*="monetag"]').forEach((n) => n.remove());
    }

    if (!startioDisabled) {
      if (settings.startio_head) injectHtml(settings.startio_head, document.head, "startio-head");
      if (!isAdmin && settings.startio_body) injectHtml(settings.startio_body, document.body, "startio-body");
    } else {
      document.querySelectorAll('[data-thirdparty-ad*="startio"]').forEach((n) => n.remove());
    }
  }, [settings, isAdmin, featureDisabled, globalDisabled, monetagDisabled, startioDisabled]);

  return null;
}


