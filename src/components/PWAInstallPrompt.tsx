import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Download, Smartphone } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Don't show if already installed or dismissed recently
    const dismissed = localStorage.getItem("pwa-dismissed");
    if (dismissed && Date.now() - parseInt(dismissed) < 7 * 24 * 60 * 60 * 1000) return;

    // Check if already in standalone mode
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    // iOS detection
    const ua = navigator.userAgent;
    const isIOSDevice = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    if (isIOSDevice) {
      // Show banner for iOS after a delay
      const timer = setTimeout(() => setShowBanner(true), 3000);
      return () => clearTimeout(timer);
    }

    // Android/Chrome: listen for beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setTimeout(() => setShowBanner(true), 3000);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setShowBanner(false);
      }
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem("pwa-dismissed", Date.now().toString());
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-in slide-in-from-bottom duration-500">
      <div className="container mx-auto max-w-lg">
        <div className="rounded-xl bg-primary text-primary-foreground shadow-2xl p-4 flex items-start gap-3">
          <div className="rounded-lg bg-primary-foreground/20 p-2 shrink-0">
            <Smartphone className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">Install Bethelincovibe TV</p>
            {isIOS ? (
              <p className="text-xs opacity-90 mt-0.5">
                Tap the share button <span className="inline-block">⬆️</span> then "Add to Home Screen" for the best experience.
              </p>
            ) : (
              <p className="text-xs opacity-90 mt-0.5">
                Get quick access from your home screen. Works offline!
              </p>
            )}
            {!isIOS && deferredPrompt && (
              <Button
                size="sm"
                variant="secondary"
                className="mt-2 h-8 text-xs"
                onClick={handleInstall}
              >
                <Download className="h-3 w-3 mr-1" /> Install App
              </Button>
            )}
          </div>
          <button onClick={handleDismiss} className="shrink-0 opacity-70 hover:opacity-100">
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
