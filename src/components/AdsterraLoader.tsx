import { useEffect } from "react";

/** Adsterra is blocked and all scripts are actively removed. */
export default function AdsterraLoader() {
  useEffect(() => {
    // Actively purge any scripts or tags related to Adsterra
    document.querySelectorAll('script[data-adsterra], meta[data-adsterra], script[src*="adsterra"], script[src*="alwingulla"], script[src*="highperformancegate"]').forEach((n) => n.remove());
  }, []);

  return null;
}
