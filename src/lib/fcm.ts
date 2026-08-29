import { getToken, onMessage, deleteToken } from "firebase/messaging";
import { getFirebaseMessaging, VAPID_KEY } from "./firebase";
import { supabase } from "@/integrations/supabase/client";

export interface FcmDevice {
  id: string;
  token: string;
  userAgent: string;
  platform: string;
  lastActive: string;
  isCurrentDevice?: boolean;
}

export interface FcmNotificationPreferences {
  enabled: boolean;
  messages: boolean;
  marketplace: boolean;
  products: boolean;
  sales: boolean;
  blog: boolean;
  community: boolean;
  business: boolean;
  system: boolean;
  marketing: boolean;
}

export const DEFAULT_PREFERENCES: FcmNotificationPreferences = {
  enabled: true,
  messages: true,
  marketplace: true,
  products: true,
  sales: true,
  blog: true,
  community: true,
  business: true,
  system: true,
  marketing: true,
};

/**
 * Detect user agent browser & OS label for device listing
 */
export function getDeviceLabel(): string {
  if (typeof navigator === "undefined") return "Web Browser";
  const ua = navigator.userAgent;
  let browser = "Browser";
  if (ua.includes("Firefox")) browser = "Firefox";
  else if (ua.includes("Edg")) browser = "Edge";
  else if (ua.includes("Chrome")) browser = "Chrome";
  else if (ua.includes("Safari")) browser = "Safari";

  let os = "Desktop";
  if (ua.includes("Android")) os = "Android";
  else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";
  else if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Mac")) os = "Mac";
  else if (ua.includes("Linux")) os = "Linux";

  return `${browser} on ${os}`;
}

/**
 * Register Service Worker for FCM Web Push
 */
export async function registerFcmServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register("/firebase-messaging-sw.js", {
      scope: "/",
    });
    await navigator.serviceWorker.ready;
    return reg;
  } catch (err) {
    console.warn("Failed to register firebase-messaging-sw.js service worker:", err);
    return null;
  }
}

/**
 * Request notification permission and get FCM token
 */
export async function requestAndSaveFcmToken(userId?: string): Promise<{ token: string | null; error?: string }> {
  try {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return { token: null, error: "Notifications not supported in this environment" };
    }

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      return { token: null, error: "Notification permission denied" };
    }

    const messaging = await getFirebaseMessaging();
    if (!messaging) {
      return { token: null, error: "Firebase messaging is not supported" };
    }

    const swRegistration = await registerFcmServiceWorker();
    if (!swRegistration) {
      return { token: null, error: "Service Worker registration failed" };
    }

    const token = await getToken(messaging, {
      serviceWorkerRegistration: swRegistration,
      vapidKey: VAPID_KEY,
    });

    if (!token) {
      return { token: null, error: "Failed to retrieve FCM token" };
    }

    // Persist token in localStorage for quick client access
    localStorage.setItem("fcm_device_token", token);
    localStorage.setItem("fcm_permission_granted", "true");

    // Save token & device info to Supabase DB if user is authenticated
    if (userId) {
      await saveFcmTokenToBackend(userId, token);
    } else {
      // Get current user if available
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await saveFcmTokenToBackend(user.id, token);
      }
    }

    return { token };
  } catch (err: any) {
    console.error("Error requesting FCM token:", err);
    return { token: null, error: err?.message || "Failed to enable push notifications" };
  }
}

/**
 * Save FCM token & metadata to DB without overwriting user's other devices
 */
export async function saveFcmTokenToBackend(userId: string, token: string) {
  try {
    const deviceLabel = getDeviceLabel();
    // Check if token already registered in push_subscriptions
    const { data: existing } = await supabase
      .from("push_subscriptions")
      .select("id")
      .eq("endpoint", token)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("push_subscriptions")
        .update({
          user_id: userId,
          auth: deviceLabel,
          p256dh: new Date().toISOString(),
        })
        .eq("id", existing.id);
    } else {
      await supabase
        .from("push_subscriptions")
        .insert({
          user_id: userId,
          endpoint: token,
          auth: deviceLabel,
          p256dh: new Date().toISOString(),
        });
    }

    // Save user preference default if not already present
    const { data: profile } = await supabase
      .from("profiles")
      .select("user_id, onesignal_player_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (profile) {
      await supabase
        .from("profiles")
        .update({
          onesignal_player_id: token, // Link FCM token to player ID field for unified push targeting
        })
        .eq("user_id", userId);
    }
  } catch (err) {
    console.warn("Failed to save FCM token to database:", err);
  }
}

/**
 * Get all registered push devices for user
 */
export async function getUserFcmDevices(userId: string): Promise<FcmDevice[]> {
  try {
    const currentToken = typeof window !== "undefined" ? localStorage.getItem("fcm_device_token") : null;
    const { data, error } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error || !data) return [];

    return data.map((sub: any) => ({
      id: sub.id,
      token: sub.endpoint,
      userAgent: sub.auth || "Web Browser",
      platform: "Web Push (FCM)",
      lastActive: sub.created_at || sub.updated_at || new Date().toISOString(),
      isCurrentDevice: sub.endpoint === currentToken,
    }));
  } catch {
    return [];
  }
}

