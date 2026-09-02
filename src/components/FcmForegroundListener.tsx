import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { listenForForegroundFcm } from "@/lib/fcm";
import { playNotificationSound } from "@/lib/notificationSound";
import { useAuth } from "@/contexts/AuthContext";
import { getBestUserName, personalizeNotificationTitle, personalizeNotificationBody } from "@/lib/notificationPersonalizer";
import { toast } from "sonner";
import { Bell } from "lucide-react";

export default function FcmForegroundListener() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userName = getBestUserName(user);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    listenForForegroundFcm((payload) => {
      console.log("Foreground FCM message received:", payload);

      const rawTitle = payload.notification?.title || payload.data?.title || "New Notification";
      const rawBody = payload.notification?.body || payload.data?.body || "";
      const targetUrl = payload.data?.url || payload.data?.deep_link || payload.notification?.click_action;

      const title = personalizeNotificationTitle(rawTitle, userName);
      const body = rawBody ? personalizeNotificationBody(rawBody, userName) : "";

      playNotificationSound();

      toast(title, {
        description: body,
        icon: <Bell className="h-5 w-5 text-primary" />,
        action: targetUrl ? {
          label: "View",
          onClick: () => navigate(targetUrl),
        } : undefined,
        duration: 6000,
      });
    }).then((unsub) => {
      if (typeof unsub === "function") {
        unsubscribe = unsub;
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [navigate, userName]);

  return null;
}
