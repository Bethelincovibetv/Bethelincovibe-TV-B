import { useEffect } from "react";

// Known aggressive popunder and malware ad networks
const BLOCKED_PATTERNS = [
  /adsterra/i,
  /alwingulla/i,
  /highperformancegate/i,
  /effectivecpmgate/i,
  /pl[0-9]{5,}\./i,
  /onclickalgo/i,
  /popunder/i,
];

function isBlocked(str: string): boolean {
  if (!str) return false;
  return BLOCKED_PATTERNS.some((pattern) => pattern.test(str));
}

function purgeAdElements() {
  if (typeof document === "undefined") return;

  // 1. Remove blocked script tags
  const scripts = document.querySelectorAll("script");
  scripts.forEach((script) => {
    const src = script.src || "";
    const content = script.textContent || "";
    const dataset = Object.values(script.dataset || {}).join(" ");
    if (isBlocked(src) || isBlocked(content) || isBlocked(dataset)) {
      script.remove();
    }
  });

  // 2. Remove blocked iframes
  const iframes = document.querySelectorAll("iframe");
  iframes.forEach((iframe) => {
    const src = iframe.src || "";
    const name = iframe.name || "";
    const title = iframe.title || "";
    const id = iframe.id || "";
    const className = typeof iframe.className === "string" ? iframe.className : "";
    if (
      isBlocked(src) ||
      isBlocked(name) ||
      isBlocked(title) ||
      isBlocked(id) ||
      isBlocked(className)
    ) {
      iframe.remove();
    }
  });

  // 3. Remove blocked meta tags or custom divs
  const metas = document.querySelectorAll('meta[data-adsterra], meta[name*="adsterra" i]');
  metas.forEach((meta) => meta.remove());

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
