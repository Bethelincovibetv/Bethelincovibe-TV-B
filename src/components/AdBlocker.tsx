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
  // Never block internal app scripts, assets, or essential platforms
  if (
    s.startsWith("/") ||
    s.includes("localhost") ||
    s.includes("run.app") ||
    s.includes("supabase.co") ||
    s.includes("google") ||
    s.includes("onesignal") ||
    s.includes("googleapis") ||
    s.includes("gstatic")
  ) {
    return false;
  }
  return BLOCKED_DOMAINS.some((domain) => s.includes(domain));
}

function purgeAdElements() {
  if (typeof document === "undefined") return;

  try {
    // 1. Remove blocked external script tags ONLY outside #root
    const scripts = document.querySelectorAll("head > script[src], body > script[src]");
    scripts.forEach((script) => {
      const src = script.getAttribute("src") || "";
      if (isBlocked(src)) {
        try { script.remove(); } catch {}
      }
    });

    // 2. Remove blocked external rogue iframes outside #root
    const iframes = document.querySelectorAll("body > iframe, head > iframe");
    iframes.forEach((iframe) => {
      const src = iframe.getAttribute("src") || "";
      const name = iframe.getAttribute("name") || "";
      const id = iframe.getAttribute("id") || "";
      if (isBlocked(src) || isBlocked(name) || isBlocked(id)) {
        try { iframe.remove(); } catch {}
      }
    });
  } catch (err) {
    console.warn("AdBlocker purge safe notice:", err);
  }
}

/**
 * AdBlocker utility component
 * Safely purges third-party rogue scripts without interfering with React's DOM hierarchy.
 */
export default function AdBlocker() {
  useEffect(() => {
    // Initial purge
    purgeAdElements();

    let observer: MutationObserver | null = null;
    try {
      observer = new MutationObserver(() => {
        purgeAdElements();
      });

      // Observe head and body for external script insertions
      if (document.head) {
        observer.observe(document.head, { childList: true });
      }
    } catch {
      // Ignore if MutationObserver is unavailable
    }

    return () => {
      if (observer) {
        observer.disconnect();
      }
    };
  }, []);

  return null;
}

