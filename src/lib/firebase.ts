import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getMessaging, Messaging, isSupported as isMessagingSupported } from 'firebase/messaging';
import { getAnalytics, Analytics, isSupported as isAnalyticsSupported } from 'firebase/analytics';
import firebaseConfigData from '../../firebase-applet-config.json';

// Initialize Firebase App using configuration from firebase-applet-config.json
export const firebaseConfig = {
  apiKey: firebaseConfigData.apiKey || import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: firebaseConfigData.authDomain || import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: firebaseConfigData.projectId || import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: firebaseConfigData.storageBucket || import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: firebaseConfigData.messagingSenderId || import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: firebaseConfigData.appId || import.meta.env.VITE_FIREBASE_APP_ID,
  ...(firebaseConfigData.measurementId ? { measurementId: firebaseConfigData.measurementId } : {}),
};

// VAPID key for web push if configured
export const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || undefined;

// Initialize Firebase App singleton
export const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Initialize Messaging instance safely
export let messaging: Messaging | null = null;
if (typeof window !== 'undefined') {
  isMessagingSupported().then((supported) => {
    if (supported) {
      try {
        messaging = getMessaging(app);
      } catch (err) {
        // Silently handle if messaging not configured in this environment
      }
    }
  }).catch(() => {
    // Messaging not supported in this environment
  });
}

// Initialize Analytics instance safely (only when measurementId is configured and supported)
export let analytics: Analytics | null = null;
if (typeof window !== 'undefined' && firebaseConfigData.measurementId) {
  isAnalyticsSupported().then((supported) => {
    if (supported) {
      try {
        analytics = getAnalytics(app);
      } catch (err) {
        // Gracefully catch any network or initialization error
      }
    }
  }).catch(() => {
    // Analytics not supported in this environment
  });
}

export async function getFirebaseMessaging(): Promise<Messaging | null> {
  if (typeof window === 'undefined') return null;
  if (messaging) return messaging;
  try {
    const supported = await isMessagingSupported();
    if (supported) {
      messaging = getMessaging(app);
      return messaging;
    }
  } catch {
    // Graceful fallback
  }
  return null;
}

