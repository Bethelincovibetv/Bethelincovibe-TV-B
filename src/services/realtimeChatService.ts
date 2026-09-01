import {
  collection,
  doc,
  setDoc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  increment,
  writeBatch,
  Unsubscribe,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, auth, storage, ensureFirebaseAuth, handleFirestoreError, OperationType } from '@/lib/firebase';
import { supabase } from '@/integrations/supabase/client';

export type ConversationType = 'group' | 'direct' | 'official' | 'announcement';
export type MessageType = 'text' | 'image' | 'voice_note' | 'video' | 'file' | 'system';
export type MemberRole = 'owner' | 'admin' | 'member';

export interface ReactionItem {
  count: number;
  users: string[];
  userNames?: string[];
}

export interface MessageReplyInfo {
  id: string;
  senderName: string;
  text: string;
  type?: MessageType;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  text: string;
  type: MessageType;
  mediaUrl?: string;
  mediaName?: string;
  mediaSize?: number;
  mediaDuration?: number; // In seconds for voice notes
  replyTo?: MessageReplyInfo;
  reactions?: Record<string, ReactionItem>;
  readBy?: Record<string, string>; // userId -> ISO timestamp
  isEdited?: boolean;
  isDeleted?: boolean;
  deletedBy?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Conversation {
  id: string;
  type: ConversationType;
  name: string;
  description?: string;
  avatarUrl?: string;
  bannerUrl?: string;
  category?: string;
  createdBy: string;
  creatorName?: string;
  participantIds: string[];
  adminIds: string[];
  isEncrypted?: boolean;
  isPublic?: boolean;
  onlyAdminsCanPost?: boolean;
  onlyAdminsCanEditInfo?: boolean;
  lastMessageText?: string;
  lastMessageTime?: string;
  lastSenderId?: string;
  lastSenderName?: string;
  memberCount?: number;
  unreadCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationMember {
  conversationId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  role: MemberRole;
  joinedAt: string;
  muted?: boolean;
  lastReadAt?: string;
}

export interface TypingStatus {
  conversationId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  isTyping: boolean;
  updatedAt: string;
}

const OFFICIAL_GROUPS = [
  {
    id: 'bethelincovibe_official_lounge',
    name: 'Bethelincovibe TV Official Community',
    description: 'The official Bethelincovibe TV community hub. Connect with creators, promoters, and business partners across Nigeria and worldwide.',
    category: 'Official',
    type: 'official' as ConversationType,
    avatarUrl: '/logo.png',
    isPublic: true,
    onlyAdminsCanPost: false,
    onlyAdminsCanEditInfo: true,
  },
  {
    id: 'promoters_status_marketers',
    name: 'Promoters & Status Marketers Network',
    description: 'Share promotion campaigns, WhatsApp status strategies, proof submissions, and payout discussions.',
    category: 'Promoters',
    type: 'group' as ConversationType,
    avatarUrl: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=200&auto=format&fit=crop&q=80',
    isPublic: true,
    onlyAdminsCanPost: false,
    onlyAdminsCanEditInfo: false,
  },
  {
    id: 'ecommerce_merchants_hub',
    name: 'E-Commerce & Digital Merchants Hub',
    description: 'Showcase trending products, flash deals, business partnerships, and merchant trade updates.',
    category: 'E-Commerce',
    type: 'group' as ConversationType,
    avatarUrl: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=200&auto=format&fit=crop&q=80',
    isPublic: true,
    onlyAdminsCanPost: false,
    onlyAdminsCanEditInfo: false,
  },
  {
    id: 'creators_video_producers',
    name: 'Video Creators & Viral Editors',
    description: 'AI video generation tips, Vixora studio workflows, creative hooks, and audio mastering tricks.',
    category: 'Creators',
    type: 'group' as ConversationType,
    avatarUrl: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=200&auto=format&fit=crop&q=80',
    isPublic: true,
    onlyAdminsCanPost: false,
    onlyAdminsCanEditInfo: false,
  },
  {
    id: 'bethelincovibe_announcements',
    name: 'Bethelincovibe TV Announcements',
    description: 'Official platform news, payout schedules, system updates, and major feature releases.',
    category: 'Announcements',
    type: 'announcement' as ConversationType,
    avatarUrl: '/logo.png',
    isPublic: true,
    onlyAdminsCanPost: true,
    onlyAdminsCanEditInfo: true,
  },
];

/**
 * Ensures official default communities exist in Firebase
 */
export async function seedOfficialCommunities(adminUserId = 'system_admin', adminName = 'Bethelincovibe TV'): Promise<void> {
  try {
    await ensureFirebaseAuth();
    for (const group of OFFICIAL_GROUPS) {
      const docRef = doc(db, 'conversations', group.id);
      const existing = await getDoc(docRef);
      if (!existing.exists()) {
        const now = new Date().toISOString();
        const initialData: Partial<Conversation> = {
          id: group.id,
          name: group.name,
          description: group.description,
          category: group.category,
          type: group.type,
          avatarUrl: group.avatarUrl,
          createdBy: adminUserId,
          creatorName: adminName,
          participantIds: [adminUserId],
          adminIds: [adminUserId],
          isPublic: group.isPublic,
          onlyAdminsCanPost: group.onlyAdminsCanPost,
          onlyAdminsCanEditInfo: group.onlyAdminsCanEditInfo,
          lastMessageText: `Welcome to the ${group.name}!`,
          lastMessageTime: now,
          lastSenderId: adminUserId,
          lastSenderName: adminName,
          memberCount: 1,
          createdAt: now,
          updatedAt: now,
        };
        await setDoc(docRef, initialData, { merge: true });

        // Add welcome message
        const welcomeMsgRef = doc(collection(db, 'conversations', group.id, 'messages'));
        await setDoc(welcomeMsgRef, {
          id: welcomeMsgRef.id,
          conversationId: group.id,
          senderId: adminUserId,
          senderName: adminName,
          senderAvatar: group.avatarUrl,
          text: `👋 Welcome to ${group.name}! Connect, share insights, and collaborate with the community.`,
          type: 'system',
          createdAt: now,
        });
      }
    }
  } catch (err) {
    console.warn('seedOfficialCommunities error (ignorable if offline):', err);
  }
}

/**
 * Real-time listener for user's conversations (Direct chats + Joined Groups + Public Official Groups)
 */
export function subscribeToConversations(
  userId: string | null,
  isPlatformAdmin: boolean,
  callback: (conversations: Conversation[]) => void
): Unsubscribe {
  // Query conversations
  const convCollection = collection(db, 'conversations');
  const q = query(convCollection, orderBy('updatedAt', 'desc'), limit(50));

  return onSnapshot(
    q,
    (snapshot) => {
      const list: Conversation[] = [];
      snapshot.forEach((d) => {
        const data = d.data() as Conversation;
        const conv: Conversation = {
          ...data,
          id: d.id,
          participantIds: Array.isArray(data.participantIds) ? data.participantIds : [],
          adminIds: Array.isArray(data.adminIds) ? data.adminIds : [],
          memberCount: data.memberCount ?? (data.participantIds?.length || 0),
        };

        // Filter: Show if isPublic == true OR user is a participant OR user is platform admin
        if (conv.isPublic || (userId && conv.participantIds.includes(userId)) || isPlatformAdmin) {
          list.push(conv);
        }
      });
      callback(list);
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, 'conversations');
      callback([]);
    }
  );
}

/**
 * Real-time listener for messages in a conversation
 */
export function subscribeToMessages(
  conversationId: string,
  callback: (messages: ChatMessage[]) => void
): Unsubscribe {
  const msgCollection = collection(db, 'conversations', conversationId, 'messages');
  const q = query(msgCollection, orderBy('createdAt', 'asc'), limit(150));

  return onSnapshot(
    q,
    (snapshot) => {
      const messages: ChatMessage[] = [];
      snapshot.forEach((d) => {
        const data = d.data() as ChatMessage;
        messages.push({
          ...data,
          id: d.id,
          conversationId,
        });
      });
      callback(messages);
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, `conversations/${conversationId}/messages`);
      callback([]);
    }
  );
}

