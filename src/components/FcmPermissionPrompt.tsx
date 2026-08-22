import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { requestAndSaveFcmToken } from "@/lib/fcm";
import { Bell, X, CheckCircle2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function FcmPermissionPrompt() {
  const { user } = useAuth();
  const [show, setShow] = useState(false);
  const [enabling, setEnabling] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;

    // Check if browser permission is already granted or denied
    if (Notification.permission === "granted" || Notification.permission === "denied") {
      return;
    }

    // Check if user previously clicked "Not Now"
    const dismissed = localStorage.getItem("fcm_prompt_dismissed");
    if (dismissed === "true") {
      return;
    }

    // Delay prompt slightly so page loads cleanly first
    const timer = setTimeout(() => {
      setShow(true);
    }, 4000);

    return () => clearTimeout(timer);
  }, [user?.id]);

  const handleEnable = async () => {
    setEnabling(true);
    try {
      const res = await requestAndSaveFcmToken(user?.id);
      if (res.token) {
        toast.success("Push notifications enabled! You'll receive updates on this device.", {
          icon: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
        });
        setShow(false);
      } else {
        toast.error(res.error || "Could not enable notifications.");
      }
    } catch (e: any) {
      toast.error(e?.message || "Failed to enable push notifications");
    } finally {
      setEnabling(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem("fcm_prompt_dismissed", "true");
    setShow(false);
  };

  if (!show) return null;

  return (
    <div
      className="fixed bottom-20 md:bottom-6 right-4 z-50 max-w-sm w-[calc(100vw-2rem)] p-4 rounded-2xl bg-background/95 backdrop-blur-md border border-primary/20 shadow-2xl shadow-primary/10 animate-in fade-in slide-in-from-bottom-5 duration-300"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
            <Bell className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5">
              Stay Updated 🎉
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Get important updates from <span className="font-semibold text-foreground">Bethelincovibe TV</span> directly on your device.
            </p>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="text-muted-foreground hover:text-foreground transition p-1 rounded-md"
          aria-label="Dismiss notification prompt"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3.5 flex items-center gap-2">
        <Button
          size="sm"
          onClick={handleEnable}
          disabled={enabling}
          className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-xs h-9 shadow-md"
        >
          {enabling ? "Connecting..." : "Enable Notifications"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handleDismiss}
          className="text-xs h-9 text-muted-foreground hover:text-foreground"
        >
          Not Now
        </Button>
      </div>

      <div className="mt-2.5 flex items-center gap-1 text-[10px] text-muted-foreground justify-center">
        <ShieldCheck className="h-3 w-3 text-emerald-500" />
        You can change this anytime in Settings → Notifications
      </div>
    </div>
  );
}
