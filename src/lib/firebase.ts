import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getMessaging, Messaging, isSupported } from "firebase/messaging";
import firebaseConfigData from "../../firebase-applet-config.json";

// Standard Firebase config loaded from generated project config
export const firebaseConfig = {
  apiKey: firebaseConfigData.apiKey,
  authDomain: firebaseConfigData.authDomain,
  projectId: firebaseConfigData.projectId,
  storageBucket: firebaseConfigData.storageBucket,
  messagingSenderId: firebaseConfigData.messagingSenderId,
  appId: firebaseConfigData.appId,
};

// VAPID key for web push if configured or standard messaging ID fallback
export const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || undefined;

let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

export { app };

export async function getFirebaseMessaging(): Promise<Messaging | null> {
  if (typeof window === "undefined") return null;
  try {
    const supported = await isSupported();
    if (!supported) {
      console.warn("FCM is not supported in this browser environment");
      return null;
    }
    return getMessaging(app);
  } catch (err) {
    console.warn("Failed to initialize Firebase Messaging", err);
    return null;
  }
}