/**
 * Real-time listener for active typing users in a conversation
 */
export function subscribeToTyping(
  conversationId: string,
  currentUserId: string | null,
  callback: (typingUsers: TypingStatus[]) => void
): Unsubscribe {
  const typingCollection = collection(db, 'conversations', conversationId, 'typing');
  return onSnapshot(
    typingCollection,
    (snapshot) => {
      const activeTypers: TypingStatus[] = [];
      const now = Date.now();
      snapshot.forEach((d) => {
        const data = d.data() as TypingStatus;
        if (data.isTyping && data.userId !== currentUserId) {
          // If updated within the last 8 seconds, consider actively typing
          const timeDiff = now - new Date(data.updatedAt).getTime();
          if (timeDiff < 8000) {
            activeTypers.push(data);
          }
        }
      });
      callback(activeTypers);
    },
    () => callback([])
  );
}

/**
 * Set user typing indicator state
 */
let typingTimer: any = null;
export async function setTypingStatus(
  conversationId: string,
  user: { id: string; name: string; avatar?: string },
  isTyping: boolean
): Promise<void> {
  if (!user.id || !conversationId) return;
  try {
    await ensureFirebaseAuth({ displayName: user.name, photoURL: user.avatar });
    const docRef = doc(db, 'conversations', conversationId, 'typing', user.id);
    const now = new Date().toISOString();

    if (isTyping) {
      await setDoc(docRef, {
        conversationId,
        userId: user.id,
        userName: user.name,
        userAvatar: user.avatar || '',
        isTyping: true,
        updatedAt: now,
      });

      if (typingTimer) clearTimeout(typingTimer);
      typingTimer = setTimeout(async () => {
        try {
          await setDoc(docRef, { isTyping: false, updatedAt: new Date().toISOString() }, { merge: true });
        } catch {}
      }, 4500);
    } else {
      if (typingTimer) clearTimeout(typingTimer);
      await setDoc(docRef, { isTyping: false, updatedAt: now }, { merge: true });
    }
  } catch (err) {
    // Non-blocking for typing indicator
  }
}

