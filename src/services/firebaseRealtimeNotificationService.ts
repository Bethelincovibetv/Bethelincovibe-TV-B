import {
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  Unsubscribe,
} from "firebase/firestore";
import { firestoreDb, ensureFirebaseAuth, sanitizeFirestoreObject } from "@/lib/firebaseChat";
import { supabase } from "@/integrations/supabase/client";
import { fetchUserNameById, personalizeNotificationTitle, personalizeNotificationBody } from "@/lib/notificationPersonalizer";
import { playNotificationSound } from "@/lib/notificationSound";
import { toast } from "sonner";

export interface LivePersonalizedNotification {
  id: string;
  recipient_user_id: string;
  recipient_name?: string;
  title: string;
  body: string;
  url?: string;
  type?: string;
  is_read: boolean;
  created_at: string;
}

/**
 * Dispatches a personalized real-time notification to Firebase Firestore
 * so the recipient receives it instantly across devices without refreshing the page.
 */
export async function sendLivePersonalizedNotification(params: {
  recipientUserId: string;
  title: string;
  body: string;
  url?: string;
  type?: string;
  recipientName?: string;
}): Promise<LivePersonalizedNotification> {
  await ensureFirebaseAuth();

  // Determine personalized username
  const cleanName = params.recipientName || (await fetchUserNameById(params.recipientUserId));
  const personalizedTitle = personalizeNotificationTitle(params.title, cleanName);
  const personalizedBody = personalizeNotificationBody(params.body, cleanName);

  const notifId = typeof crypto !== "undefined" && crypto.randomUUID
    ? `notif_${crypto.randomUUID()}`
    : `notif_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  const nowIso = new Date().toISOString();

  const payload: LivePersonalizedNotification = {
    id: notifId,
    recipient_user_id: params.recipientUserId,
    recipient_name: cleanName,
    title: personalizedTitle,
    body: personalizedBody,
    url: params.url || "/dashboard/notifications",
    type: params.type || "system",
    is_read: false,
    created_at: nowIso,
  };

  // 1. Write to Firebase Firestore in real time
  try {
    const notifRef = doc(firestoreDb, "user_notifications", notifId);
    await setDoc(notifRef, sanitizeFirestoreObject(payload));
  } catch (err) {
    console.warn("Firestore notification dispatch warning:", err);
  }

  // 2. Also write to Supabase user_notifications table if available
  try {
    await supabase.from("user_notifications").insert({
      user_id: params.recipientUserId,
      title: personalizedTitle,
      body: personalizedBody,
      url: params.url || null,
      type: params.type || "system",
      is_read: false,
    });
  } catch {
    // Graceful fallback if table is not accessible
  }

  return payload;
}

/**
 * Listens for new notifications in real-time via Firebase Firestore onSnapshot.
 * Triggers instant UI notifications and audio alerts without page refresh.
 */
export function subscribeToUserRealtimeNotifications(
  userId: string,
  onNotification?: (notification: LivePersonalizedNotification) => void
): () => void {
  if (!userId) return () => {};

  let initialLoad = true;
  let unsubscribeFirestore: Unsubscribe | null = null;

  try {
    const notifsRef = collection(firestoreDb, "user_notifications");
    const q = query(
      notifsRef,
      where("recipient_user_id", "==", userId),
      limit(25)
    );

    unsubscribeFirestore = onSnapshot(
      q,
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added" && !initialLoad) {
            const data = change.doc.data() as LivePersonalizedNotification;
            // Play notification sound
            playNotificationSound();

            // Display instant toast
            toast(data.title, {
              description: data.body,
              action: data.url
                ? {
                    label: "View",
                    onClick: () => {
                      if (typeof window !== "undefined") {
                        window.location.href = data.url!;
                      }
                    },
                  }
                : undefined,
            });

            // Dispatch global event
            if (typeof window !== "undefined") {
              window.dispatchEvent(
                new CustomEvent("btv_realtime_notification", { detail: data })
              );
            }

            if (onNotification) {
              onNotification(data);
            }
          }
        });
        initialLoad = false;
      },
      (error) => {
        const msg = String(error || "").toLowerCase();
        if (!msg.includes("unavailable") && !msg.includes("could not reach")) {
          console.warn("Firestore real-time notification listener notice:", error);
        }
      }
    );
  } catch (err) {
    // Silent fallback to Supabase channel below
  }

  // Also listen on Supabase channel as fallback
  let supabaseChannel: any = null;
  try {
    supabaseChannel = supabase
      .channel(`realtime-notifs-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "user_notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload: any) => {
          const row = payload.new;
          if (row) {
            playNotificationSound();
            toast(row.title, { description: row.body });
            if (typeof window !== "undefined") {
              window.dispatchEvent(
                new CustomEvent("btv_realtime_notification", { detail: row })
              );
            }
          }
        }
      )
      .subscribe();
  } catch {}

  return () => {
    if (unsubscribeFirestore) {
      unsubscribeFirestore();
    }
    if (supabaseChannel) {
      supabase.removeChannel(supabaseChannel);
    }
  };
}

/**
 * Fetches user notifications from Firebase Firestore with fallback / merge from Supabase
 */
