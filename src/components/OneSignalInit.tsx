import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

declare global {
  interface Window {
    OneSignalDeferred?: any[];
    OneSignal?: any;
  }
}

let initialized = false;
let listenersAttached = false;

function normalizePromptStyle(value?: string): "bell" | "modal" | "custom" {
  if (value === "bell" || value === "custom") return value;
  return "modal";
}

/**
 * OneSignal v16 web push integration.
 * - Loads admin-configured app id from site_settings
 * - Initializes once with autoResubscribe + the OneSignal service worker
 * - Persists Player ID into profiles for targeted sends
 * - Sets external_id when a user logs in so DB triggers can target them
 */
export default function OneSignalInit() {
  const { user } = useAuth();

  useEffect(() => {
    if (typeof window === "undefined") return;

    (async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("key,value")
        .in("key", [
          "onesignal_app_id",
          "onesignal_enabled",
          "onesignal_prompt_style",
          "onesignal_custom_message",
        ]);
      const map: Record<string, string> = {};
      data?.forEach((r: any) => (map[r.key] = r.value || ""));

      if (map.onesignal_enabled === "false") return;
      const appId = (map.onesignal_app_id || "9feae3e2-da34-441b-8bf6-ecffe4040375").trim();
      if (!appId) return;

      const style = normalizePromptStyle(map.onesignal_prompt_style);
      const customMsg =
        map.onesignal_custom_message ||
        "Get notified about new posts, businesses & deals from Bethelincovibe TV";

      window.OneSignalDeferred = window.OneSignalDeferred || [];
      window.OneSignalDeferred.push(async (OneSignal: any) => {
        try {
          if (!initialized) {
            await OneSignal.init({
              appId,
              serviceWorkerPath: "/OneSignalSDKWorker.js",
              serviceWorkerParam: { scope: "/" },
              allowLocalhostAsSecureOrigin: true,
              autoResubscribe: true,
              notifyButton: { enable: false }, // custom prompt via slidedown
              promptOptions: {
                slidedown: {
                  prompts: [
                    {
                      type: "push",
                      autoPrompt: style !== "bell",
                      text: {
                        actionMessage: customMsg,
                        acceptButton:
                          style === "custom" ? "Yes, notify me" : "Allow notifications",
                        cancelButton: style === "custom" ? "No thanks" : "Not now",
                      },
                      delay: { pageViews: 1, timeDelay: style === "modal" ? 3 : 5 },
                    },
                  ],
                },
              },
            });
            initialized = true;
          }

          // Always-on default click URL → site origin
          try {
            await OneSignal.Notifications?.setDefaultUrl?.(window.location.origin);
          } catch {}

          const persistPlayerId = async (playerId?: string | null) => {
            try {
              if (!playerId) return;
              const { data: { user: u } } = await supabase.auth.getUser();
              if (!u) return;
              await supabase
                .from("profiles")
                .update({ onesignal_player_id: playerId })
                .eq("user_id", u.id);
            } catch (e) { console.warn("OneSignal persist failed", e); }
          };

          // Link the OneSignal subscription to our auth user so we can target them
          if (user?.id) {
            try { await OneSignal.login(user.id); } catch {}
          }

          if (!listenersAttached) {
            OneSignal.User?.PushSubscription?.addEventListener?.(
              "change",
              async (evt: any) => {
                const id = evt?.current?.id || OneSignal.User?.PushSubscription?.id;
                if (evt?.current?.optedIn) {
                  await persistPlayerId(id);
                }
              }
            );
            listenersAttached = true;
          }

          // Capture player id if user is already subscribed
          const optedIn = OneSignal.User?.PushSubscription?.optedIn;
          const existingId = OneSignal.User?.PushSubscription?.id;
          if (optedIn && existingId) {
            await persistPlayerId(existingId);
          }

          // Browser already granted permission but user isn't opted-in (e.g. after re-login)
          if (typeof Notification !== "undefined" && Notification.permission === "granted" && !optedIn) {
            try { await OneSignal.User?.PushSubscription?.optIn?.(); } catch {}
          }
        } catch (e) {
          console.warn("OneSignal init error", e);
        }
      });
    })();
  }, [user?.id]);

  return null;
}