/**
 * Send a message to a conversation
 */
export async function sendMessage(
  conversationId: string,
  payload: {
    senderId: string;
    senderName: string;
    senderAvatar?: string;
    text: string;
    type?: MessageType;
    mediaUrl?: string;
    mediaName?: string;
    mediaSize?: number;
    mediaDuration?: number;
    replyTo?: MessageReplyInfo;
  }
): Promise<ChatMessage> {
  await ensureFirebaseAuth({ displayName: payload.senderName, photoURL: payload.senderAvatar });

  const now = new Date().toISOString();
  const msgCollection = collection(db, 'conversations', conversationId, 'messages');
  const newMsgRef = doc(msgCollection);

  const messageData: ChatMessage = {
    id: newMsgRef.id,
    conversationId,
    senderId: payload.senderId,
    senderName: payload.senderName,
    senderAvatar: payload.senderAvatar || '',
    text: payload.text.trim(),
    type: payload.type || 'text',
    mediaUrl: payload.mediaUrl || '',
    mediaName: payload.mediaName || '',
    mediaSize: payload.mediaSize || 0,
    mediaDuration: payload.mediaDuration || 0,
    replyTo: payload.replyTo || undefined,
    reactions: {},
    readBy: { [payload.senderId]: now },
    isEdited: false,
    isDeleted: false,
    createdAt: now,
    updatedAt: now,
  };

  try {
    await setDoc(newMsgRef, messageData);

    // Update parent conversation
    const convRef = doc(db, 'conversations', conversationId);
    const snippet =
      messageData.type === 'voice_note'
        ? '🎤 Voice note'
        : messageData.type === 'image'
        ? '📷 Photo'
        : messageData.type === 'video'
        ? '🎥 Video'
        : messageData.type === 'file'
        ? `📎 ${messageData.mediaName || 'File'}`
        : messageData.text.slice(0, 80);

    await updateDoc(convRef, {
      lastMessageText: snippet,
      lastMessageTime: now,
      lastSenderId: payload.senderId,
      lastSenderName: payload.senderName,
      participantIds: arrayUnion(payload.senderId),
      updatedAt: now,
    }).catch(async () => {
      // Fallback if doc needs merge
      await setDoc(
        convRef,
        {
          lastMessageText: snippet,
          lastMessageTime: now,
          lastSenderId: payload.senderId,
          lastSenderName: payload.senderName,
          updatedAt: now,
        },
        { merge: true }
      );
    });

    // Reset typing status
    setTypingStatus(conversationId, { id: payload.senderId, name: payload.senderName }, false).catch(() => {});

    return messageData;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `conversations/${conversationId}/messages/${newMsgRef.id}`);
    throw err;
  }
}

