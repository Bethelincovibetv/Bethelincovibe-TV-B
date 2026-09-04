import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import {
  initializeFirestore,
  getFirestore,
  setLogLevel,
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  getDoc,
  getDocFromServer,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  increment,
  Unsubscribe,
} from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";
import { supabase } from "@/integrations/supabase/client";

// Silence internal verbose connection retry logs from Firebase SDK
try {
  setLogLevel("silent");
} catch {}

// Initialize Firebase App
export const firebaseApp = !getApps().length
  ? initializeApp(firebaseConfig)
  : getApp();

export const firebaseAuth = getAuth(firebaseApp);

// Initialize resilient Firestore with auto-detect long polling for sandbox/iframe support
export const firestoreDb = (() => {
  try {
    return initializeFirestore(firebaseApp, {
      experimentalAutoDetectLongPolling: true,
      ignoreUndefinedProperties: true,
    });
  } catch {
    return getFirestore(firebaseApp);
  }
})();

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
  };
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
      continue; // Never write undefined to Firestore
    }
    if (value === null) {
      cleaned[key] = null;
    } else if (Array.isArray(value)) {
      cleaned[key] = value
        .filter((v) => v !== undefined)
        .map((v) => (typeof v === "object" && v !== null && !(v as any)._methodName ? sanitizeFirestoreObject(v) : v));
    } else if (typeof value === "object") {
      // Check if it's a Firestore sentinel like serverTimestamp(), Timestamp, or FieldValue
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
    },
    operationType,
    path,
  };
  const errString = (error instanceof Error ? error.message : String(error)).toLowerCase();
  const isOfflineOrUnavailable =
    errString.includes("unavailable") ||
    errString.includes("could not reach") ||
    errString.includes("failed to fetch") ||
    errString.includes("network_error");

  if (!isOfflineOrUnavailable) {
    console.warn("Firestore Notice: ", JSON.stringify(errInfo));
  }
  return errInfo;
}

export const PLATFORM_ADMIN_EMAILS = [
  "goodgiftdigital@gmail.com",
  "bethelincovibetv@gmail.com",
  "bethelgoodgift3@gmail.com",
  "bethelchukwunyere1@gmail.com",
];

export function isPlatformAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return PLATFORM_ADMIN_EMAILS.includes(email.toLowerCase().trim());
}

export async function testFirestoreConnection(): Promise<boolean> {
  try {
    const testPromise = getDoc(doc(firestoreDb, "test", "connection"));
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Firestore connection timeout")), 3000)
    );
    await Promise.race([testPromise, timeoutPromise]);
    return true;
  } catch {
    return false;
  }
}

export interface RealtimeChatRoom {
  id: string;
  name?: string;
  description?: string;
  roomType?: "direct" | "group" | "community" | "official" | "trade_mastermind" | "business_inquiry";
  avatarEmoji?: string;
  avatarUrl?: string;
  creatorId?: string;
  adminIds?: string[];
  moderatorIds?: string[];
  roles?: Record<string, "owner" | "admin" | "moderator" | "member">;
  unreadCounts?: Record<string, number>;
  isOfficial?: boolean;
  participants: string[];
  participantNames: Record<string, string>;
  participantAvatars?: Record<string, string>;
  onlyAdminsCanPost?: boolean;
  onlyAdminsCanEditInfo?: boolean;
  lastMessageText?: string;
  lastMessageTime?: any;
  lastMessageSenderId?: string;
  lastMessageSenderName?: string;
  supportTopic?: string;
  createdAt: any;
  updatedAt?: any;
}

export interface RealtimeChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  text: string;
  type?: "text" | "image" | "video" | "voice_note" | "file" | "system";
  mediaUrl?: string;
  fileName?: string;
  fileSize?: number;
  mediaDuration?: number;
  createdAt: any;
  replyTo?: {
    id: string;
    senderName: string;
    text: string;
  };
  reactions?: Record<string, string[]>; // emoji -> array of userIds
  readBy?: string[];
  deletedForEveryone?: boolean;
  isLocalPending?: boolean;
}

export interface ChatTypingUser {
  userId: string;
  userName: string;
  isTyping: boolean;
  updatedAt?: any;
}

export interface UserPresenceState {
  userId: string;
  userName?: string;
  status: "online" | "offline";
  lastSeen?: string;
}

let authInitPromise: Promise<string> | null = null;

/**
 * Ensures Firebase Auth has an active session
 */
