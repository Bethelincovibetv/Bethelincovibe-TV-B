import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import ErrorBoundary from "./components/ErrorBoundary";

// Gracefully prevent unhandled network / fetch errors from crashing the application
if (typeof window !== "undefined") {
  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    const msg = (reason?.message || String(reason || "")).toLowerCase();
    if (
      msg.includes("failed to fetch") ||
      msg.includes("network_error") ||
      msg.includes("network error") ||
      msg.includes("load failed") ||
      msg.includes("network request failed") ||
      msg.includes("onesignal") ||
      msg.includes("google") ||
      msg.includes("aborted")
    ) {
      // Prevent console pollution from benign network dropouts or blocked third-party resources
      event.preventDefault();
    }
  });

  window.addEventListener("error", (event) => {
    const msg = (event.message || "").toLowerCase();
    if (
      msg.includes("failed to fetch") ||
      msg.includes("script error") ||
      msg.includes("networkerror") ||
      msg.includes("loading chunk")
    ) {
      event.preventDefault();
    }
  });
}

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary label="Root">
    <App />
  </ErrorBoundary>
);