/**
 * Deterministic conversation ID for 1-on-1 direct messaging
 */
export function getDirectConversationId(userA: string, userB: string): string {
  const sorted = [userA, userB].sort();
  return `dm_${sorted[0]}_${sorted[1]}`;
}

/**
 * Get or create 1-on-1 private direct conversation
 */
export async function getOrCreateDirectConversation(
  currentUser: { id: string; name: string; avatar?: string },
  targetUser: { id: string; name: string; avatar?: string }
): Promise<Conversation> {
  await ensureFirebaseAuth({ displayName: currentUser.name, photoURL: currentUser.avatar });
  const convId = getDirectConversationId(currentUser.id, targetUser.id);
  const convRef = doc(db, 'conversations', convId);

  const existing = await getDoc(convRef);
  const now = new Date().toISOString();

  if (existing.exists()) {
    const data = existing.data() as Conversation;
    return { ...data, id: convId };
  }

  const newConv: Conversation = {
    id: convId,
    type: 'direct',
    name: targetUser.name,
    avatarUrl: targetUser.avatar || '',
    createdBy: currentUser.id,
    creatorName: currentUser.name,
    participantIds: [currentUser.id, targetUser.id],
    adminIds: [currentUser.id, targetUser.id],
    isEncrypted: true,
    isPublic: false,
    onlyAdminsCanPost: false,
    onlyAdminsCanEditInfo: false,
    memberCount: 2,
    createdAt: now,
    updatedAt: now,
  };

  try {
    await setDoc(convRef, newConv);
    return newConv;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `conversations/${convId}`);
    throw err;
  }
}

/**
 * Create a new WhatsApp-style Community Group
 */
export async function createCommunityGroup(
  params: {
    name: string;
    description?: string;
    category?: string;
    avatarUrl?: string;
    isPublic?: boolean;
    onlyAdminsCanPost?: boolean;
    onlyAdminsCanEditInfo?: boolean;
    initialMemberIds?: string[];
  },
  creator: { id: string; name: string; avatar?: string },
  isPlatformAdmin = false
): Promise<Conversation> {
  await ensureFirebaseAuth({ displayName: creator.name, photoURL: creator.avatar });
  const convCollection = collection(db, 'conversations');
  const newRef = doc(convCollection);
  const now = new Date().toISOString();

  const participants = Array.from(new Set([creator.id, ...(params.initialMemberIds || [])]));

  const newGroup: Conversation = {
    id: newRef.id,
    type: 'group',
    name: params.name.trim(),
    description: params.description?.trim() || '',
    category: params.category || 'General',
    avatarUrl: params.avatarUrl || 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=200&auto=format&fit=crop&q=80',
    createdBy: creator.id,
    creatorName: creator.name,
    participantIds: participants,
    adminIds: [creator.id],
    isEncrypted: false,
    isPublic: params.isPublic ?? true,
    onlyAdminsCanPost: params.onlyAdminsCanPost ?? false,
    onlyAdminsCanEditInfo: params.onlyAdminsCanEditInfo ?? true,
    memberCount: participants.length,
    lastMessageText: `Group created by ${creator.name}`,
    lastMessageTime: now,
    lastSenderId: creator.id,
    lastSenderName: creator.name,
    createdAt: now,
    updatedAt: now,
  };

  try {
    await setDoc(newRef, newGroup);

    // Initial system announcement
    const msgRef = doc(collection(db, 'conversations', newRef.id, 'messages'));
    await setDoc(msgRef, {
      id: msgRef.id,
      conversationId: newRef.id,
      senderId: creator.id,
      senderName: creator.name,
      senderAvatar: creator.avatar || '',
      text: `🎉 Welcome to ${newGroup.name}! ${newGroup.description ? `\n\n📌 Group Rules & Info: ${newGroup.description}` : ''}`,
      type: 'system',
      createdAt: now,
    });

    return newGroup;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `conversations/${newRef.id}`);
    throw err;
  }
}