export async function ensureFirebaseAuth(): Promise<string> {
  if (firebaseAuth.currentUser) {
    return firebaseAuth.currentUser.uid;
  }
  if (!authInitPromise) {
    authInitPromise = signInAnonymously(firebaseAuth)
      .then((cred) => cred.user.uid)
      .catch((err) => {
        console.warn("Firebase Auth fallback session:", err);
        return "guest_user";
      })
      .finally(() => {
        authInitPromise = null;
      });
  }
  return authInitPromise;
}

export const BETHELINCO_GENERAL_ROOM_ID = "room_bethelincovibetv_general";
export const BETHELINCO_TRADE_ROOM_ID = "room_bethelincovibetv_vip_trade";

/**
 * Connects to or creates the official BethelincovibeTV Community Chat Room
 */
export async function getOrCreateGeneralBethelChatRoom(
  userId: string,
  userName: string,
  userAvatar?: string
): Promise<RealtimeChatRoom> {
  await ensureFirebaseAuth();
  const roomId = BETHELINCO_GENERAL_ROOM_ID;
  const officialRoomData: RealtimeChatRoom = {
    id: roomId,
    name: "Bethelincovibe TV Official Community Lounge",
    description: "Official real-time networking & verified commerce lounge for all entrepreneurs, merchants, and platform creators.",
    roomType: "community",
    avatarUrl: "/logo.png",
    avatarEmoji: "📺",
    isOfficial: true,
    creatorId: "system_admin",
    adminIds: ["system_admin", "admin_lead"],
    participants: [userId, "system_admin"],
    participantNames: {
      [userId]: userName || "Entrepreneur",
      system_admin: "Bethelincovibe TV Official",
    },
    participantAvatars: {
      system_admin: "/logo.png",
      [userId]: userAvatar || "",
    },
    onlyAdminsCanPost: false,
    onlyAdminsCanEditInfo: true,
    lastMessageText: "Welcome to Bethelincovibe TV Official Community! 🚀 Connect, trade, and collaborate in real-time.",
    createdAt: new Date().toISOString(),
  };

  try {
    const roomRef = doc(firestoreDb, "chats", roomId);
    const existing = await getDoc(roomRef);

    if (existing.exists()) {
      const data = existing.data() as any;
      const participants = Array.isArray(data.participants) ? [...data.participants] : [];
      const participantNames = { ...(data.participantNames || {}) };
      const participantAvatars = { ...(data.participantAvatars || {}) };

      if (!participants.includes(userId)) {
        participants.push(userId);
      }
      participantNames[userId] = userName || "Member";
      if (userAvatar) participantAvatars[userId] = userAvatar;

      await setDoc(
        roomRef,
        sanitizeFirestoreObject({
          participants,
          participantNames,
          participantAvatars,
          updatedAt: serverTimestamp(),
        }),
        { merge: true }
      );
      return {
        ...data,
        id: roomId,
        participants,
        participantNames,
        participantAvatars,
      };
    } else {
      await setDoc(
        roomRef,
        sanitizeFirestoreObject({
          ...officialRoomData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          lastMessageTime: serverTimestamp(),
        })
      );
      return officialRoomData;
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `chats/${roomId}`);
    return officialRoomData;
  }
}

/**
 * Creates or gets the VIP Trade Mastermind Hub
 */
export async function getOrCreateVIPTradeChatRoom(
  userId: string,
  userName: string,
  userAvatar?: string
): Promise<RealtimeChatRoom> {
  await ensureFirebaseAuth();
  const roomId = BETHELINCO_TRADE_ROOM_ID;
  const tradeRoomData: RealtimeChatRoom = {
    id: roomId,
    name: "VIP Trade & Escrow Mastermind Hub",
    description: "Verified Nigeria & West Africa wholesale trade offers, container cargo shares, and escrow deals.",
    roomType: "trade_mastermind",
    avatarUrl: "/logo.png",
    avatarEmoji: "🚀",
    isOfficial: true,
    creatorId: "system_admin",
    adminIds: ["system_admin"],
    participants: [userId, "system_admin"],
    participantNames: {
      [userId]: userName || "VIP Trader",
      system_admin: "Bethelincovibe Escrow Desk",
    },
    participantAvatars: {
      system_admin: "/logo.png",
      [userId]: userAvatar || "",
    },
    onlyAdminsCanPost: false,
    onlyAdminsCanEditInfo: true,
    lastMessageText: "Verified B2B wholesale deals, freight dispatch, and partnership agreements.",
    createdAt: new Date().toISOString(),
  };

  try {
    const roomRef = doc(firestoreDb, "chats", roomId);
    const existing = await getDoc(roomRef);

    if (existing.exists()) {
      const data = existing.data() as any;
      const participants = Array.isArray(data.participants) ? [...data.participants] : [];
      const participantNames = { ...(data.participantNames || {}) };
      const participantAvatars = { ...(data.participantAvatars || {}) };

      if (!participants.includes(userId)) {
        participants.push(userId);
      }
      participantNames[userId] = userName || "VIP Trader";
      if (userAvatar) participantAvatars[userId] = userAvatar;

      await setDoc(
        roomRef,
        sanitizeFirestoreObject({
          participants,
          participantNames,
          participantAvatars,
          updatedAt: serverTimestamp(),
        }),
        { merge: true }
      );
      return {
        ...data,
        id: roomId,
        participants,
        participantNames,
        participantAvatars,
      };
    } else {
      await setDoc(
        roomRef,
        sanitizeFirestoreObject({
          ...tradeRoomData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          lastMessageTime: serverTimestamp(),
        })
      );
      return tradeRoomData;
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `chats/${roomId}`);
    return tradeRoomData;
  }
}

