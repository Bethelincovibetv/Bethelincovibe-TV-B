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
        console.warn("Firestore real-time notification listener warning:", error);
      }
    );
  } catch (err) {
    console.warn("Could not attach Firestore notifications listener:", err);
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