/**
 * Update Group Settings (Group Admins or Platform Admins only)
 */
export async function updateGroupSettings(
  conversationId: string,
  updates: {
    name?: string;
    description?: string;
    avatarUrl?: string;
    category?: string;
    onlyAdminsCanPost?: boolean;
    onlyAdminsCanEditInfo?: boolean;
    isPublic?: boolean;
  },
  userId: string,
  isPlatformAdmin = false
): Promise<void> {
  await ensureFirebaseAuth();
  const convRef = doc(db, 'conversations', conversationId);
  const snap = await getDoc(convRef);
  if (!snap.exists()) throw new Error('Group conversation not found');

  const data = snap.data() as Conversation;
  const isGroupAdmin = data.adminIds?.includes(userId) || data.createdBy === userId;

  if (!isPlatformAdmin && !isGroupAdmin) {
    throw new Error('Only Group Administrators or Platform Admins can update group settings.');
  }

  const now = new Date().toISOString();
  const cleanUpdates: any = { ...updates, updatedAt: now };

  try {
    await updateDoc(convRef, cleanUpdates);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `conversations/${conversationId}`);
    throw err;
  }
}

/**
 * Join a public community group
 */
export async function joinGroup(
  conversationId: string,
  user: { id: string; name: string; avatar?: string }
): Promise<void> {
  await ensureFirebaseAuth({ displayName: user.name, photoURL: user.avatar });
  const convRef = doc(db, 'conversations', conversationId);
  const now = new Date().toISOString();

  try {
    await updateDoc(convRef, {
      participantIds: arrayUnion(user.id),
      memberCount: increment(1),
      updatedAt: now,
    });

    // Create member doc
    const memberRef = doc(db, 'conversations', conversationId, 'members', user.id);
    await setDoc(
      memberRef,
      {
        conversationId,
        userId: user.id,
        userName: user.name,
        userAvatar: user.avatar || '',
        role: 'member',
        joinedAt: now,
      },
      { merge: true }
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `conversations/${conversationId}`);
    throw err;
  }
}

/**
 * Leave a group
 */
export async function leaveGroup(conversationId: string, userId: string): Promise<void> {
  await ensureFirebaseAuth();
  const convRef = doc(db, 'conversations', conversationId);
  const now = new Date().toISOString();

  try {
    await updateDoc(convRef, {
      participantIds: arrayRemove(userId),
      adminIds: arrayRemove(userId),
      memberCount: increment(-1),
      updatedAt: now,
    });

    const memberRef = doc(db, 'conversations', conversationId, 'members', userId);
    await deleteDoc(memberRef).catch(() => {});
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `conversations/${conversationId}`);
    throw err;
  }
}

/**
 * Add member to group by Group Admin or Platform Admin
 */
export async function addMemberToGroup(
  conversationId: string,
  newMember: { id: string; name: string; avatar?: string },
  currentUserId: string,
  isPlatformAdmin = false
): Promise<void> {
  await ensureFirebaseAuth();
  const convRef = doc(db, 'conversations', conversationId);
  const snap = await getDoc(convRef);
  if (!snap.exists()) throw new Error('Conversation not found');

  const data = snap.data() as Conversation;
  const isGroupAdmin = data.adminIds?.includes(currentUserId) || data.createdBy === currentUserId;

  if (!isPlatformAdmin && !isGroupAdmin) {
    throw new Error('Only Group Administrators can add new members.');
  }

  const now = new Date().toISOString();
  await updateDoc(convRef, {
    participantIds: arrayUnion(newMember.id),
    memberCount: increment(1),
    updatedAt: now,
  });

  const memberRef = doc(db, 'conversations', conversationId, 'members', newMember.id);
  await setDoc(
    memberRef,
    {
      conversationId,
      userId: newMember.id,
      userName: newMember.name,
      userAvatar: newMember.avatar || '',
      role: 'member',
      joinedAt: now,
    },
    { merge: true }
  );
}