/**
 * Creates or retrieves a direct 1-on-1 private chat room between two users
 */
export async function getOrCreateChatRoom(
  currentUserId: string,
  currentUserName: string,
  targetUserId: string,
  targetUserName: string,
  targetAvatar?: string,
  topic?: string,
  currentUserAvatar?: string
): Promise<string> {
  await ensureFirebaseAuth();
  const sortedIds = [currentUserId, targetUserId].sort();
  const roomId = `room_${sortedIds[0].replace(/[^a-zA-Z0-9_]/g, "_")}_${sortedIds[1].replace(/[^a-zA-Z0-9_]/g, "_")}`;

  const roomData: RealtimeChatRoom = {
    id: roomId,
    name: targetUserName,
    description: topic || `Direct chat between ${currentUserName} and ${targetUserName}`,
    roomType: "direct",
    avatarUrl: targetAvatar || "",
    avatarEmoji: "👤",
    creatorId: currentUserId,
    adminIds: [currentUserId, targetUserId],
    participants: [currentUserId, targetUserId],
    participantNames: {
      [currentUserId]: currentUserName,
      [targetUserId]: targetUserName,
    },
    participantAvatars: {
      [currentUserId]: currentUserAvatar || "",
      [targetUserId]: targetAvatar || "",
    },
    onlyAdminsCanPost: false,
    onlyAdminsCanEditInfo: false,
    supportTopic: topic || "Direct Message",
    createdAt: new Date().toISOString(),
  };

  try {
    const roomRef = doc(firestoreDb, "chats", roomId);
    const existing = await getDoc(roomRef);
    if (!existing.exists()) {
      await setDoc(
        roomRef,
        sanitizeFirestoreObject({
          ...roomData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          lastMessageTime: serverTimestamp(),
        })
      );
    } else {
      // Update participant metadata
      const data = existing.data() as any;
      const participantNames = { ...(data.participantNames || {}), [currentUserId]: currentUserName, [targetUserId]: targetUserName };
      const participantAvatars = { ...(data.participantAvatars || {}) };
      if (currentUserAvatar) participantAvatars[currentUserId] = currentUserAvatar;
      if (targetAvatar) participantAvatars[targetUserId] = targetAvatar;
      await setDoc(
        roomRef,
        sanitizeFirestoreObject({
          participantNames,
          participantAvatars,
          updatedAt: serverTimestamp(),
        }),
        { merge: true }
      );
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `chats/${roomId}`);
  }

  return roomId;
}

/**
 * Creates a custom Community / Group / Mastermind Chat Room
 */