export async function fetchUserNotificationsLive(userId: string): Promise<LivePersonalizedNotification[]> {
  if (!userId) return [];
  const map = new Map<string, LivePersonalizedNotification>();

  // 1. Fetch from Firebase Firestore
  try {
    await ensureFirebaseAuth();
    const q = query(
      collection(firestoreDb, "user_notifications"),
      where("recipient_user_id", "==", userId),
      limit(50)
    );
    const snap = await getDocs(q);
    snap.docs.forEach((d) => {
      const data = d.data() as LivePersonalizedNotification;
      map.set(data.id || d.id, { ...data, id: data.id || d.id });
    });
  } catch (err) {
    console.warn("Firestore fetchUserNotificationsLive warning:", err);
  }

  // 2. Fetch from Supabase as fallback/supplement
  try {
    const { data, error } = await supabase
      .from("user_notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (!error && data) {
      data.forEach((row: any) => {
        const id = String(row.id);
        if (!map.has(id)) {
          map.set(id, {
            id,
            recipient_user_id: row.user_id,
            title: row.title,
            body: row.body || "",
            url: row.url || "/dashboard/notifications",
            type: row.type || "system",
            is_read: Boolean(row.is_read),
            created_at: row.created_at || new Date().toISOString(),
          });
        }
      });
    }
  } catch {}

  const result = Array.from(map.values());
  return result.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
}

/**
 * Subscribes to live user notifications list using Firebase Firestore onSnapshot.
 * Updates immediately when any notification is added, read, or modified, with zero page refresh!
 */
export function subscribeToUserNotificationsList(
  userId: string,
  onUpdate: (notifications: LivePersonalizedNotification[]) => void
): () => void {
  if (!userId) return () => {};

  let active = true;
  let unsubscribeFirestore: Unsubscribe | null = null;
  const memoryCache = new Map<string, LivePersonalizedNotification>();

  const emit = () => {
    if (!active) return;
    const list = Array.from(memoryCache.values()).sort(
      (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    );
    onUpdate(list);
  };

  // Initial load to hydrate cache fast
  void fetchUserNotificationsLive(userId).then((initialList) => {
    if (!active) return;
    initialList.forEach((item) => memoryCache.set(item.id, item));
    emit();
  });

  // Start Firestore live listener
  const startFirestoreListener = async () => {
    try {
      await ensureFirebaseAuth();
      if (!active) return;

      const q = query(
        collection(firestoreDb, "user_notifications"),
        where("recipient_user_id", "==", userId)
      );

      unsubscribeFirestore = onSnapshot(
        q,
        (snapshot) => {
          if (!active) return;
          snapshot.docChanges().forEach((change) => {
            const data = { ...change.doc.data(), id: change.doc.id } as LivePersonalizedNotification;
            if (change.type === "removed") {
              memoryCache.delete(data.id);
            } else {
              memoryCache.set(data.id, data);
            }
          });
          emit();
        },
        (err) => {
          console.warn("Firestore user notifications list listener notice:", err);
        }
      );
    } catch (err) {
      console.warn("Could not start Firestore notifications listener:", err);
    }
  };

  void startFirestoreListener();

  // Supabase fallback channel
  let supabaseChannel: any = null;
  try {
    supabaseChannel = supabase
      .channel(`live_notifs_list_${userId}_${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          void fetchUserNotificationsLive(userId).then((list) => {
            if (!active) return;
            list.forEach((item) => memoryCache.set(item.id, item));
            emit();
          });
        }
      )
      .subscribe();
  } catch {}

  const handleWindowNotif = (e: any) => {
    if (!active) return;
    const detail = e.detail;
    if (detail && detail.recipient_user_id === userId) {
      memoryCache.set(detail.id, detail);
      emit();
    }
  };
  if (typeof window !== "undefined") {
    window.addEventListener("btv_realtime_notification", handleWindowNotif);
  }

  return () => {
    active = false;
    if (unsubscribeFirestore) unsubscribeFirestore();
    if (supabaseChannel) supabase.removeChannel(supabaseChannel);
    if (typeof window !== "undefined") {
      window.removeEventListener("btv_realtime_notification", handleWindowNotif);
    }
  };
}

/**
 * Mark a single notification as read in Firebase Firestore and Supabase
 */
export async function markNotificationReadInRealtime(notificationId: string, userId: string): Promise<void> {
  if (!notificationId) return;

  // 1. Firebase Firestore
  try {
    await ensureFirebaseAuth();
    const ref = doc(firestoreDb, "user_notifications", notificationId);
    await setDoc(ref, { is_read: true, updated_at: new Date().toISOString() }, { merge: true });
  } catch (e) {
    console.warn("Firestore markNotificationRead error:", e);
  }

  // 2. Supabase
  try {
    await supabase.from("user_notifications").update({ is_read: true }).eq("id", notificationId).eq("user_id", userId);
  } catch {}
}

/**
 * Mark all notifications as read in Firebase Firestore and Supabase
 */
export async function markAllNotificationsReadInRealtime(userId: string): Promise<void> {
  if (!userId) return;

  // 1. Firebase Firestore
  try {
    await ensureFirebaseAuth();
    const q = query(
      collection(firestoreDb, "user_notifications"),
      where("recipient_user_id", "==", userId)
    );
    const snap = await getDocs(q);
    const unreadDocs = snap.docs.filter((d) => !d.data().is_read);
    await Promise.all(
      unreadDocs.map((d) =>
        setDoc(d.ref, { is_read: true, updated_at: new Date().toISOString() }, { merge: true })
      )
    );
  } catch (e) {
    console.warn("Firestore markAllNotificationsRead error:", e);
  }

  // 2. Supabase
  try {
    await supabase.from("user_notifications").update({ is_read: true }).eq("user_id", userId).eq("is_read", false);
  } catch {}
}

