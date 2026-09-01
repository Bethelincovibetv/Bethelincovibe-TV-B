import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  Unsubscribe,
} from "firebase/firestore";
import { firestoreDb, ensureFirebaseAuth, handleFirestoreError, OperationType, sanitizeFirestoreObject } from "@/lib/firebaseChat";
import { supabase } from "@/integrations/supabase/client";

export type MessageType = "text" | "image" | "video" | "voice_note" | "file" | "system";
export type RoomType = "direct" | "group" | "community" | "official" | "trade_mastermind" | "business_inquiry";

export interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  text: string;
  type: MessageType;
  mediaUrl?: string;
  fileName?: string;
  fileSize?: number;
  mediaDuration?: number;
  createdAt: string;
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

export interface ChatConversation {
  id: string;
  name?: string;
  description?: string;
  roomType: RoomType;
  avatarEmoji?: string;
  avatarUrl?: string;
  creatorId?: string;
  adminIds?: string[];
  isOfficial?: boolean;
  participants: string[];
  participantNames: Record<string, string>;
  participantAvatars?: Record<string, string>;
  onlyAdminsCanPost?: boolean;
  onlyAdminsCanEditInfo?: boolean;
  lastMessageText?: string;
  lastMessageTime?: string;
  lastMessageSenderId?: string;
  lastMessageSenderName?: string;
  supportTopic?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface SendMessageParams {
  chatId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  text?: string;
  type?: MessageType;
  mediaUrl?: string;
  fileName?: string;
  fileSize?: number;
  mediaDuration?: number;
  replyTo?: {
    id: string;
    senderName: string;
    text: string;
  };
}

export interface CreateDirectChatParams {
  currentUserId: string;
  currentUserName: string;
  currentUserAvatar?: string;
  targetUserId: string;
  targetUserName: string;
  targetUserAvatar?: string;
  topic?: string;
}

export interface CreateGroupChatParams {
  creatorId: string;
  creatorName: string;
  creatorAvatar?: string;
  name: string;
  description?: string;
  roomType?: "group" | "community" | "trade_mastermind" | "business_inquiry";
  avatarEmoji?: string;
  avatarUrl?: string;
  initialMemberIds?: string[];
  onlyAdminsCanPost?: boolean;
  onlyAdminsCanEditInfo?: boolean;
  isOfficial?: boolean;
}

/**
 * Generate a deterministic direct chat room ID between two users
 */
export function getDirectConversationId(userId1: string, userId2: string): string {
  const cleanId1 = (userId1 || "").replace(/[^a-zA-Z0-9_]/g, "_");
  const cleanId2 = (userId2 || "").replace(/[^a-zA-Z0-9_]/g, "_");
  const sorted = [cleanId1, cleanId2].sort();
  return `room_${sorted[0]}_${sorted[1]}`;
}

/**
 * Convert Firestore timestamp or string to ISO string safely
 */
function normalizeDate(val: any): string {
  if (!val) return new Date().toISOString();
  if (typeof val === "string") return val;
  if (val instanceof Date) return val.toISOString();
  if (typeof val.toDate === "function") {
    try {
      return val.toDate().toISOString();
    } catch {
      return new Date().toISOString();
    }
  }
  if (val.seconds) {
    return new Date(val.seconds * 1000).toISOString();
  }
  return new Date().toISOString();
}

/**
 * Send a message to a direct or group conversation in Firestore
 */
export async function sendMessage(params: SendMessageParams): Promise<ChatMessage> {
  await ensureFirebaseAuth();
  const {
    chatId,
    senderId,
    senderName,
    senderAvatar = "",
    text = "",
    type = "text",
    mediaUrl = "",
    fileName = "",
    fileSize = 0,
    mediaDuration = 0,
    replyTo,
  } = params;

  const cleanText = (text || "").trim().slice(0, 3000);
  if (!cleanText && !mediaUrl) {
    throw new Error("Message cannot be empty");
  }

  const messageId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const nowIso = new Date().toISOString();

  const rawMsgDoc: Record<string, any> = {
    id: messageId,
    chatId: String(chatId),
    senderId: String(senderId),
    senderName: String(senderName || "Member"),
    senderAvatar: senderAvatar || "",
    text: cleanText,
    type: type || "text",
    mediaUrl: mediaUrl || "",
    fileName: fileName || "",
    fileSize: Number(fileSize || 0),
    mediaDuration: Number(mediaDuration || 0),
    reactions: {},
    readBy: [String(senderId)],
    deletedForEveryone: false,
    createdAt: serverTimestamp(),
  };

  if (replyTo && replyTo.id && replyTo.text) {
    rawMsgDoc.replyTo = {
      id: String(replyTo.id),
      senderName: String(replyTo.senderName || "Member"),
      text: String(replyTo.text || ""),
    };
  }

  try {
    const msgRef = doc(firestoreDb, "chats", chatId, "messages", messageId);
    await setDoc(msgRef, sanitizeFirestoreObject(rawMsgDoc));

    // Formulate a preview snippet for the parent conversation
    let snippet = cleanText;
    if (!snippet) {
      if (type === "image") snippet = "📷 Photo";
      else if (type === "video") snippet = "🎥 Video";
      else if (type === "voice_note") snippet = "🎙️ Voice note";
      else if (type === "file") snippet = `📎 ${fileName || "Document"}`;
      else snippet = "Media message";
    }

    const roomRef = doc(firestoreDb, "chats", chatId);
    await setDoc(
      roomRef,
      sanitizeFirestoreObject({
        lastMessageText: snippet,
        lastMessageSenderId: String(senderId),
        lastMessageSenderName: String(senderName || "Member"),
        lastMessageTime: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
      { merge: true }
    );

    // Optional notification trigger
    try {
      supabase.from("user_notifications").insert({
        title: `Message from ${senderName}`,
        message: snippet.slice(0, 120),
        type: "chat",
        action_url: `/chat?roomId=${chatId}`,
      }).then(() => {}).catch(() => {});
    } catch {}

    const returnedMessage: ChatMessage = {
      id: messageId,
      chatId,
      senderId,
      senderName: senderName || "Member",
      senderAvatar: senderAvatar || "",
      text: cleanText,
      type,
      mediaUrl: mediaUrl || "",
      fileName: fileName || "",
      fileSize: fileSize || 0,
      mediaDuration: mediaDuration || 0,
      createdAt: nowIso,
      replyTo: replyTo && replyTo.id ? replyTo : undefined,
      reactions: {},
      readBy: [senderId],
      deletedForEveryone: false,
    };

    return returnedMessage;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `chats/${chatId}/messages/${messageId}`);
    throw error;
  }
}

/**
 * Load historic messages for a chat room with ordering
 */
export async function loadMessageHistory(chatId: string, limitCount = 50): Promise<ChatMessage[]> {
  await ensureFirebaseAuth();
  try {
    const msgsQuery = query(
      collection(firestoreDb, "chats", chatId, "messages"),
      orderBy("createdAt", "asc"),
      limit(limitCount)
    );

    const snapshot = await getDocs(msgsQuery);
    const result: ChatMessage[] = [];

    snapshot.forEach((d) => {
      const data = d.data();
      result.push({
        id: d.id,
        chatId: data.chatId || chatId,
        senderId: data.senderId,
        senderName: data.senderName || "Member",
        senderAvatar: data.senderAvatar || "",
        text: data.text || "",
        type: (data.type as MessageType) || "text",
        mediaUrl: data.mediaUrl || data.imageUrl || "",
        fileName: data.fileName || "",
        fileSize: data.fileSize || 0,
        mediaDuration: data.mediaDuration || 0,
        createdAt: normalizeDate(data.createdAt),
        replyTo: data.replyTo || undefined,
        reactions: data.reactions || {},
        readBy: data.readBy || [],
        deletedForEveryone: !!data.deletedForEveryone,
      });
    });

    return result;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, `chats/${chatId}/messages`);
    return [];
  }
}

/**
 * Real-time listener for chat messages
 */
export function subscribeToMessages(
  chatId: string,
  onUpdate: (messages: ChatMessage[]) => void,
  onError?: (error: any) => void
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
        const msgs: ChatMessage[] = [];
        snapshot.forEach((d) => {
          const data = d.data();
          msgs.push({
            id: d.id,
            chatId: data.chatId || chatId,
            senderId: data.senderId,
            senderName: data.senderName || "Member",
            senderAvatar: data.senderAvatar || "",
            text: data.text || "",
            type: (data.type as MessageType) || "text",
            mediaUrl: data.mediaUrl || data.imageUrl || "",
            fileName: data.fileName || "",
            fileSize: data.fileSize || 0,
            mediaDuration: data.mediaDuration || 0,
            createdAt: normalizeDate(data.createdAt),
            replyTo: data.replyTo || undefined,
            reactions: data.reactions || {},
            readBy: data.readBy || [],
            deletedForEveryone: !!data.deletedForEveryone,
          });
        });
        onUpdate(msgs);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, `chats/${chatId}/messages`);
        if (onError) onError(err);
      }
    );

    return unsubscribe;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, `chats/${chatId}/messages`);
    if (onError) onError(err);
    return () => {};
  }
}

