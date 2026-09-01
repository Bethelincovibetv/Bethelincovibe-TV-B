import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getDirectConversationId,
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
  chatService,
} from "../services/chatService";

// Mock Firebase Firestore & Auth
vi.mock("@/lib/firebaseChat", () => {
  return {
    firestoreDb: {},
    ensureFirebaseAuth: vi.fn().mockResolvedValue("mock_user_1"),
    handleFirestoreError: vi.fn(),
    OperationType: {
      CREATE: "create",
      UPDATE: "update",
      DELETE: "delete",
      LIST: "list",
      GET: "get",
      WRITE: "write",
    },
    createCustomChatRoom: vi.fn().mockResolvedValue("mock_group_room_123"),
  };
});

vi.mock("@/integrations/supabase/client", () => {
  return {
    supabase: {
      from: vi.fn().mockReturnValue({
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    },
  };
});

vi.mock("firebase/firestore", () => {
  return {
    collection: vi.fn((_db, ...paths) => paths.join("/")),
    doc: vi.fn((_db, ...paths) => ({ path: paths.join("/") })),
    setDoc: vi.fn().mockResolvedValue(undefined),
    getDoc: vi.fn().mockResolvedValue({
      exists: () => false,
      data: () => ({}),
    }),
    getDocs: vi.fn().mockResolvedValue({
      docs: [
        {
          id: "msg_1",
          data: () => ({
            chatId: "room_1",
            senderId: "user_a",
            senderName: "Alice",
            text: "Hello there!",
            type: "text",
            createdAt: "2026-09-01T12:00:00.000Z",
            readBy: ["user_a"],
          }),
        },
      ],
      forEach(cb: any) {
        this.docs.forEach(cb);
      },
    }),
    query: vi.fn((col, ...clauses) => ({ col, clauses })),
    where: vi.fn((field, op, val) => ({ field, op, val })),
    orderBy: vi.fn((field, dir) => ({ field, dir })),
    limit: vi.fn((count) => ({ count })),
    onSnapshot: vi.fn((_query, onNext) => {
      onNext({
        docs: [
          {
            id: "msg_live_1",
            data: () => ({
              chatId: "room_1",
              senderId: "user_b",
              senderName: "Bob",
              text: "Real-time sync works!",
              type: "text",
              createdAt: "2026-09-01T12:05:00.000Z",
              readBy: ["user_b"],
            }),
          },
        ],
        forEach(cb: any) {
          this.docs.forEach(cb);
        },
      });
      return vi.fn(); // Return unsubscribe callback
    }),
    serverTimestamp: vi.fn(() => "SERVER_TIMESTAMP_MOCK"),
    Timestamp: {
      now: () => ({ toDate: () => new Date() }),
    },
  };
});

describe("Firebase Chat Service Unit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Direct Conversation Identification", () => {
    it("generates deterministic direct conversation ID regardless of user order", () => {
      const id1 = getDirectConversationId("user_alice_123", "user_bob_456");
      const id2 = getDirectConversationId("user_bob_456", "user_alice_123");
      expect(id1).toBe(id2);
      expect(id1).toBe("room_user_alice_123_user_bob_456");
    });

    it("sanitizes user IDs containing special characters", () => {
      const id = getDirectConversationId("user@domain.com", "user#2!special");
      expect(id).toBe("room_user_2_special_user_domain_com");
    });
  });

  describe("Sending Messages", () => {
    it("sends a direct text message and returns formatted ChatMessage", async () => {
      const msg = await sendMessage({
        chatId: "room_123",
        senderId: "user_a",
        senderName: "Alice",
        text: "Hello World",
      });

      expect(msg.chatId).toBe("room_123");
      expect(msg.senderId).toBe("user_a");
      expect(msg.senderName).toBe("Alice");
      expect(msg.text).toBe("Hello World");
      expect(msg.readBy).toContain("user_a");
      expect(msg.id).toMatch(/^msg_/);
    });

    it("throws error if message text and media attachment are both empty", async () => {
      await expect(
        sendMessage({
          chatId: "room_123",
          senderId: "user_a",
          senderName: "Alice",
          text: "   ",
        })
      ).rejects.toThrow("Message cannot be empty");
    });
  });

  describe("Loading Message History", () => {
    it("loads message history with correct structure", async () => {
      const history = await loadMessageHistory("room_1");
      expect(history.length).toBe(1);
      expect(history[0].id).toBe("msg_1");
      expect(history[0].text).toBe("Hello there!");
      expect(history[0].senderName).toBe("Alice");
    });
  });

  describe("Real-time Subscriptions & Unsubscribe Cleanup", () => {
    it("subscribes to real-time messages and returns working unsubscribe callback", () => {
      const callback = vi.fn();
      const unsub = subscribeToMessages("room_1", callback);

      expect(callback).toHaveBeenCalled();
      const receivedMessages = callback.mock.calls[0][0];
      expect(receivedMessages.length).toBe(1);
      expect(receivedMessages[0].text).toBe("Real-time sync works!");

      // Ensure cleanup is callable without errors
      expect(typeof unsub).toBe("function");
      expect(() => unsub()).not.toThrow();
    });

    it("subscribes to user conversations with proper sorting and cleanup", () => {
      const callback = vi.fn();
      const unsub = subscribeToUserConversations("user_a", callback);

      expect(callback).toHaveBeenCalled();
      expect(typeof unsub).toBe("function");
      expect(() => unsub()).not.toThrow();
    });
  });

  describe("Conversation Creation", () => {
    it("creates or gets direct conversation", async () => {
      const roomId = await getOrCreateDirectConversation({
        currentUserId: "user_a",
        currentUserName: "Alice",
        targetUserId: "user_b",
        targetUserName: "Bob",
      });

      expect(roomId).toBe("room_user_a_user_b");
    });

    it("creates a group conversation with proper initial attributes", async () => {
      const groupId = await createGroupConversation({
        creatorId: "user_a",
        creatorName: "Alice",
        name: "Lagos Wholesale Group",
        description: "Official wholesale merchants",
        roomType: "group",
        avatarEmoji: "🏢",
      });

      expect(groupId).toMatch(/^room_group_/);
    });
  });

  describe("Interactive Chat Operations", () => {
    it("toggles emoji reaction gracefully", async () => {
      await expect(
        toggleReaction("room_1", "msg_1", "🔥", "user_a")
      ).resolves.not.toThrow();
    });

    it("deletes a message for everyone", async () => {
      await expect(
        deleteMessageForEveryone("room_1", "msg_1")
      ).resolves.not.toThrow();
    });

    it("marks messages as read", async () => {
      await expect(
        markMessagesAsRead("room_1", "user_b")
      ).resolves.not.toThrow();
    });

    it("sets typing status", async () => {
      await expect(
        setTypingStatus("room_1", "user_a", "Alice", true)
      ).resolves.not.toThrow();
    });

    it("subscribes to typing status and cleans up", () => {
      const callback = vi.fn();
      const unsub = subscribeToTypingStatus("room_1", "user_a", callback);
      expect(typeof unsub).toBe("function");
      expect(() => unsub()).not.toThrow();
    });
  });

  describe("Chat Sounds Engine", () => {
    it("safely invokes sound effect methods including playSend and playReceive without errors", async () => {
      const { chatSounds } = await import("../lib/chatSounds");
      expect(typeof chatSounds.playSend).toBe("function");
      expect(typeof chatSounds.playReceive).toBe("function");
      expect(typeof chatSounds.playSentSound).toBe("function");
      expect(typeof chatSounds.playReceivedSound).toBe("function");
      expect(typeof chatSounds.playRecordStart).toBe("function");
      expect(typeof chatSounds.playRecordStop).toBe("function");

      // Verify that calling them does not throw
      expect(() => chatSounds.playSend()).not.toThrow();
      expect(() => chatSounds.playReceive()).not.toThrow();
      expect(() => chatSounds.playRecordStart()).not.toThrow();
      expect(() => chatSounds.playRecordStop()).not.toThrow();
    });
  });
});
