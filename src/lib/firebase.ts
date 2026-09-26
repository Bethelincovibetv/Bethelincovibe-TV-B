import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, signInAnonymously, Auth } from 'firebase/auth';
import {
  initializeFirestore,
  getFirestore,
  setLogLevel,
  Firestore,
} from 'firebase/firestore';
import { getMessaging, Messaging, isSupported as isMessagingSupported } from 'firebase/messaging';
import { getAnalytics, Analytics, isSupported as isAnalyticsSupported } from 'firebase/analytics';
import firebaseConfigData from '../../firebase-applet-config.json';

// Silence internal verbose connection retry logs from Firebase SDK
try {
  setLogLevel("silent");
} catch {}

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

// Safe Firebase App singleton
export const app: FirebaseApp = (() => {
  try {
    return getApps().length ? getApp() : initializeApp(firebaseConfig);
  } catch {
    try {
      return getApps()[0] || ({} as FirebaseApp);
    } catch {
      return {} as FirebaseApp;
    }
  }
})();
export const firebaseApp = app;

// Firebase Auth
export const firebaseAuth: Auth = (() => {
  try {
    return getAuth(app);
  } catch {
    return {} as Auth;
  }
})();

// Initialize resilient Firestore with auto-detect long polling for sandbox/iframe support
export const firestoreDb: Firestore = (() => {
  try {
    return initializeFirestore(app, {
      experimentalAutoDetectLongPolling: true,
      ignoreUndefinedProperties: true,
    });
  } catch {
    try {
      return getFirestore(app);
    } catch {
      return {} as Firestore;
    }
  }
})();

let authInitPromise: Promise<string> | null = null;

/**
 * Ensures Firebase Auth has an active anonymous session
 */
export async function ensureFirebaseAuth(): Promise<string> {
  try {
    if (firebaseAuth && firebaseAuth.currentUser) {
      return firebaseAuth.currentUser.uid;
    }
    if (!authInitPromise && firebaseAuth) {
      authInitPromise = signInAnonymously(firebaseAuth)
        .then((cred) => cred.user.uid)
        .catch((err) => {
          console.warn("Firebase Auth session notice:", err);
          return "guest_user";
        })
        .finally(() => {
          authInitPromise = null;
        });
    }
    return authInitPromise || "guest_user";
  } catch {
    return "guest_user";
  }
}

/**
 * Recursively sanitizes data objects before writing to Firestore.
 * Removes all undefined keys and ensures clean JSON primitives or Firestore sentinels.
 */
export function sanitizeFirestoreObject<T extends Record<string, any>>(obj: T): Record<string, any> {
  if (!obj || typeof obj !== "object") return {};
  const cleaned: Record<string, any> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) {
      continue;
    }
    if (value === null) {
      cleaned[key] = null;
    } else if (Array.isArray(value)) {
      cleaned[key] = value
        .filter((v) => v !== undefined)
        .map((v) => (typeof v === "object" && v !== null && !(v as any)._methodName ? sanitizeFirestoreObject(v) : v));
    } else if (typeof value === "object") {
      if ((value as any)._methodName || typeof (value as any).toMillis === "function" || (value as any).isEqual) {
        cleaned[key] = value;
      } else {
        cleaned[key] = sanitizeFirestoreObject(value);
      }
    } else {
      cleaned[key] = value;
    }
  }

  return cleaned;
}

// Initialize Messaging instance safely
export let messaging: Messaging | null = null;
if (typeof window !== 'undefined') {
  isMessagingSupported().then((supported) => {
    if (supported && app && Object.keys(app).length > 0) {
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
    if (supported && app && Object.keys(app).length > 0) {
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
    if (supported && app && Object.keys(app).length > 0) {
      messaging = getMessaging(app);
      return messaging;
    }
  } catch {
    // Graceful fallback
  }
  return null;
}
