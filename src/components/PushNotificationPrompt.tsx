import { useState, useEffect } from "react";
import { Bell, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const VAPID_PUBLIC_KEY = "BEjG6buaLk2FzvGIZQXYMfjBK2QHfr-T57hkNs4y7G6Ct1ZuqjPAoAT_f_z6GxIH7mCx2Te6EgmXkVpC1V8Hzz4";

type Template = "card" | "banner" | "bottom-sheet" | "minimal";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export default function PushNotificationPrompt() {
  const { user } = useAuth();
  const [show, setShow] = useState(false);
  const [template, setTemplate] = useState<Template>("card");

  useEffect(() => {
    // Load admin-chosen template + per-user override
    (async () => {
      const userPref = localStorage.getItem("notification-template-pref") as Template | null;
      if (userPref) { setTemplate(userPref); return; }
      const { data } = await supabase.from("site_settings").select("value").eq("key", "notification_template").maybeSingle();
      if (data?.value) setTemplate(data.value as Template);
    })();
  }, []);

  useEffect(() => {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) return;
    if (Notification.permission !== "default") return;
    const dismissed = localStorage.getItem("push-dismissed");
    if (dismissed && Date.now() - parseInt(dismissed) < 7 * 24 * 60 * 60 * 1000) return;
    const timer = setTimeout(() => setShow(true), 5000);
    return () => clearTimeout(timer);
  }, []);

  const handleAllow = async () => {
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") { setShow(false); return; }

      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
      const json = sub.toJSON() as any;

      await supabase.from("push_subscriptions").upsert({
        user_id: user?.id || null,
        endpoint: json.endpoint,
        p256dh: json.keys?.p256dh || "",
        auth: json.keys?.auth || "",
      }, { onConflict: "endpoint" } as any);

      toast.success("Notifications enabled!");
    } catch (e: any) {
      console.error(e);
      toast.error("Could not enable notifications");
    }
    setShow(false);
  };

  const handleDismiss = () => {
    setShow(false);
    localStorage.setItem("push-dismissed", Date.now().toString());
  };

  if (!show) return null;

  // ====== Templates ======
  if (template === "banner") {
    return (
      <div className="fixed top-0 inset-x-0 z-50 animate-in slide-in-from-top duration-500 bg-gradient-to-r from-primary via-primary to-primary/80 text-primary-foreground shadow-lg">
        <div className="container mx-auto flex items-center gap-3 px-4 py-2.5 max-w-4xl">
          <Sparkles className="h-5 w-5 shrink-0" />
          <p className="text-sm flex-1 truncate"><strong>Stay in the loop.</strong> Get fresh business tips & blog alerts.</p>
          <Button size="sm" variant="secondary" className="h-8 text-xs" onClick={handleAllow}>Allow</Button>
          <button onClick={handleDismiss} className="opacity-80 hover:opacity-100"><X className="h-4 w-4" /></button>
        </div>
      </div>
    );
  }

  if (template === "bottom-sheet") {
    return (
      <div className="fixed bottom-0 inset-x-0 z-50 p-3 sm:p-4 animate-in slide-in-from-bottom duration-500">
        <div className="rounded-2xl bg-card border shadow-2xl p-4 max-w-md mx-auto flex items-center gap-3">
          <div className="rounded-xl bg-gradient-to-br from-primary to-accent p-2.5 shrink-0">
            <Bell className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">Turn on notifications</p>
            <p className="text-xs text-muted-foreground">New articles & business tips, instantly.</p>
          </div>
          <Button size="sm" className="h-8 text-xs" onClick={handleAllow}>Allow</Button>
          <button onClick={handleDismiss} className="opacity-50 hover:opacity-100 shrink-0"><X className="h-4 w-4" /></button>
        </div>
      </div>
    );
  }

  if (template === "minimal") {
    return (
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom duration-500">
        <div className="rounded-full bg-foreground text-background shadow-2xl px-4 py-2 flex items-center gap-3 text-sm">
          <Bell className="h-4 w-4" />
          <span>Get update alerts?</span>
          <button onClick={handleAllow} className="font-semibold underline">Yes</button>
          <button onClick={handleDismiss} className="opacity-60"><X className="h-4 w-4" /></button>
        </div>
      </div>
    );
  }

  // Default: card (top-right)
  return (
    <div className="fixed top-4 right-4 left-4 sm:left-auto z-50 animate-in slide-in-from-top duration-500 max-w-sm sm:max-w-sm">
      <div className="rounded-2xl bg-card border shadow-2xl overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-primary via-accent to-primary" />
        <div className="p-4 flex items-start gap-3">
          <div className="rounded-xl bg-gradient-to-br from-primary to-accent p-2.5 shrink-0">
            <Bell className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-sm">Stay in the loop</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Be the first to know about new articles & business tips.
            </p>
            <div className="flex gap-2 mt-3">
              <Button size="sm" className="h-8 text-xs flex-1" onClick={handleAllow}>Allow</Button>
              <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={handleDismiss}>Not now</Button>
            </div>
          </div>
          <button onClick={handleDismiss} className="shrink-0 opacity-50 hover:opacity-100">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
