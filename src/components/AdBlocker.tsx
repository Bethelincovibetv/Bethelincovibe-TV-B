import { useEffect } from "react";

// Known aggressive popunder and malware ad network domains
const BLOCKED_DOMAINS = [
  "adsterra",
  "alwingulla",
  "highperformancegate",
  "effectivecpmgate",
  "onclickalgo",
  "popunder",
];

function isBlocked(str: string): boolean {
  if (!str) return false;
  const s = str.toLowerCase();
  // Never block internal app scripts or vite chunks
  if (s.startsWith("/") || s.includes("localhost") || s.includes("run.app") || s.includes("supabase.co") || s.includes("google") || s.includes("onesignal")) {
    return false;
  }
  return BLOCKED_DOMAINS.some((domain) => s.includes(domain));
}

function purgeAdElements() {
  if (typeof document === "undefined") return;

  // 1. Remove blocked external script tags
  const scripts = document.querySelectorAll("script[src]");
  scripts.forEach((script) => {
    const src = script.getAttribute("src") || "";
    if (isBlocked(src)) {
      script.remove();
    }
  });

  // 2. Remove blocked iframes
  const iframes = document.querySelectorAll("iframe");
  iframes.forEach((iframe) => {
    const src = iframe.getAttribute("src") || "";
    const name = iframe.getAttribute("name") || "";
    const id = iframe.getAttribute("id") || "";
    if (isBlocked(src) || isBlocked(name) || isBlocked(id)) {
      iframe.remove();
    }
  });

  // 3. Remove blocked adsterra containers
  const adContainers = document.querySelectorAll('[class*="adsterra" i], [id*="adsterra" i]');
  adContainers.forEach((el) => el.remove());
}


/**
 * AdBlocker utility component
 * Scans the DOM upon initial mount and watches for dynamically injected ad scripts/iframes
 * to immediately neutralize and remove them.
 */
export default function AdBlocker() {
  useEffect(() => {
    // Initial purge
    purgeAdElements();

    // Observe DOM mutations to prevent runtime injection of ad scripts/iframes
    let observer: MutationObserver | null = null;
    try {
      observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          if (mutation.addedNodes.length > 0) {
            purgeAdElements();
            break;
          }
        }
      });

      observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
      });
    } catch {
      // Ignore if MutationObserver is not available
    }

    return () => {
      if (observer) {
        observer.disconnect();
      }
    };
  }, []);

  return null;
}