/**
 * Create or retrieve a direct 1-on-1 chat room between two users
 */
export async function getOrCreateDirectConversation(params: CreateDirectChatParams): Promise<string> {
  await ensureFirebaseAuth();
  const {
    currentUserId,
    currentUserName,
    currentUserAvatar = "",
    targetUserId,
    targetUserName,
    targetUserAvatar = "",
    topic,
  } = params;

  const roomId = getDirectConversationId(currentUserId, targetUserId);

  try {
    const roomRef = doc(firestoreDb, "chats", roomId);
    const existing = await getDoc(roomRef);

    if (!existing.exists()) {
      const roomData: ChatConversation = {
        id: roomId,
        name: targetUserName,
        description: topic || `Direct chat between ${currentUserName} and ${targetUserName}`,
        roomType: "direct",
        avatarUrl: targetUserAvatar,
        avatarEmoji: "👤",
        creatorId: currentUserId,
        adminIds: [currentUserId, targetUserId],
        participants: [currentUserId, targetUserId],
        participantNames: {
          [currentUserId]: currentUserName,
          [targetUserId]: targetUserName,
        },
        participantAvatars: {
          [currentUserId]: currentUserAvatar,
          [targetUserId]: targetUserAvatar,
        },
        onlyAdminsCanPost: false,
        onlyAdminsCanEditInfo: false,
        supportTopic: topic || "Direct Message",
        createdAt: new Date().toISOString(),
      };

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
      // Sync participant metadata
      const data = existing.data() as any;
      const participantNames = {
        ...(data.participantNames || {}),
        [currentUserId]: currentUserName,
        [targetUserId]: targetUserName,
      };
      const participantAvatars = { ...(data.participantAvatars || {}) };
      if (currentUserAvatar) participantAvatars[currentUserId] = currentUserAvatar;
      if (targetUserAvatar) participantAvatars[targetUserId] = targetUserAvatar;

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
 * Create a custom group conversation
 */
export async function createGroupConversation(params: CreateGroupChatParams): Promise<string> {
  await ensureFirebaseAuth();
  const {
    creatorId,
    creatorName,
    creatorAvatar = "",
    name,
    description = "",
    roomType = "group",
    avatarEmoji = "💼",
    avatarUrl = "",
    initialMemberIds = [],
    onlyAdminsCanPost = false,
    onlyAdminsCanEditInfo = true,
    isOfficial = false,
  } = params;

  const roomId = `room_${roomType}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const participants = Array.from(new Set([creatorId, ...initialMemberIds]));
  const participantNames: Record<string, string> = { [creatorId]: creatorName };
  const participantAvatars: Record<string, string> = { [creatorId]: creatorAvatar };

  const roomData: ChatConversation = {
    id: roomId,
    name: name.trim(),
    description: description.trim(),
    roomType,
    avatarEmoji,
    avatarUrl,
    creatorId,
    adminIds: [creatorId],
    isOfficial,
    participants,
    participantNames,
    participantAvatars,
    onlyAdminsCanPost,
    onlyAdminsCanEditInfo,
    lastMessageText: `Group created by ${creatorName}`,
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
    throw err;
  }

  return roomId;
}

/**
 * Subscribe to all conversations the user is a participant of
 */
export function subscribeToUserConversations(
  userId: string,
  onUpdate: (conversations: ChatConversation[]) => void,
  onError?: (error: any) => void
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
        const list: ChatConversation[] = [];
        snapshot.forEach((d) => {
          const data = d.data();
          list.push({
            id: d.id,
            name: data.name,
            description: data.description,
            roomType: (data.roomType as RoomType) || "group",
            avatarEmoji: data.avatarEmoji,
            avatarUrl: data.avatarUrl,
            creatorId: data.creatorId,
            adminIds: data.adminIds || [],
            isOfficial: !!data.isOfficial,
            participants: data.participants || [],
            participantNames: data.participantNames || {},
            participantAvatars: data.participantAvatars || {},
            onlyAdminsCanPost: !!data.onlyAdminsCanPost,
            onlyAdminsCanEditInfo: data.onlyAdminsCanEditInfo !== undefined ? data.onlyAdminsCanEditInfo : true,
            lastMessageText: data.lastMessageText || "",
            lastMessageTime: normalizeDate(data.lastMessageTime),
            lastMessageSenderId: data.lastMessageSenderId,
            lastMessageSenderName: data.lastMessageSenderName,
            supportTopic: data.supportTopic || "General",
            createdAt: normalizeDate(data.createdAt),
            updatedAt: normalizeDate(data.updatedAt),
          });
        });

        // Sort by most recent active message time
        list.sort((a, b) => {
          const tA = new Date(a.lastMessageTime || a.createdAt).getTime();
          const tB = new Date(b.lastMessageTime || b.createdAt).getTime();
          return tB - tA;
        });

        onUpdate(list);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, "chats");
        if (onError) onError(err);
      }
    );

    return unsubscribe;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, "chats");
    if (onError) onError(err);
    return () => {};
  }
}

/**
 * Toggle emoji reaction on a message
 */
export async function toggleReaction(
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
 * Soft delete a message for everyone
 */
export async function deleteMessageForEveryone(chatId: string, messageId: string): Promise<void> {
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
 * Mark messages in a conversation as read by a user
 */
export async function markMessagesAsRead(chatId: string, userId: string): Promise<void> {
  await ensureFirebaseAuth();
  try {
    const msgsQuery = query(
      collection(firestoreDb, "chats", chatId, "messages"),
      limit(25)
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
 * Set typing indicator status for a user
 */
export async function setTypingStatus(
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
  } catch {}
}

/**
 * Subscribe to typing indicators in a chat room
 */
export function subscribeToTypingStatus(
  chatId: string,
  currentUserId: string,
  onUpdate: (typingUsers: string[]) => void
): Unsubscribe {
  ensureFirebaseAuth();
  try {
    const typingCol = collection(firestoreDb, "chats", chatId, "typing");
    const unsubscribe = onSnapshot(
      typingCol,
      (snapshot) => {
        const users: string[] = [];
        snapshot.forEach((d) => {
          const data = d.data();
          if (data.isTyping && data.userId !== currentUserId && data.userName) {
            users.push(data.userName);
          }
        });
        onUpdate(users);
      },
      () => {
        onUpdate([]);
      }
    );
    return unsubscribe;
  } catch {
    return () => {};
  }
}

/**
 * Unified Chat Service Object
 */
export const chatService = {
  sendMessage,
  loadMessageHistory,
  subscribeToMessages,
  getOrCreateDirectConversation,
  createGroupConversation,
  subscribeToUserConversations,
  toggleReaction,
  deleteMessageForEveryone,
  markMessagesAsRead,
  setTypingStatus,
  subscribeToTypingStatus,
  getDirectConversationId,
};

export default chatService;
