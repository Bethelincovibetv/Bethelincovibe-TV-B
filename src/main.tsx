import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import ErrorBoundary from "./components/ErrorBoundary";
import { installBusinessGalleryLightbox } from "./lib/businessGalleryLightbox";
import { installAIMatchFloatingGuard } from "./lib/aiMatchFloatingGuard";

// Gracefully handle benign third-party or network rejections without crashing React
if (typeof window !== "undefined") {
  const safeToString = (val: any): string => {
    if (val === null || val === undefined) return "";
    if (val instanceof Error) return `${val.message} ${val.stack || ""}`;
    if (typeof val === "string") return val;
    if (typeof val === "object") {
      try {
        return JSON.stringify(val);
      } catch {
        return Object.prototype.toString.call(val);
      }
    }
    return String(val);
  };

  const isBenignError = (str: string) => {
    const s = (str || "").toLowerCase();
    return (
      s.includes("failed to fetch") || s.includes("fetch failed") || s.includes("network_error") ||
      s.includes("network error") || s.includes("load failed") || s.includes("onesignal") ||
      s.includes("google") || s.includes("ggd") || s.includes("ad_network") || s.includes("adsterra") ||
      s.includes("monetag") || s.includes("startio") || s.includes("aborted") ||
      s.includes("loading chunk") || s.includes("dynamically imported module") ||
      s.includes("permission_denied") || s.includes("caller does not have permission") ||
      s.includes("specialist agent query error") ||
      s.includes("could not reach cloud firestore backend") ||
      s.includes("cloud firestore backend") ||
      s.includes("@firebase/firestore") ||
      s.includes("code=unavailable") ||
      s.includes("the operation could not be completed") ||
      s.includes("offline mode until it is able to successfully connect")
    );
  };

  const origConsoleError = console.error;
  console.error = function (...args: any[]) {
    try {
      const fullMsg = args.map(safeToString).join(" ");
      if (isBenignError(fullMsg)) {
        return;
      }
    } catch {}
    origConsoleError.apply(console, args);
  };

  const origConsoleWarn = console.warn;
  console.warn = function (...args: any[]) {
    try {
      const fullMsg = args.map(safeToString).join(" ");
      if (isBenignError(fullMsg)) {
        return;
      }
    } catch {}
    origConsoleWarn.apply(console, args);
  };

  const origUnhandledRejection = window.onunhandledrejection;
  window.onunhandledrejection = function (event: PromiseRejectionEvent) {
    try {
      const reason = event?.reason;
      const msg = safeToString(reason).toLowerCase();
      if (isBenignError(msg)) {
        event?.preventDefault?.();
        return true;
      }
    } catch {}
    if (typeof origUnhandledRejection === "function") {
      try {
        return (origUnhandledRejection as any).call(window, event);
      } catch {}
    }
  };

  const origOnError = window.onerror;
  window.onerror = function (eventOrMessage, source, lineno, colno, error, ...args: any[]) {
    try {
      const msg = (typeof eventOrMessage === "string" ? eventOrMessage : safeToString(eventOrMessage) + " " + safeToString(error)).toLowerCase();
      if (isBenignError(msg)) return true;
    } catch {}
    if (typeof origOnError === "function") {
      try {
        return (origOnError as any).call(window, eventOrMessage, source, lineno, colno, error, ...args);
      } catch {}
    }
    return false;
  };

  window.addEventListener("unhandledrejection", (event) => {
    try {
      const reason = event.reason;
      const msg = safeToString(reason).toLowerCase();
      if (isBenignError(msg)) {
        event.preventDefault?.();
        event.stopPropagation?.();
      }
    } catch {}
  }, true);

  window.addEventListener("error", (event) => {
    try {
      const msg = (event.message || safeToString(event.error)).toLowerCase();
      if (isBenignError(msg)) {
        event.preventDefault?.();
        event.stopPropagation?.();
      }
    } catch {}
  }, true);

  try {
    // Business directory gallery photos open inside Bethelincovibe TV instead of navigating away.
    installBusinessGalleryLightbox();
  } catch {}

  try {
    // Business pages stay distraction-free; elsewhere the AI matcher can be moved by the user.
    installAIMatchFloatingGuard();
  } catch {}
}

function mountApplication() {
  const rootEl = document.getElementById("root");
  if (!rootEl) return;
  
  createRoot(rootEl).render(
    <ErrorBoundary label="Root">
      <App />
    </ErrorBoundary>
  );
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountApplication, { once: true });
  } else {
    mountApplication();
  }
}
