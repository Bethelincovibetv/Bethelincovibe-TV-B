import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  addDoc,
  getDocs,
  getDoc,
  getDocFromServer,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  Unsubscribe,
} from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";

// Initialize Firebase App
export const firebaseApp = !getApps().length
  ? initializeApp(firebaseConfig)
  : getApp();

export const firebaseAuth = getAuth(firebaseApp);
export const firestoreDb = getFirestore(firebaseApp);

export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
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

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: firebaseAuth.currentUser?.uid || null,
      email: firebaseAuth.currentUser?.email || null,
      emailVerified: firebaseAuth.currentUser?.emailVerified || null,
      isAnonymous: firebaseAuth.currentUser?.isAnonymous || null,
      tenantId: firebaseAuth.currentUser?.tenantId || null,
      providerInfo:
        firebaseAuth.currentUser?.providerData?.map((p) => ({
          providerId: p.providerId,
          email: p.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.warn("Firestore Error: ", JSON.stringify(errInfo));
  return errInfo;
}

// Connection test
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(firestoreDb, "test", "connection"));
    return true;
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("the client is offline")
    ) {
      console.warn("Firestore is currently offline or connecting.");
    }
    return false;
  }
}

export interface RealtimeChatRoom {
  id: string;
  participants: string[];
  participantNames: Record<string, string>;
  participantAvatars?: Record<string, string>;
  lastMessageText?: string;
  lastMessageTime?: any;
  supportTopic?: string;
  createdAt: any;
}

export interface RealtimeChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  text: string;
  createdAt: any;
  isLocalPending?: boolean;
}

const LOCAL_STORAGE_CHATS_KEY = "bethel_realtime_chats_v1";
const LOCAL_STORAGE_MSGS_PREFIX = "bethel_realtime_msgs_";

