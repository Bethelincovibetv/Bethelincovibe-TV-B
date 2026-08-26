import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import ErrorBoundary from "./components/ErrorBoundary";

// Gracefully prevent unhandled network / fetch errors from crashing the application
if (typeof window !== "undefined") {
  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    const msg = (reason?.message || reason?.stack || String(reason || "")).toLowerCase();
    if (
      msg.includes("failed to fetch") ||
      msg.includes("network_error") ||
      msg.includes("network error") ||
      msg.includes("load failed") ||
      msg.includes("network request failed") ||
      msg.includes("onesignal") ||
      msg.includes("google") ||
      msg.includes("ggd") ||
      msg.includes("aborted") ||
      msg.includes("fetch")
    ) {
      // Prevent console pollution from benign network dropouts or blocked third-party resources
      event.preventDefault();
      event.stopPropagation();
    }
  });

  window.addEventListener("error", (event) => {
    const msg = (event.message || event.error?.message || "").toLowerCase();
    if (
      msg.includes("failed to fetch") ||
      msg.includes("script error") ||
      msg.includes("networkerror") ||
      msg.includes("loading chunk") ||
      msg.includes("ggd") ||
      msg.includes("fetch")
    ) {
      event.preventDefault();
      event.stopPropagation();
    }
  });
}

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary label="Root">
    <App />
  </ErrorBoundary>
);

