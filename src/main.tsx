import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import ErrorBoundary from "./components/ErrorBoundary";

// Gracefully handle benign third-party or network rejections without crashing React
if (typeof window !== "undefined") {
  const isBenignError = (str: string) => {
    const s = (str || "").toLowerCase();
    return (
      s.includes("failed to fetch") ||
      s.includes("network_error") ||
      s.includes("network error") ||
      s.includes("load failed") ||
      s.includes("onesignal") ||
      s.includes("google") ||
      s.includes("ggd") ||
      s.includes("aborted") ||
      s.includes("loading chunk") ||
      s.includes("dynamically imported module")
    );
  };

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    const msg = (reason?.message || reason?.stack || String(reason || "")).toLowerCase();
    if (isBenignError(msg)) {
      event.preventDefault?.();
      event.stopPropagation?.();
    }
  });

  window.addEventListener("error", (event) => {
    const msg = (event.message || event.error?.message || "").toLowerCase();
    if (isBenignError(msg)) {
      event.preventDefault?.();
      event.stopPropagation?.();
    }
  });
}

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary label="Root">
    <App />
  </ErrorBoundary>
);


