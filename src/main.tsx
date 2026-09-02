import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import ErrorBoundary from "./components/ErrorBoundary";
import { installBusinessGalleryLightbox } from "./lib/businessGalleryLightbox";
import { installAIMatchFloatingGuard } from "./lib/aiMatchFloatingGuard";

// Gracefully handle benign third-party or network rejections without crashing React
if (typeof window !== "undefined") {
  const isBenignError = (str: string) => {
    const s = (str || "").toLowerCase();
    return (
      s.includes("failed to fetch") || s.includes("fetch failed") || s.includes("network_error") ||
      s.includes("network error") || s.includes("load failed") || s.includes("onesignal") ||
      s.includes("google") || s.includes("ggd") || s.includes("ad_network") || s.includes("adsterra") ||
      s.includes("monetag") || s.includes("startio") || s.includes("aborted") ||
      s.includes("loading chunk") || s.includes("dynamically imported module") ||
      s.includes("permission_denied") || s.includes("caller does not have permission") ||
      s.includes("specialist agent query error")
    );
  };
  const origUnhandledRejection = window.onunhandledrejection;
  window.onunhandledrejection = function (event: PromiseRejectionEvent) {
    const reason = event?.reason;
    const msg = (reason?.message || reason?.stack || String(reason || "")).toLowerCase();
    if (isBenignError(msg)) { event?.preventDefault?.(); return true; }
    if (typeof origUnhandledRejection === "function") return (origUnhandledRejection as any).call(window, event);
  };
  const origOnError = window.onerror;
  window.onerror = function (eventOrMessage, source, lineno, colno, error, ...args: any[]) {
    const msg = (typeof eventOrMessage === "string" ? eventOrMessage : (eventOrMessage as any)?.message || error?.message || "").toLowerCase();
    if (isBenignError(msg)) return true;
    if (typeof origOnError === "function") return (origOnError as any).call(window, eventOrMessage, source, lineno, colno, error, ...args);
    return false;
  };
  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    const msg = (reason?.message || reason?.stack || String(reason || "")).toLowerCase();
    if (isBenignError(msg)) { event.preventDefault?.(); event.stopPropagation?.(); }
  }, true);
  window.addEventListener("error", (event) => {
    const msg = (event.message || event.error?.message || "").toLowerCase();
    if (isBenignError(msg)) { event.preventDefault?.(); event.stopPropagation?.(); }
  }, true);

  // Business directory gallery photos open inside Bethelincovibe TV instead of navigating away.
  installBusinessGalleryLightbox();
  // Business pages stay distraction-free; elsewhere the AI matcher can be moved by the user.
  installAIMatchFloatingGuard();
}

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary label="Root">
    <App />
  </ErrorBoundary>
);
