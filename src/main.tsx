import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import ErrorBoundary from "./components/ErrorBoundary";

function mount() {
  const rootElement = document.getElementById("root");
  if (!rootElement) {
    console.error("Root element #root not found in document.");
    return;
  }

  // Avoid duplicate mounts
  if ((rootElement as any)._reactRoot) {
    return;
  }

  const root = createRoot(rootElement);
  (rootElement as any)._reactRoot = root;

  root.render(
    <React.StrictMode>
      <ErrorBoundary label="Root">
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );
}

// Immediate mount if DOM is ready, otherwise on DOMContentLoaded
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mount, { once: true });
} else {
  mount();
}

// Defer non-essential secondary UI helpers safely after initial paint
if (typeof window !== "undefined") {
  const scheduleEnhancers = () => {
    import("./lib/businessGalleryLightbox")
      .then((m) => m.installBusinessGalleryLightbox?.())
      .catch((e) => console.warn("Deferred lightbox init:", e));

    import("./lib/aiMatchFloatingGuard")
      .then((m) => m.installAIMatchFloatingGuard?.())
      .catch((e) => console.warn("Deferred AI match guard init:", e));
  };

  if ("requestIdleCallback" in window) {
    (window as any).requestIdleCallback(scheduleEnhancers, { timeout: 2000 });
  } else {
    setTimeout(scheduleEnhancers, 1000);
  }
}