/**
 * Remove member from group by Group Admin or Platform Admin
 */
export async function removeMemberFromGroup(
  conversationId: string,
  targetUserId: string,
  currentUserId: string,
  isPlatformAdmin = false
): Promise<void> {
  await ensureFirebaseAuth();
  const convRef = doc(db, 'conversations', conversationId);
  const snap = await getDoc(convRef);
  if (!snap.exists()) throw new Error('Conversation not found');

  const data = snap.data() as Conversation;
  const isGroupAdmin = data.adminIds?.includes(currentUserId) || data.createdBy === currentUserId;

  if (!isPlatformAdmin && !isGroupAdmin) {
    throw new Error('Only Group Administrators can remove members.');
  }

  const now = new Date().toISOString();
  await updateDoc(convRef, {
    participantIds: arrayRemove(targetUserId),
    adminIds: arrayRemove(targetUserId),
    memberCount: increment(-1),
    updatedAt: now,
  });

  const memberRef = doc(db, 'conversations', conversationId, 'members', targetUserId);
  await deleteDoc(memberRef).catch(() => {});
}

/**
 * Promote member to Group Admin
 */
export async function promoteToGroupAdmin(
  conversationId: string,
  targetUserId: string,
  currentUserId: string,
  isPlatformAdmin = false
): Promise<void> {
  await ensureFirebaseAuth();
  const convRef = doc(db, 'conversations', conversationId);
  const snap = await getDoc(convRef);
  if (!snap.exists()) throw new Error('Conversation not found');

  const data = snap.data() as Conversation;
  const isGroupAdmin = data.adminIds?.includes(currentUserId) || data.createdBy === currentUserId;

  if (!isPlatformAdmin && !isGroupAdmin) {
    throw new Error('Only Group Administrators can appoint new Group Admins.');
  }

  const now = new Date().toISOString();
  await updateDoc(convRef, {
    adminIds: arrayUnion(targetUserId),
    updatedAt: now,
  });

  const memberRef = doc(db, 'conversations', conversationId, 'members', targetUserId);
  await setDoc(memberRef, { role: 'admin', updatedAt: now }, { merge: true });
}

/**
 * Demote member from Group Admin
 */
export async function demoteFromGroupAdmin(
  conversationId: string,
  targetUserId: string,
  currentUserId: string,
  isPlatformAdmin = false
): Promise<void> {
  await ensureFirebaseAuth();
  const convRef = doc(db, 'conversations', conversationId);
  const snap = await getDoc(convRef);
  if (!snap.exists()) throw new Error('Conversation not found');

  const data = snap.data() as Conversation;
  const isGroupAdmin = data.adminIds?.includes(currentUserId) || data.createdBy === currentUserId;

  if (!isPlatformAdmin && !isGroupAdmin) {
    throw new Error('Only Group Administrators can modify admin privileges.');
  }

  const now = new Date().toISOString();
  await updateDoc(convRef, {
    adminIds: arrayRemove(targetUserId),
    updatedAt: now,
  });

  const memberRef = doc(db, 'conversations', conversationId, 'members', targetUserId);
  await setDoc(memberRef, { role: 'member', updatedAt: now }, { merge: true });
}

/**
 * Delete whole group (Platform Admin or Group Creator only)
 */
export async function deleteGroup(conversationId: string, currentUserId: string, isPlatformAdmin = false): Promise<void> {
  await ensureFirebaseAuth();
  const convRef = doc(db, 'conversations', conversationId);
  const snap = await getDoc(convRef);
  if (!snap.exists()) return;

  const data = snap.data() as Conversation;
  if (!isPlatformAdmin && data.createdBy !== currentUserId) {
    throw new Error('Only the Group Creator or Platform Admin can delete this group.');
  }

  await deleteDoc(convRef);
}

/**
 * Toggle emoji reaction on message
 */