/**
 * Delete a device subscription
 */
export async function removeFcmDevice(deviceId: string, token?: string) {
  try {
    await supabase.from("push_subscriptions").delete().eq("id", deviceId);
    if (token && typeof window !== "undefined" && localStorage.getItem("fcm_device_token") === token) {
      localStorage.removeItem("fcm_device_token");
      const messaging = await getFirebaseMessaging();
      if (messaging) {
        await deleteToken(messaging).catch(() => {});
      }
    }
  } catch (err) {
    console.warn("Error removing device:", err);
  }
}

/**
 * Listen for foreground FCM messages
 */
export async function listenForForegroundFcm(callback: (payload: any) => void) {
  const messaging = await getFirebaseMessaging();
  if (!messaging) return () => {};
  return onMessage(messaging, (payload) => {
    callback(payload);
  });
}

/**
 * Load user notification preferences
 */
export async function getUserNotificationPreferences(userId: string): Promise<FcmNotificationPreferences> {
  try {
    const { data } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", `notif_prefs_${userId}`)
      .maybeSingle();

    if (data?.value) {
      return { ...DEFAULT_PREFERENCES, ...JSON.parse(data.value) };
    }
  } catch {}
  return DEFAULT_PREFERENCES;
}

/**
 * Save user notification preferences
 */
export async function saveUserNotificationPreferences(userId: string, prefs: FcmNotificationPreferences) {
  try {
    const key = `notif_prefs_${userId}`;
    const value = JSON.stringify(prefs);
    const { data: existing } = await supabase
      .from("site_settings")
      .select("id")
      .eq("key", key)
      .maybeSingle();

    if (existing) {
      await supabase.from("site_settings").update({ value }).eq("id", existing.id);
    } else {
      await supabase.from("site_settings").insert({ key, value });
    }
  } catch (err) {
    console.warn("Failed to save notification preferences:", err);
  }
}

/**
 * Send FCM Push Notification via Server / Webhook / Supabase Function
 * Creates in-app user_notifications record AND sends FCM push
 */
export async function sendFcmNotificationToUser(params: {
  userId: string;
  title: string;
  body: string;
  url?: string;
  type?: string;
  icon?: string;
  image?: string;
}) {
  try {
    // 1. Create in-app notification record first (source of truth)
    await supabase.from("user_notifications").insert({
      user_id: params.userId,
      title: params.title,
      body: params.body,
      url: params.url || "/dashboard",
      type: params.type || "system",
      is_read: false,
    });

    // 2. Check user notification preferences
    const prefs = await getUserNotificationPreferences(params.userId);
    if (!prefs.enabled) return;

    // Map category check
    const category = params.type || "system";
    if (category in prefs && !(prefs as any)[category]) {
      return; // Category muted by user
    }

    // 3. Trigger FCM Push delivery via edge function or backend endpoint
    await supabase.functions.invoke("onesignal-send", {
      body: {
        title: params.title,
        message: params.body,
        url: params.url || "/dashboard",
        mode: "users",
        user_ids: [params.userId],
      },
    }).catch(() => {});

    // Also trigger direct browser notification if permitted on current device
    triggerDirectBrowserNotification({
      title: params.title,
      body: params.body,
      url: params.url || "/dashboard",
      icon: params.icon || "/logo.png",
      image: params.image,
    });
  } catch (err) {
    console.warn("Failed sending FCM notification:", err);
  }
}

/**
 * Triggers a real-time system/browser push notification directly on the active device using site logo
 */
export function triggerDirectBrowserNotification(options: {
  title: string;
  body: string;
  url?: string;
  icon?: string;
  image?: string;
}) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  try {
    const icon = options.icon || "/logo.png";
    const notif = new Notification(options.title, {
      body: options.body,
      icon,
      badge: icon,
      image: options.image,
      data: { url: options.url || "/dashboard" },
    });

    notif.onclick = (e) => {
      e.preventDefault();
      window.focus();
      if (options.url) {
        window.location.href = options.url;
      }
      notif.close();
    };
  } catch (e) {
    // If standard constructor fails (e.g. on some mobile browsers), try service worker registration
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.showNotification(options.title, {
          body: options.body,
          icon: options.icon || "/logo.png",
          badge: "/logo.png",
          image: options.image,
          data: { url: options.url || "/dashboard" },
        }).catch(() => {});
      }).catch(() => {});
    }
  }
}

/**
 * Sends a real-time Welcome Push Notification to the user's device with the official site logo
 */
export async function sendWelcomePushNotification(userId: string) {
  const welcomePayload = {
    userId,
    title: "Welcome to Bethelincovibe TV! 🚀",
    body: "Push notifications are successfully active on your device. You'll receive real-time alerts for business inquiries, blog performance, and community trade updates.",
    url: "/dashboard",
    icon: "/logo.png",
    type: "system",
  };

  await sendFcmNotificationToUser(welcomePayload);
}