function getLocalChats(userId: string): RealtimeChatRoom[] {
  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_CHATS_KEY}_${userId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalChats(userId: string, chats: RealtimeChatRoom[]) {
  try {
    localStorage.setItem(
      `${LOCAL_STORAGE_CHATS_KEY}_${userId}`,
      JSON.stringify(chats)
    );
  } catch (e) {
    console.error(e);
  }
}

function getLocalMessages(chatId: string): RealtimeChatMessage[] {
  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_MSGS_PREFIX}${chatId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalMessages(chatId: string, msgs: RealtimeChatMessage[]) {
  try {
    localStorage.setItem(
      `${LOCAL_STORAGE_MSGS_PREFIX}${chatId}`,
      JSON.stringify(msgs)
    );
  } catch (e) {
    console.error(e);
  }
}

/**
 * Ensures Firebase Auth has a session (either anonymous or signed in)
 */
export async function ensureFirebaseAuth(): Promise<string> {
  if (firebaseAuth.currentUser) {
    return firebaseAuth.currentUser.uid;
  }
  try {
    const cred = await signInAnonymously(firebaseAuth);
    return cred.user.uid;
  } catch (err) {
    console.warn("Firebase anonymous auth fallback:", err);
    return "guest_user";
  }
}

/**
 * Creates or retrieves a chat room between current user and target contact
 */
export async function getOrCreateChatRoom(
  currentUserId: string,
  currentUserName: string,
  targetUserId: string,
  targetUserName: string,
  targetAvatar?: string,
  topic?: string
): Promise<string> {
  const sortedIds = [currentUserId, targetUserId].sort();
  const roomId = `room_${sortedIds[0].replace(/[^a-zA-Z0-9_]/g, "_")}_${sortedIds[1].replace(/[^a-zA-Z0-9_]/g, "_")}`;

  const roomData: RealtimeChatRoom = {
    id: roomId,
    participants: [currentUserId, targetUserId],
    participantNames: {
      [currentUserId]: currentUserName,
      [targetUserId]: targetUserName,
    },
    participantAvatars: {
      [targetUserId]: targetAvatar || "",
    },
    supportTopic: topic || "Direct Message",
    createdAt: new Date().toISOString(),
  };

  // 1. Try Firestore
  try {
    const roomRef = doc(firestoreDb, "chats", roomId);
    const existing = await getDoc(roomRef);
    if (!existing.exists()) {
      await setDoc(roomRef, {
        ...roomData,
        createdAt: serverTimestamp(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `chats/${roomId}`);
  }

  // 2. Persist in local storage mirror
  const localList = getLocalChats(currentUserId);
  if (!localList.some((c) => c.id === roomId)) {
    saveLocalChats(currentUserId, [roomData, ...localList]);
  }

  return roomId;
}

/**
 * Subscribes to real-time chats for the given user
 */
export function subscribeToUserChats(
  userId: string,
  callback: (chats: RealtimeChatRoom[]) => void
): Unsubscribe {
  const initialLocal = getLocalChats(userId);
  callback(initialLocal);

  try {
    const chatsQuery = query(
      collection(firestoreDb, "chats"),
      where("participants", "array-contains", userId)
    );

    const unsubscribe = onSnapshot(
      chatsQuery,
      (snapshot) => {
        const list: RealtimeChatRoom[] = [];
        snapshot.forEach((d) => {
          const data = d.data();
          list.push({
            id: d.id,
            participants: data.participants || [],
            participantNames: data.participantNames || {},
            participantAvatars: data.participantAvatars || {},
            lastMessageText: data.lastMessageText || "",
            lastMessageTime: data.lastMessageTime?.toDate?.() || data.lastMessageTime,
            supportTopic: data.supportTopic || "General",
            createdAt: data.createdAt?.toDate?.() || data.createdAt,
          });
        });

        // Merge with local list
        const mergedMap = new Map<string, RealtimeChatRoom>();
        initialLocal.forEach((c) => mergedMap.set(c.id, c));
        list.forEach((c) => mergedMap.set(c.id, c));
        const merged = Array.from(mergedMap.values());
        saveLocalChats(userId, merged);
        callback(merged);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, "chats");
        callback(getLocalChats(userId));
      }
    );

    return unsubscribe;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, "chats");
    return () => {};
  }
}

/**
 * Subscribes to real-time messages in a specific chat
 */
export function subscribeToChatMessages(
  chatId: string,
  callback: (messages: RealtimeChatMessage[]) => void
): Unsubscribe {
  const initialLocal = getLocalMessages(chatId);
  callback(initialLocal);

  try {
    const msgsQuery = query(
      collection(firestoreDb, "chats", chatId, "messages"),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(
      msgsQuery,
      (snapshot) => {
        const msgs: RealtimeChatMessage[] = [];
        snapshot.forEach((d) => {
          const data = d.data();
          msgs.push({
            id: d.id,
            chatId: data.chatId || chatId,
            senderId: data.senderId,
            senderName: data.senderName,
            senderAvatar: data.senderAvatar,
            text: data.text,
            createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          });
        });

        if (msgs.length > 0) {
          saveLocalMessages(chatId, msgs);
          callback(msgs);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, `chats/${chatId}/messages`);
        callback(getLocalMessages(chatId));
      }
    );

    return unsubscribe;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, `chats/${chatId}/messages`);
    return () => {};
  }
}

/**
 * Sends a real-time message to a chat room
 */
export async function sendMessageToChat(
  chatId: string,
  senderId: string,
  senderName: string,
  text: string,
  senderAvatar?: string
): Promise<RealtimeChatMessage> {
  const cleanText = text.trim().slice(0, 3000);
  if (!cleanText) throw new Error("Message text cannot be empty");

  const newMsgId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const localMsg: RealtimeChatMessage = {
    id: newMsgId,
    chatId,
    senderId,
    senderName,
    senderAvatar: senderAvatar || "",
    text: cleanText,
    createdAt: new Date().toISOString(),
  };

  // 1. Instantly save in local storage
  const currentLocal = getLocalMessages(chatId);
  saveLocalMessages(chatId, [...currentLocal, localMsg]);

  // 2. Write to Firestore
  try {
    const msgRef = doc(firestoreDb, "chats", chatId, "messages", newMsgId);
    await setDoc(msgRef, {
      chatId,
      senderId,
      senderName,
      senderAvatar: senderAvatar || "",
      text: cleanText,
      createdAt: serverTimestamp(),
    });

    // Update parent room last message
    const roomRef = doc(firestoreDb, "chats", chatId);
    await setDoc(
      roomRef,
      {
        lastMessageText: cleanText,
        lastMessageTime: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `chats/${chatId}/messages/${newMsgId}`);
  }

  return localMsg;
}