export async function createCustomChatRoom(params: {
  creatorId: string;
  creatorName: string;
  creatorAvatar?: string;
  name: string;
  description: string;
  roomType: "group" | "community" | "trade_mastermind" | "business_inquiry";
  avatarEmoji: string;
  avatarUrl?: string;
  initialMemberIds?: string[];
  onlyAdminsCanPost?: boolean;
  onlyAdminsCanEditInfo?: boolean;
  isOfficial?: boolean;
}): Promise<string> {
  await ensureFirebaseAuth();
  const roomId = `room_${params.roomType}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const participants = Array.from(new Set([params.creatorId, ...(params.initialMemberIds || [])]));
  const participantNames: Record<string, string> = { [params.creatorId]: params.creatorName };
  const participantAvatars: Record<string, string> = { [params.creatorId]: params.creatorAvatar || "" };

  const roomData: RealtimeChatRoom = {
    id: roomId,
    name: params.name,
    description: params.description,
    roomType: params.roomType,
    avatarEmoji: params.avatarEmoji,
    avatarUrl: params.avatarUrl || "",
    creatorId: params.creatorId,
    adminIds: [params.creatorId],
    isOfficial: !!params.isOfficial,
    participants,
    participantNames,
    participantAvatars,
    onlyAdminsCanPost: !!params.onlyAdminsCanPost,
    onlyAdminsCanEditInfo: params.onlyAdminsCanEditInfo !== undefined ? params.onlyAdminsCanEditInfo : true,
    lastMessageText: `Group created by ${params.creatorName}`,
    createdAt: new Date().toISOString(),
  };

  try {
    const roomRef = doc(firestoreDb, "chats", roomId);
    await setDoc(
      roomRef,
      sanitizeFirestoreObject({
        ...roomData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastMessageTime: serverTimestamp(),
      })
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `chats/${roomId}`);
  }

  return roomId;
}

/**
 * Allows a user to join a public or community chat room
 */
export async function joinCommunityChatRoom(
  chatId: string,
  userId: string,
  userName: string,
  userAvatar?: string
): Promise<void> {
  await ensureFirebaseAuth();
  try {
    const roomRef = doc(firestoreDb, "chats", chatId);
    const snap = await getDoc(roomRef);
    if (snap.exists()) {
      const data = snap.data();
      const participants = Array.from(new Set([...(data.participants || []), userId]));
      const participantNames = { ...(data.participantNames || {}), [userId]: userName };
      const participantAvatars = { ...(data.participantAvatars || {}) };
      if (userAvatar) participantAvatars[userId] = userAvatar;

      await setDoc(
        roomRef,
        sanitizeFirestoreObject({
          participants,
          participantNames,
          participantAvatars,
          updatedAt: serverTimestamp(),
        }),
        { merge: true }
      );
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `chats/${chatId}`);
  }
}

/**
 * Allows a user to leave a group or room
 */
export async function leaveChatRoom(chatId: string, userId: string): Promise<void> {
  await ensureFirebaseAuth();
  try {
    const roomRef = doc(firestoreDb, "chats", chatId);
    const snap = await getDoc(roomRef);
    if (snap.exists()) {
      const data = snap.data();
      const participants = (data.participants || []).filter((id: string) => id !== userId);
      const adminIds = (data.adminIds || []).filter((id: string) => id !== userId);
      await setDoc(
        roomRef,
        sanitizeFirestoreObject({
          participants,
          adminIds,
          updatedAt: serverTimestamp(),
        }),
        { merge: true }
      );
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `chats/${chatId}`);
  }
}

/**
 * Updates group settings, info, and permissions
 */
export async function updateChatRoomDetails(
  chatId: string,
  updates: {
    name?: string;
    description?: string;
    avatarEmoji?: string;
    avatarUrl?: string;
    onlyAdminsCanPost?: boolean;
    onlyAdminsCanEditInfo?: boolean;
  }
): Promise<void> {
  await ensureFirebaseAuth();
  try {
    const roomRef = doc(firestoreDb, "chats", chatId);
    await setDoc(
      roomRef,
      sanitizeFirestoreObject({
        ...updates,
        updatedAt: serverTimestamp(),
      }),
      { merge: true }
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `chats/${chatId}`);
    throw err;
  }
}

/**
 * Group Admin Action: Add member to a chat room
 */
export async function addMemberToChatRoom(
  chatId: string,
  memberId: string,
  memberName: string,
  memberAvatar?: string
): Promise<void> {
  await ensureFirebaseAuth();
  try {
    const roomRef = doc(firestoreDb, "chats", chatId);
    const snap = await getDoc(roomRef);
    if (snap.exists()) {
      const data = snap.data();
      const participants = Array.from(new Set([...(data.participants || []), memberId]));
      const participantNames = { ...(data.participantNames || {}), [memberId]: memberName };
      const participantAvatars = { ...(data.participantAvatars || {}) };
      if (memberAvatar) participantAvatars[memberId] = memberAvatar;

      await setDoc(
        roomRef,
        sanitizeFirestoreObject({
          participants,
          participantNames,
          participantAvatars,
          updatedAt: serverTimestamp(),
        }),
        { merge: true }
      );
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `chats/${chatId}`);
    throw err;
  }
}

/**
 * Group Admin Action: Remove a member from a chat room
 */
export async function removeMemberFromChatRoom(
  chatId: string,
  memberId: string
): Promise<void> {
  await ensureFirebaseAuth();
  try {
    const roomRef = doc(firestoreDb, "chats", chatId);
    const snap = await getDoc(roomRef);
    if (snap.exists()) {
      const data = snap.data();
      const participants = (data.participants || []).filter((id: string) => id !== memberId);
      const adminIds = (data.adminIds || []).filter((id: string) => id !== memberId);
      await setDoc(
        roomRef,
        sanitizeFirestoreObject({
          participants,
          adminIds,
          updatedAt: serverTimestamp(),
        }),
        { merge: true }
      );
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `chats/${chatId}`);
    throw err;
  }
}

/**
 * Group Admin Action: Promote member to Group Admin
 */
export async function promoteMemberToAdmin(
  chatId: string,
  memberId: string
): Promise<void> {
  await ensureFirebaseAuth();
  try {
    const roomRef = doc(firestoreDb, "chats", chatId);
    const snap = await getDoc(roomRef);
    if (snap.exists()) {
      const data = snap.data();
      const adminIds = Array.from(new Set([...(data.adminIds || []), memberId]));
      await setDoc(
        roomRef,
        sanitizeFirestoreObject({
          adminIds,
          updatedAt: serverTimestamp(),
        }),
        { merge: true }
      );
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `chats/${chatId}`);
    throw err;
  }
}

/**
 * Group Admin Action: Demote Group Admin to regular member
 */
export async function demoteAdminToMember(
  chatId: string,
  memberId: string
): Promise<void> {
  await ensureFirebaseAuth();
  try {
    const roomRef = doc(firestoreDb, "chats", chatId);
    const snap = await getDoc(roomRef);
    if (snap.exists()) {
      const data = snap.data();
      const adminIds = (data.adminIds || []).filter((id: string) => id !== memberId);
      await setDoc(
        roomRef,
        sanitizeFirestoreObject({
          adminIds,
          updatedAt: serverTimestamp(),
        }),
        { merge: true }
      );
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `chats/${chatId}`);
    throw err;
  }
}

/**
 * Group Admin Action: Promote member to Group Moderator
 */
export async function promoteMemberToModerator(
  chatId: string,
  memberId: string
): Promise<void> {
  await ensureFirebaseAuth();
  try {
    const roomRef = doc(firestoreDb, "chats", chatId);
    const snap = await getDoc(roomRef);
    if (snap.exists()) {
      const data = snap.data();
      const moderatorIds = Array.from(new Set([...(data.moderatorIds || []), memberId]));
      await setDoc(
        roomRef,
        sanitizeFirestoreObject({
          moderatorIds,
          updatedAt: serverTimestamp(),
        }),
        { merge: true }
      );
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `chats/${chatId}`);
    throw err;
  }
}

/**
 * Group Admin Action: Demote Group Moderator to regular member
 */
export async function demoteModeratorToMember(
  chatId: string,
  memberId: string
): Promise<void> {
  await ensureFirebaseAuth();
  try {
    const roomRef = doc(firestoreDb, "chats", chatId);
    const snap = await getDoc(roomRef);
    if (snap.exists()) {
      const data = snap.data();
      const moderatorIds = (data.moderatorIds || []).filter((id: string) => id !== memberId);
      await setDoc(
        roomRef,
        sanitizeFirestoreObject({
          moderatorIds,
          updatedAt: serverTimestamp(),
        }),
        { merge: true }
      );
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `chats/${chatId}`);
    throw err;
  }
}

/**
 * Deletes an entire chat room (Creator or Platform Admin only)
 */
export async function deleteChatRoom(chatId: string): Promise<void> {
  await ensureFirebaseAuth();
  try {
    const roomRef = doc(firestoreDb, "chats", chatId);
    await deleteDoc(roomRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `chats/${chatId}`);
    throw err;
  }
}

/**
 * Subscribes to real-time chats for the given user (including public community channels)
 */
export function subscribeToUserChats(
  userId: string,
  callback: (chats: RealtimeChatRoom[]) => void
): Unsubscribe {
  ensureFirebaseAuth();

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
            ...data,
            name: data.name,
            description: data.description,
            roomType: data.roomType,
            avatarEmoji: data.avatarEmoji,
            avatarUrl: data.avatarUrl,
            creatorId: data.creatorId,
            adminIds: data.adminIds || [],
            moderatorIds: data.moderatorIds || [],
            roles: data.roles || {},
            isOfficial: data.isOfficial,
            participants: data.participants || [],
            participantNames: data.participantNames || {},
            participantAvatars: data.participantAvatars || {},
            onlyAdminsCanPost: data.onlyAdminsCanPost,
            onlyAdminsCanEditInfo: data.onlyAdminsCanEditInfo,
            lastMessageText: data.lastMessageText || "",
            lastMessageTime: data.lastMessageTime?.toDate?.()?.toISOString() || data.lastMessageTime || new Date().toISOString(),
            lastMessageSenderId: data.lastMessageSenderId,
            lastMessageSenderName: data.lastMessageSenderName,
            supportTopic: data.supportTopic || "General",
            createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt || new Date().toISOString(),
            updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
          });
        });

        // Sort by most recent activity
        list.sort((a, b) => {
          const tA = new Date(a.lastMessageTime || a.createdAt).getTime();
          const tB = new Date(b.lastMessageTime || b.createdAt).getTime();
          return tB - tA;
        });

        callback(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, "chats");
      }
    );

    return unsubscribe;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, "chats");
    return () => {};
  }
}

/**
 * Subscribes to all public community rooms on Bethelincovibe TV
 */
export function subscribeToPublicCommunityRooms(
  callback: (rooms: RealtimeChatRoom[]) => void
): Unsubscribe {
  ensureFirebaseAuth();
  try {
    const q = query(
      collection(firestoreDb, "chats"),
      where("roomType", "in", ["community", "official", "trade_mastermind"])
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: RealtimeChatRoom[] = [];
        snapshot.forEach((d) => {
          const data = d.data();
          list.push({
            id: d.id,
            name: data.name,
            description: data.description,
            roomType: data.roomType,
            avatarEmoji: data.avatarEmoji,
            avatarUrl: data.avatarUrl,
            creatorId: data.creatorId,
            adminIds: data.adminIds || [],
            isOfficial: data.isOfficial,
            participants: data.participants || [],
            participantNames: data.participantNames || {},
            participantAvatars: data.participantAvatars || {},
            onlyAdminsCanPost: data.onlyAdminsCanPost,
            onlyAdminsCanEditInfo: data.onlyAdminsCanEditInfo,
            lastMessageText: data.lastMessageText || "",
            lastMessageTime: data.lastMessageTime?.toDate?.()?.toISOString() || data.lastMessageTime || new Date().toISOString(),
            createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
          });
        });
        callback(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, "chats");
      }
    );
    return unsubscribe;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, "chats");
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
  ensureFirebaseAuth();

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
            text: data.text || "",
            type: data.type || "text",
            mediaUrl: data.mediaUrl || data.imageUrl,
            fileName: data.fileName,
            fileSize: data.fileSize,
            mediaDuration: data.mediaDuration,
            createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt || new Date().toISOString(),
            replyTo: data.replyTo || undefined,
            reactions: data.reactions || undefined,
            readBy: data.readBy || [],
            deletedForEveryone: !!data.deletedForEveryone,
          });
        });

        callback(msgs);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, `chats/${chatId}/messages`);
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
export type SendMessageParams = {
  chatId: string;
  senderId: string;
  senderName: string;
  text?: string;
  senderAvatar?: string;
  type?: "text" | "image" | "video" | "voice_note" | "file" | "system";
  mediaUrl?: string;
  fileName?: string;
  fileSize?: number;
  mediaDuration?: number;
  replyTo?: { id: string; senderName: string; text: string };
};

/**
 * Sends a real-time message to a chat room.
 * Supports both options object and legacy positional argument signatures with complete input sanitization.
 */
export async function sendMessageToChat(
  paramsOrChatId: SendMessageParams | string,
  maybeSenderId?: string,
  maybeSenderName?: string,
  maybeText?: string,
  maybeAvatar?: string,
  maybeReplyTo?: { id: string; senderName: string; text: string },
  maybeMediaUrl?: string,
  maybeType?: "text" | "image" | "video" | "voice_note" | "file" | "system"
): Promise<RealtimeChatMessage> {
  await ensureFirebaseAuth();

  let chatId: string;
  let senderId: string;
  let senderName: string;
  let text: string;
  let senderAvatar: string = "";
  let type: "text" | "image" | "video" | "voice_note" | "file" | "system" = "text";
  let mediaUrl: string = "";
  let fileName: string = "";
  let fileSize: number = 0;
  let mediaDuration: number = 0;
  let replyTo: { id: string; senderName: string; text: string } | undefined = undefined;

  if (typeof paramsOrChatId === "object" && paramsOrChatId !== null) {
    chatId = String(paramsOrChatId.chatId || "").trim();
    senderId = String(paramsOrChatId.senderId || "").trim();
    senderName = String(paramsOrChatId.senderName || "Member").trim();
    text = (paramsOrChatId.text || "").trim();
    senderAvatar = paramsOrChatId.senderAvatar || "";
    type = paramsOrChatId.type || (paramsOrChatId.mediaUrl ? "image" : "text");
    mediaUrl = paramsOrChatId.mediaUrl || "";
    fileName = paramsOrChatId.fileName || "";
    fileSize = Number(paramsOrChatId.fileSize || 0);
    mediaDuration = Number(paramsOrChatId.mediaDuration || 0);
    replyTo = paramsOrChatId.replyTo;
  } else {
    chatId = String(paramsOrChatId || "").trim();
    senderId = String(maybeSenderId || "").trim();
    senderName = String(maybeSenderName || "Member").trim();
    text = (maybeText || "").trim();
    senderAvatar = maybeAvatar || "";
    replyTo = maybeReplyTo;
    mediaUrl = maybeMediaUrl || "";
    type = maybeType || (maybeMediaUrl ? "image" : "text");
  }

  if (!chatId) {
    throw new Error("Chat ID is required to send a message");
  }
  if (!senderId) {
    senderId = `anon_${Date.now()}`;
  }
  if (!senderName) {
    senderName = "Member";
  }

  const cleanText = text.slice(0, 3000);
  if (!cleanText && !mediaUrl) {
    throw new Error("Message text or media attachment cannot be empty");
  }

  const newMsgId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  const rawMsgDoc: Record<string, any> = {
    id: newMsgId,
    chatId,
    senderId,
    senderName,
    senderAvatar,
    text: cleanText,
    type,
    mediaUrl,
    fileName,
    fileSize,
    mediaDuration,
    reactions: {},
    readBy: [senderId],
    deletedForEveryone: false,
    createdAt: serverTimestamp(),
  };

  if (replyTo && replyTo.id && (replyTo.text || replyTo.senderName)) {
    rawMsgDoc.replyTo = {
      id: String(replyTo.id),
      senderName: String(replyTo.senderName || "Member"),
      text: String(replyTo.text || ""),
    };
  }

  const sanitizedMsg = sanitizeFirestoreObject(rawMsgDoc);

  try {
    const msgRef = doc(firestoreDb, "chats", chatId, "messages", newMsgId);
    await setDoc(msgRef, sanitizedMsg);

    // Update parent room last message metadata
    let snippet = cleanText;
    if (!snippet) {
      if (type === "image") snippet = "📷 Photo";
      else if (type === "video") snippet = "🎥 Video";
      else if (type === "voice_note") snippet = "🎙️ Voice note";
      else if (type === "file") snippet = `📎 ${fileName || "Document"}`;
      else snippet = "Message attachment";
    }

    const roomRef = doc(firestoreDb, "chats", chatId);
    const roomUpdates: Record<string, any> = {
      lastMessageText: snippet,
      lastMessageSenderId: senderId,
      lastMessageSenderName: senderName,
      lastMessageTime: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    try {
      const roomSnap = await getDoc(roomRef);
      if (roomSnap.exists()) {
        const roomData = roomSnap.data();
        const participants: string[] = roomData.participants || [];
        participants.forEach((pid) => {
          if (pid !== senderId) {
            roomUpdates[`unreadCount_${pid}`] = increment(1);
          }
        });
      }
    } catch {}

    await setDoc(
      roomRef,
      sanitizeFirestoreObject(roomUpdates),
      { merge: true }
    );

    // Optional notification insertion
    try {
      supabase.from("user_notifications").insert({
        title: `New message from ${senderName}`,
        message: snippet.slice(0, 120),
        type: "chat",
        action_url: `/chat?room=${chatId}`,
      }).then(() => {}).catch(() => {});
    } catch {}
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `chats/${chatId}/messages/${newMsgId}`);
    throw err;
  }

  const returnedMessage: RealtimeChatMessage = {
    id: newMsgId,
    chatId,
    senderId,
    senderName,
    senderAvatar,
    text: cleanText,
    type,
    mediaUrl,
    fileName,
    fileSize,
    mediaDuration,
    createdAt: new Date().toISOString(),
    replyTo: replyTo && replyTo.id ? replyTo : undefined,
    reactions: {},
    readBy: [senderId],
    deletedForEveryone: false,
  };

  return returnedMessage;
}

/**
 * Toggles an emoji reaction on a specific message
 */
export async function toggleMessageReaction(
  chatId: string,
  messageId: string,
  emoji: string,
  userId: string
): Promise<void> {
  await ensureFirebaseAuth();
  try {
    const msgRef = doc(firestoreDb, "chats", chatId, "messages", messageId);
    const snap = await getDoc(msgRef);
    if (snap.exists()) {
      const data = snap.data();
      const reactions = { ...(data.reactions || {}) };
      const currentUsers: string[] = reactions[emoji] || [];
      if (currentUsers.includes(userId)) {
        reactions[emoji] = currentUsers.filter((u) => u !== userId);
        if (reactions[emoji].length === 0) delete reactions[emoji];
      } else {
        reactions[emoji] = [...currentUsers, userId];
      }
      await setDoc(
        msgRef,
        sanitizeFirestoreObject({ reactions }),
        { merge: true }
      );
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `chats/${chatId}/messages/${messageId}`);
  }
}

/**
 * Marks messages in a chat as read by the current user
 */
export async function markMessagesAsRead(chatId: string, userId: string): Promise<void> {
  await ensureFirebaseAuth();
  try {
    const roomRef = doc(firestoreDb, "chats", chatId);
    await setDoc(
      roomRef,
      sanitizeFirestoreObject({
        [`unreadCount_${userId}`]: 0,
        [`lastRead_${userId}`]: serverTimestamp(),
      }),
      { merge: true }
    );

    const msgsQuery = query(
      collection(firestoreDb, "chats", chatId, "messages"),
      orderBy("createdAt", "desc"),
      limit(50)
    );
    const snap = await getDocs(msgsQuery);
    const updates = snap.docs.filter((d) => {
      const readBy: string[] = d.data().readBy || [];
      return !readBy.includes(userId);
    });

    for (const docSnap of updates) {
      const readBy = [...(docSnap.data().readBy || []), userId];
      await setDoc(
        docSnap.ref,
        sanitizeFirestoreObject({ readBy }),
        { merge: true }
      );
    }
  } catch (err) {
    console.warn("Error marking messages read:", err);
  }
}

/**
 * Soft deletes a message for everyone (Sender or Group Admin only)
 */
export async function deleteMessageForEveryone(
  chatId: string,
  messageId: string
): Promise<void> {
  await ensureFirebaseAuth();
  try {
    const msgRef = doc(firestoreDb, "chats", chatId, "messages", messageId);
    await setDoc(
      msgRef,
      sanitizeFirestoreObject({
        text: "🚫 This message was deleted.",
        mediaUrl: "",
        deletedForEveryone: true,
      }),
      { merge: true }
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `chats/${chatId}/messages/${messageId}`);
    throw err;
  }
}

/**
 * Real-time typing indicator heartbeat
 */
export async function setChatTypingState(
  chatId: string,
  userId: string,
  userName: string,
  isTyping: boolean
): Promise<void> {
  await ensureFirebaseAuth();
  try {
    const typingRef = doc(firestoreDb, "chats", chatId, "typing", userId);
    await setDoc(
      typingRef,
      sanitizeFirestoreObject({
        userId,
        userName,
        isTyping,
        updatedAt: serverTimestamp(),
      }),
      { merge: true }
    );
  } catch (err) {
    // Non-blocking
  }
}

/**
 * Subscribes to real-time typing indicators in a chat room
 */
export function subscribeToChatTyping(
  chatId: string,
  currentUserId: string,
  callback: (typingUsers: string[]) => void
): Unsubscribe {
  ensureFirebaseAuth();
  try {
    const typingCol = collection(firestoreDb, "chats", chatId, "typing");
    const unsubscribe = onSnapshot(
      typingCol,
      (snapshot) => {
        const users: string[] = [];
        const now = Date.now();
        snapshot.forEach((d) => {
          const data = d.data();
          const updatedMs = data.updatedAt?.toMillis?.() || (data.updatedAt ? new Date(data.updatedAt).getTime() : now);
          // Only show as typing if the indicator was updated within the last 10 seconds
          const isFresh = now - updatedMs < 10000;
          if (data.isTyping && isFresh && data.userId !== currentUserId && data.userName) {
            users.push(data.userName);
          }
        });
        callback(users);
      },
      () => {
        callback([]);
      }
    );
    return unsubscribe;
  } catch {
    return () => {};
  }
}

/**
 * Updates online presence for a user
 */
export async function updateUserPresence(
  userId: string,
  userName: string,
  status: "online" | "offline"
): Promise<void> {
  await ensureFirebaseAuth();
  try {
    const presenceRef = doc(firestoreDb, "presence", userId);
    await setDoc(
      presenceRef,
      sanitizeFirestoreObject({
        userId,
        userName,
        status,
        lastSeen: serverTimestamp(),
      }),
      { merge: true }
    );
  } catch {}
}

/**
 * Subscribes to real-time presence and last seen state for a specific user
 */
export function subscribeToUserPresence(
  userId: string,
  callback: (presence: { status: "online" | "offline"; lastSeen?: any; userName?: string } | null) => void
): Unsubscribe {
  if (!userId) {
    callback(null);
    return () => {};
  }
  ensureFirebaseAuth();
  try {
    const presenceRef = doc(firestoreDb, "presence", userId);
    const unsubscribe = onSnapshot(
      presenceRef,
      (snap) => {
        if (!snap.exists()) {
          callback(null);
          return;
        }
        const data = snap.data();
        callback({
          status: data.status === "online" ? "online" : "offline",
          lastSeen: data.lastSeen,
          userName: data.userName,
        });
      },
      () => {
        callback(null);
      }
    );
    return unsubscribe;
  } catch {
    return () => {};
  }
}
