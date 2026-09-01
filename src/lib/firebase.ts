import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, Auth, updateProfile } from 'firebase/auth';
import { getFirestore, Firestore, doc, getDocFromServer } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
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

// Initialize Firestore
export const db: Firestore = (firebaseConfigData as any).firestoreDatabaseId
  ? getFirestore(app, (firebaseConfigData as any).firestoreDatabaseId)
  : getFirestore(app);

// Initialize Firebase Auth
export const auth: Auth = getAuth(app);

// Initialize Firebase Storage
export const storage: FirebaseStorage = getStorage(app);

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

// Error handling types required by Firebase skill
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.warn('Firestore Error Info: ', JSON.stringify(errInfo));
  return errInfo;
}

// Connection test helper
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase connection: client offline.');
    }
    return false;
  }
}

if (typeof window !== 'undefined') {
  testConnection().catch(() => {});
}

// Helper to ensure user is signed into Firebase Auth for real-time Firestore listeners
export async function ensureFirebaseAuth(userMetadata?: { displayName?: string; photoURL?: string }): Promise<string> {
  if (auth.currentUser) {
    if (userMetadata?.displayName && auth.currentUser.displayName !== userMetadata.displayName) {
      updateProfile(auth.currentUser, {
        displayName: userMetadata.displayName,
        photoURL: userMetadata.photoURL || auth.currentUser.photoURL || undefined,
      }).catch(() => {});
    }
    return auth.currentUser.uid;
  }

  try {
    const cred = await signInAnonymously(auth);
    if (userMetadata?.displayName && cred.user) {
      await updateProfile(cred.user, {
        displayName: userMetadata.displayName,
        photoURL: userMetadata.photoURL || undefined,
      }).catch(() => {});
    }
    return cred.user.uid;
  } catch (err) {
    console.warn('Firebase anonymous auth fallback:', err);
    return auth.currentUser?.uid || 'guest_user';
  }
}