export async function toggleReaction(
  conversationId: string,
  messageId: string,
  emoji: string,
  userId: string,
  userName: string
): Promise<void> {
  await ensureFirebaseAuth({ displayName: userName });
  const msgRef = doc(db, 'conversations', conversationId, 'messages', messageId);
  const snap = await getDoc(msgRef);
  if (!snap.exists()) return;

  const data = snap.data() as ChatMessage;
  const currentReactions: Record<string, ReactionItem> = { ...(data.reactions || {}) };
  const existing = currentReactions[emoji] || { count: 0, users: [], userNames: [] };

  const hasReacted = existing.users.includes(userId);
  let updatedUsers = hasReacted ? existing.users.filter((u) => u !== userId) : [...existing.users, userId];
  let updatedUserNames = hasReacted
    ? (existing.userNames || []).filter((n) => n !== userName)
    : [...(existing.userNames || []), userName];

  if (updatedUsers.length === 0) {
    delete currentReactions[emoji];
  } else {
    currentReactions[emoji] = {
      count: updatedUsers.length,
      users: updatedUsers,
      userNames: updatedUserNames,
    };
  }

  try {
    await updateDoc(msgRef, {
      reactions: currentReactions,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `conversations/${conversationId}/messages/${messageId}`);
  }
}

/**
 * Edit message text
 */
export async function editMessage(
  conversationId: string,
  messageId: string,
  newText: string,
  userId: string
): Promise<void> {
  await ensureFirebaseAuth();
  const msgRef = doc(db, 'conversations', conversationId, 'messages', messageId);
  const snap = await getDoc(msgRef);
  if (!snap.exists()) throw new Error('Message not found');

  const data = snap.data() as ChatMessage;
  if (data.senderId !== userId) {
    throw new Error('You can only edit your own messages.');
  }

  await updateDoc(msgRef, {
    text: newText.trim(),
    isEdited: true,
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Soft delete or remove message
 */
export async function deleteMessage(
  conversationId: string,
  messageId: string,
  userId: string,
  isGroupOrPlatformAdmin = false
): Promise<void> {
  await ensureFirebaseAuth();
  const msgRef = doc(db, 'conversations', conversationId, 'messages', messageId);
  const snap = await getDoc(msgRef);
  if (!snap.exists()) return;

  const data = snap.data() as ChatMessage;
  if (data.senderId !== userId && !isGroupOrPlatformAdmin) {
    throw new Error('Unauthorized to delete this message.');
  }

  await updateDoc(msgRef, {
    isDeleted: true,
    deletedBy: userId,
    text: '🚫 This message was deleted.',
    mediaUrl: '',
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Upload chat media attachment (image, voice note audio, video, document)
 */
export async function uploadChatMedia(
  file: File | Blob,
  conversationId: string,
  userId: string,
  fileExtension?: string
): Promise<{ url: string; name: string; size: number }> {
  await ensureFirebaseAuth();
  const ext = fileExtension || (file instanceof File ? file.name.split('.').pop() : 'dat') || 'dat';
  const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
  const path = `chat_uploads/${conversationId}/${userId}/${fileName}`;

  try {
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    const downloadUrl = await getDownloadURL(storageRef);
    return {
      url: downloadUrl,
      name: file instanceof File ? file.name : fileName,
      size: file.size,
    };
  } catch (storageErr) {
    console.warn('Firebase storage upload fallback to Supabase:', storageErr);
    // Graceful Supabase storage fallback if Firebase Storage rules block
    try {
      const { data, error } = await supabase.storage
        .from('community_media')
        .upload(`${conversationId}/${fileName}`, file, { upsert: true });

      if (!error && data) {
        const { data: publicUrlData } = supabase.storage.from('community_media').getPublicUrl(data.path);
        return {
          url: publicUrlData.publicUrl,
          name: file instanceof File ? file.name : fileName,
          size: file.size,
        };
      }
    } catch {}

    // Fallback: If blob, convert to base64 Data URL for small media/voice notes
    if (file.size < 3 * 1024 * 1024) {
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      return {
        url: base64,
        name: file instanceof File ? file.name : fileName,
        size: file.size,
      };
    }
    throw storageErr;
  }
}
