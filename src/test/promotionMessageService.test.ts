import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  verifyOrderAccess,
  getOrderMessages,
  sendOrderMessage,
  createSystemEventMessage,
  validateAttachment,
  calculateOrderSlaStatus,
  getLocalOrderMessages,
  saveLocalOrderMessages,
  markOrderMessagesAsRead,
  MessageAttachment,
} from "../services/promotionMessageService";
import { PromotionOrder, saveLocalOrders } from "../services/promotionOrderService";

// Mock Supabase client
vi.mock("@/integrations/supabase/client", () => {
  return {
    supabase: {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      })),
      channel: vi.fn(() => ({
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
      })),
      removeChannel: vi.fn(),
    },
  };
});

describe("Step 12: In-Order Contextual Collaboration, Creative Asset Exchange & Delivery SLA Monitoring", () => {
  const sampleOrder: PromotionOrder = {
    id: "ord-test-123",
    order_reference: "BTV-ORD-12345",
    business_user_id: "biz-user-1",
    promoter_id: "promoter-user-2",
    package_id: "pkg-1",
    community_id: "comm-1",
    amount: 25000,
    platform_fee: 2500,
    promoter_net_earning: 22500,
    status: "in_progress",
    promotion_brief: "Promote our weekend flash sale with our banner.",
    created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
    updated_at: new Date().toISOString(),
    paid_at: new Date(Date.now() - 3600000 * 4).toISOString(),
    promoter_accepted_at: new Date(Date.now() - 3600000 * 3).toISOString(),
    sla_deadline: new Date(Date.now() + 3600000 * 21).toISOString(),
    package: {
      id: "pkg-1",
      promoter_id: "promoter-user-2",
      title: "Standard Broadcast",
      price: 25000,
      turnaround_hours: 24,
      status: "active",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    saveLocalOrders([sampleOrder]);
    saveLocalOrderMessages(sampleOrder.id, []);
  });

  describe("1. Order Access & Authorization Verification", () => {
    it("should allow ordering business user to access order thread", async () => {
      const result = await verifyOrderAccess(sampleOrder.id, "biz-user-1", "business");
      expect(result.authorized).toBe(true);
      expect(result.role).toBe("business");
    });

    it("should allow assigned promoter to access order thread", async () => {
      const result = await verifyOrderAccess(sampleOrder.id, "promoter-user-2", "promoter");
      expect(result.authorized).toBe(true);
      expect(result.role).toBe("promoter");
    });

    it("should allow platform administrator to access order thread for auditing", async () => {
      const result = await verifyOrderAccess(sampleOrder.id, "admin-user-99", "admin");
      expect(result.authorized).toBe(true);
      expect(result.role).toBe("admin");
    });

    it("should deny access if user is not a participant or admin", async () => {
      const result = await verifyOrderAccess(sampleOrder.id, "random-user-404", "business");
      expect(result.authorized).toBe(false);
      expect(result.error).toMatch(/Unauthorized|Forbidden/);
    });

    it("should deny access if order does not exist", async () => {
      const result = await verifyOrderAccess("non-existent-order", "biz-user-1");
      expect(result.authorized).toBe(false);
      expect(result.error).toBeTruthy();
    });
  });

  describe("2. Creative Asset & Attachment Security Validation", () => {
    it("should validate and allow allowed image types (PNG, JPG, WEBP)", () => {
      const pngAttachment = {
        name: "banner_design.png",
        url: "https://example.com/assets/banner_design.png",
        mime_type: "image/png",
        size: 1024 * 1024 * 2, // 2MB
      };
      const result = validateAttachment(pngAttachment);
      expect(result.valid).toBe(true);
      expect(result.fileType).toBe("image");
    });

    it("should validate and allow PDF documents", () => {
      const pdfAttachment = {
        name: "campaign_brief.pdf",
        url: "https://example.com/assets/campaign_brief.pdf",
        mime_type: "application/pdf",
        size: 1024 * 1024 * 5, // 5MB
      };
      const result = validateAttachment(pdfAttachment);
      expect(result.valid).toBe(true);
      expect(result.fileType).toBe("document");
    });

    it("should reject attachments exceeding 15MB file size limit", () => {
      const oversizeAttachment = {
        name: "large_raw_video.mp4",
        url: "https://example.com/assets/large_raw_video.mp4",
        mime_type: "video/mp4",
        size: 1024 * 1024 * 20, // 20MB
      };
      const result = validateAttachment(oversizeAttachment);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("exceeds the maximum allowable limit of 15MB");
    });

    it("should reject malicious or executable file extensions", () => {
      const badExtensions = [
        "script.exe",
        "payload.bat",
        "install.sh",
        "exploit.php",
        "virus.js",
        "macro.vbs",
      ];

      badExtensions.forEach((fileName) => {
        const file = {
          name: fileName,
          url: `https://example.com/assets/${fileName}`,
          mime_type: "application/octet-stream",
          size: 5000,
        };
        const result = validateAttachment(file);
        expect(result.valid).toBe(false);
        expect(result.error).toContain("Executable file format");
      });
    });

    it("should reject files with invalid url format", () => {
      const invalidUrl = {
        name: "data.png",
        url: "ftp://unsafe-server/data.png",
        mime_type: "image/png",
        size: 2000,
      };
      const result = validateAttachment(invalidUrl);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Invalid file URL format");
    });
  });

  describe("3. SLA Countdown & State Derivation Engine", () => {
    it("should return correct SLA when order is in_progress", () => {
      const inProgressOrder: PromotionOrder = {
        ...sampleOrder,
        status: "in_progress",
        sla_deadline: new Date(Date.now() + 3600000 * 20).toISOString(),
      };

      const sla = calculateOrderSlaStatus(inProgressOrder);
      expect(sla.slaType).toBe("execution");
      expect(sla.timeRemainingMs).toBeGreaterThan(0);
      expect(sla.isOverdue).toBe(false);
      expect(sla.title).toContain("Promoter Execution Window");
    });

    it("should return correct 72h review SLA when evidence is submitted", () => {
      const evidenceOrder: PromotionOrder = {
        ...sampleOrder,
        status: "evidence_submitted",
        evidence_submitted_at: new Date(Date.now() - 3600000 * 10).toISOString(),
      };

      const sla = calculateOrderSlaStatus(evidenceOrder);
      expect(sla.slaType).toBe("review");
      expect(sla.title).toContain("72h Business Review Window");
      expect(sla.timeRemainingMs).toBeGreaterThan(0);
      expect(sla.isOverdue).toBe(false);
    });

    it("should mark SLA as overdue if execution deadline passed", () => {
      const overdueOrder: PromotionOrder = {
        ...sampleOrder,
        status: "in_progress",
        sla_deadline: new Date(Date.now() - 3600000 * 5).toISOString(), // 5 hours overdue
      };

      const sla = calculateOrderSlaStatus(overdueOrder);
      expect(sla.slaType).toBe("execution");
      expect(sla.isOverdue).toBe(true);
      expect(sla.timeRemainingMs).toBe(0);
      expect(sla.badgeColor).toBe("rose");
    });

    it("should reflect arbitration status when disputed", () => {
      const disputedOrder: PromotionOrder = {
        ...sampleOrder,
        status: "disputed",
        dispute_reason: "Promoter posted incorrect text caption",
      };

      const sla = calculateOrderSlaStatus(disputedOrder);
      expect(sla.slaType).toBe("disputed");
      expect(sla.title).toContain("Arbitration Underway");
      expect(sla.badgeColor).toBe("rose");
    });

    it("should mark SLA as completed when order is settled or approved", () => {
      const completedOrder: PromotionOrder = {
        ...sampleOrder,
        status: "completed",
        completed_at: new Date().toISOString(),
      };

      const sla = calculateOrderSlaStatus(completedOrder);
      expect(sla.slaType).toBe("completed");
      expect(sla.title).toContain("Execution & Escrow Settled");
      expect(sla.progressPercent).toBe(100);
      expect(sla.badgeColor).toBe("emerald");
    });
  });

  describe("4. In-Order Contextual Collaboration Messaging", () => {
    it("should reject message if user is unauthorized", async () => {
      const result = await sendOrderMessage({
        orderId: sampleOrder.id,
        currentUserId: "hacker-user-999",
        userRole: "business",
        senderName: "Imposter",
        messageType: "text",
        content: "Hello unauthorized world",
      });

      expect(result.error).toMatch(/Unauthorized|Forbidden/);
      expect(result.message).toBeNull();
    });

    it("should reject message with empty content and no attachments", async () => {
      const result = await sendOrderMessage({
        orderId: sampleOrder.id,
        currentUserId: "biz-user-1",
        userRole: "business",
        senderName: "Client Co",
        messageType: "text",
        content: "   ",
      });

      expect(result.error).toContain("Message cannot be empty");
      expect(result.message).toBeNull();
    });

    it("should send message successfully between order participants", async () => {
      const result = await sendOrderMessage({
        orderId: sampleOrder.id,
        currentUserId: "biz-user-1",
        userRole: "business",
        senderName: "Brand Representative",
        messageType: "text",
        content: "Hi, please make sure to include our discount promo code BETHELIN10!",
      });

      expect(result.error).toBeNull();
      expect(result.message).not.toBeNull();
      expect(result.message?.order_id).toBe(sampleOrder.id);
      expect(result.message?.sender_id).toBe("biz-user-1");
      expect(result.message?.sender_role).toBe("business");
      expect(result.message?.message_content).toContain("BETHELIN10");

      // Verify message is retrieved in order thread
      const messagesRes = await getOrderMessages(sampleOrder.id, "promoter-user-2", "promoter");
      expect(messagesRes.error).toBeNull();
      expect(messagesRes.messages.length).toBe(1);
      expect(messagesRes.messages[0].message_content).toContain("BETHELIN10");
    });

    it("should validate and persist creative asset attachments", async () => {
      const attachment: MessageAttachment = {
        name: "product_flyer.jpg",
        url: "https://example.com/flyer.jpg",
        mime_type: "image/jpeg",
        size: 1024 * 500, // 500KB
        file_type: "image",
      };

      const result = await sendOrderMessage({
        orderId: sampleOrder.id,
        currentUserId: "biz-user-1",
        userRole: "business",
        senderName: "Brand Representative",
        messageType: "creative_attachment",
        content: "Here is the official flyer image for the broadcast.",
        attachments: [attachment],
      });

      expect(result.error).toBeNull();
      expect(result.message?.attachments?.length).toBe(1);
      expect(result.message?.attachments?.[0].name).toBe("product_flyer.jpg");
    });

    it("should reject message containing invalid attachment", async () => {
      const badAttachment: MessageAttachment = {
        name: "dangerous_script.sh",
        url: "https://example.com/dangerous_script.sh",
        mime_type: "application/x-sh",
        size: 1024,
        file_type: "other",
      };

      const result = await sendOrderMessage({
        orderId: sampleOrder.id,
        currentUserId: "biz-user-1",
        userRole: "business",
        senderName: "Brand Rep",
        messageType: "creative_attachment",
        content: "Check this script",
        attachments: [badAttachment],
      });

      expect(result.error).toContain("Executable file format");
      expect(result.message).toBeNull();
    });

    it("should record system automated event messages", async () => {
      const systemResult = await createSystemEventMessage({
        orderId: sampleOrder.id,
        eventType: "order_accepted",
        content: "Order accepted by promoter. Execution SLA countdown initialized.",
        metadata: { event: "order_accepted", timestamp: new Date().toISOString() },
      });

      expect(systemResult.message).not.toBeNull();
      expect(systemResult.message?.message_type).toBe("system_event");
      expect(systemResult.message?.sender_role).toBe("system");

      const thread = await getOrderMessages(sampleOrder.id, "admin-user-1", "admin");
      expect(thread.messages.some((m) => m.message_type === "system_event")).toBe(true);
    });

    it("should support marking messages as read", async () => {
      // Send a message as business
      await sendOrderMessage({
        orderId: sampleOrder.id,
        currentUserId: "biz-user-1",
        userRole: "business",
        content: "Please check this timing",
      });

      // Mark as read by promoter
      const readRes = await markOrderMessagesAsRead(sampleOrder.id, "promoter-user-2");
      expect(readRes.success).toBe(true);

      const msgs = getLocalOrderMessages(sampleOrder.id);
      expect(msgs[0].read_by).toContain("promoter-user-2");
    });

    it("should prevent cross-order access to messages", async () => {
      // Create message for order 1
      await sendOrderMessage({
        orderId: sampleOrder.id,
        currentUserId: "biz-user-1",
        userRole: "business",
        senderName: "Client",
        messageType: "text",
        content: "Secret order 1 brief info",
      });

      // Another order
      const order2: PromotionOrder = {
        ...sampleOrder,
        id: "ord-test-999",
        order_reference: "BTV-ORD-99999",
        business_user_id: "other-biz-user",
        promoter_id: "other-promoter",
      };
      saveLocalOrders([sampleOrder, order2]);

      // Trying to fetch messages of order 2 with biz-user-1
      const thread2 = await getOrderMessages("ord-test-999", "biz-user-1", "business");
      expect(thread2.error).toMatch(/Unauthorized|Forbidden/);
      expect(thread2.messages.length).toBe(0);
    });
  });
});
