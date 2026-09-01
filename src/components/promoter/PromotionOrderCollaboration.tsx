/**
 * Component: PromotionOrderCollaboration.tsx
 * Purpose: In-Order Contextual Collaboration, Creative Asset Exchange & Delivery SLA Monitoring Engine
 */

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Send,
  Paperclip,
  Image as ImageIcon,
  FileText,
  Video,
  Clock,
  Check,
  CheckCheck,
  AlertCircle,
  Copy,
  ExternalLink,
  Sparkles,
  ShieldCheck,
  Calendar,
  Eye,
  RefreshCw,
  X,
  FileUp,
  MessageSquare,
  Flame,
  UserCheck,
} from "lucide-react";
import {
  PromotionOrderMessage,
  OrderMessageType,
  MessageAttachment,
  OrderSlaStatus,
  getOrderMessages,
  sendOrderMessage,
  markOrderMessagesAsRead,
  subscribeToOrderMessages,
  calculateOrderSlaStatus,
  validateAttachment,
} from "@/services/promotionMessageService";
import { PromotionOrder } from "@/services/promotionOrderService";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface PromotionOrderCollaborationProps {
  order: PromotionOrder;
  currentUserId?: string;
  userRole?: "business" | "promoter" | "admin";
  onViewProof?: () => void;
}

export const PromotionOrderCollaboration: React.FC<PromotionOrderCollaborationProps> = ({
  order,
  currentUserId,
  userRole = "business",
  onViewProof,
}) => {
  const [messages, setMessages] = useState<PromotionOrderMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [inputText, setInputText] = useState<string>("");
  const [messageType, setMessageType] = useState<OrderMessageType>("text");
  
  // Attachments modal/state
  const [showAttachModal, setShowAttachModal] = useState<boolean>(false);
  const [attachmentUrl, setAttachmentUrl] = useState<string>("");
  const [attachmentName, setAttachmentName] = useState<string>("");
  const [attachmentMime, setAttachmentMime] = useState<string>("image/jpeg");
  const [stagedAttachments, setStagedAttachments] = useState<MessageAttachment[]>([]);
  const [previewAttachment, setPreviewAttachment] = useState<MessageAttachment | null>(null);

  // Live SLA state calculation (refreshes every 30s)
  const [slaStatus, setSlaStatus] = useState<OrderSlaStatus>(() => calculateOrderSlaStatus(order));

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Recalculate SLA on order changes or timer
  useEffect(() => {
    setSlaStatus(calculateOrderSlaStatus(order));
    const interval = setInterval(() => {
      setSlaStatus(calculateOrderSlaStatus(order));
    }, 30000);
    return () => clearInterval(interval);
  }, [order]);

  // Load messages
  const loadMessages = async () => {
    try {
      setIsLoading(true);
      const { messages: fetched, error } = await getOrderMessages(order.id, currentUserId, userRole);
      if (error) {
        toast.error(error);
      } else {
        setMessages(fetched);
        // Mark as read
        if (currentUserId) {
          markOrderMessagesAsRead(order.id, currentUserId);
        }
      }
    } catch (err: any) {
      console.warn("Notice: loading order messages", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();

    // Subscribe to realtime updates
    const unsubscribe = subscribeToOrderMessages(order.id, (newMsg) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
      if (currentUserId && newMsg.sender_id !== currentUserId) {
        markOrderMessagesAsRead(order.id, currentUserId);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [order.id, currentUserId, userRole]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Quick Action: Add macro text
  const applyQuickMacro = (macroText: string, type: OrderMessageType = "text") => {
    setInputText((prev) => (prev ? `${prev} ${macroText}` : macroText));
    setMessageType(type);
  };

  // Stage Attachment
  const handleStageAttachment = () => {
    if (!attachmentUrl.trim()) {
      toast.error("Please enter a valid asset URL or file link.");
      return;
    }

    const name = attachmentName.trim() || `Asset-${Date.now()}`;
    const validation = validateAttachment({
      name,
      mime_type: attachmentMime,
      url: attachmentUrl.trim(),
    });

    if (!validation.valid) {
      toast.error(validation.error || "Attachment validation failed.");
      return;
    }

    const newAtt: MessageAttachment = {
      url: attachmentUrl.trim(),
      name,
      mime_type: attachmentMime,
      file_type: validation.fileType,
    };

    setStagedAttachments((prev) => [...prev, newAtt]);
    setAttachmentUrl("");
    setAttachmentName("");
    setShowAttachModal(false);
    toast.success("Asset attached to message.");
  };

  // Remove Staged Attachment
  const removeStagedAttachment = (index: number) => {
    setStagedAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  // Send Message Handler
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSending) return;

    const trimmed = inputText.trim();
    if (!trimmed && stagedAttachments.length === 0) {
      toast.error("Please enter a message or attach a creative asset.");
      return;
    }

    try {
      setIsSending(true);
      const { message, error } = await sendOrderMessage({
        orderId: order.id,
        content: trimmed || (stagedAttachments.length > 0 ? `Shared ${stagedAttachments.length} asset(s)` : ""),
        messageType: stagedAttachments.length > 0 && messageType === "text" ? "attachment" : messageType,
        attachments: stagedAttachments,
        currentUserId,
        userRole,
      });

      if (error || !message) {
        toast.error(error || "Failed to deliver message.");
      } else {
        setMessages((prev) => [...prev, message]);
        setInputText("");
        setStagedAttachments([]);
        setMessageType("text");
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred sending message.");
    } finally {
      setIsSending(false);
    }
  };

  // Copy helpers
  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden flex flex-col h-[700px] max-h-[85vh]">
      {/* 1. SLA & Delivery Monitoring Banner */}
      <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center font-semibold text-xs shrink-0 ${
                slaStatus.badgeColor === "emerald"
                  ? "bg-emerald-100 text-emerald-800"
                  : slaStatus.badgeColor === "rose"
                  ? "bg-rose-100 text-rose-800"
                  : slaStatus.badgeColor === "amber"
                  ? "bg-amber-100 text-amber-800"
                  : "bg-purple-100 text-purple-800"
              }`}
            >
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-900">{slaStatus.title}</span>
                <Badge
                  variant="outline"
                  className={`text-[11px] px-2 py-0.5 font-semibold ${
                    slaStatus.isUrgent
                      ? "bg-rose-50 text-rose-700 border-rose-200 animate-pulse"
                      : slaStatus.slaType === "completed"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-slate-100 text-slate-700 border-slate-300"
                  }`}
                >
                  {slaStatus.formattedRemaining}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 line-clamp-1">{slaStatus.subtitle}</p>
            </div>
          </div>

          {/* Quick Action Tools */}
          <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
            {order.campaign_brief && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1 text-slate-700 hover:bg-slate-100"
                onClick={() => handleCopy(order.campaign_brief || "", "Campaign Brief")}
                title="Copy full business campaign brief"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Brief</span>
              </Button>
            )}

            {order.destination_link && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1 text-slate-700 hover:bg-slate-100"
                onClick={() => handleCopy(order.destination_link || "", "Destination Link")}
                title="Copy broadcast URL"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Copy Link</span>
              </Button>
            )}

            {onViewProof && ["delivered", "evidence_submitted", "revision_requested", "approved", "completed", "disputed"].includes(order.status) && (
              <Button
                variant="secondary"
                size="sm"
                className="h-8 text-xs gap-1 bg-purple-100 text-purple-800 hover:bg-purple-200"
                onClick={onViewProof}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>View Proof</span>
              </Button>
            )}

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-500 hover:text-slate-900"
              onClick={loadMessages}
              title="Refresh messages"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {/* Dynamic Progress Bar */}
        {slaStatus.slaType !== "none" && (
          <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2.5 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                slaStatus.badgeColor === "emerald"
                  ? "bg-emerald-500"
                  : slaStatus.badgeColor === "rose"
                  ? "bg-rose-500"
                  : slaStatus.badgeColor === "amber"
                  ? "bg-amber-500"
                  : "bg-purple-600"
              }`}
              style={{ width: `${Math.max(5, slaStatus.progressPercent)}%` }}
            />
          </div>
        )}
      </div>

      {/* 2. Message History Stream */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-50/50"
      >
        {isLoading && messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 py-12">
            <RefreshCw className="w-7 h-7 animate-spin mb-2 text-purple-600" />
            <p className="text-sm">Connecting to order workspace...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12 px-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600 mb-3">
              <MessageSquare className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-semibold text-slate-800">Order Collaboration Thread</h4>
            <p className="text-xs text-slate-500 max-w-sm mt-1">
              Direct, encrypted communication channel between business and promoter. Share flyers, agree on broadcast times, and preview deliverables securely.
            </p>
            <div className="flex flex-wrap gap-2 justify-center mt-4">
              <button
                type="button"
                onClick={() => applyQuickMacro("Hello! I have reviewed the campaign brief and everything looks good.", "text")}
                className="text-xs bg-white border border-slate-200 hover:border-purple-300 text-slate-700 px-2.5 py-1.5 rounded-lg shadow-2xs"
              >
                👋 "Brief looks good"
              </button>
              <button
                type="button"
                onClick={() => applyQuickMacro("Could you provide a high-resolution flyer image or video?", "draft_preview")}
                className="text-xs bg-white border border-slate-200 hover:border-purple-300 text-slate-700 px-2.5 py-1.5 rounded-lg shadow-2xs"
              >
                🖼️ "Need flyer asset"
              </button>
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === currentUserId;
            const isSystem = msg.is_system_event || msg.sender_role === "system";

            if (isSystem) {
              return (
                <div key={msg.id} className="flex justify-center my-2">
                  <div className="bg-slate-100 border border-slate-200/80 rounded-xl px-3 py-1.5 max-w-lg text-center flex items-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                    <span className="text-xs text-slate-600 font-medium">
                      {msg.message_content}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
              >
                {/* Sender Header */}
                <div className="flex items-center gap-1.5 mb-1 px-1">
                  <span className="text-[11px] font-semibold text-slate-700">
                    {msg.sender_name || (msg.sender_role === "business" ? "Business Buyer" : msg.sender_role === "promoter" ? "Promoter" : "Admin")}
                  </span>
                  <Badge
                    variant="outline"
                    className={`text-[9px] px-1.5 py-0 h-4 uppercase ${
                      msg.sender_role === "business"
                        ? "bg-blue-50 text-blue-700 border-blue-200"
                        : msg.sender_role === "promoter"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-purple-50 text-purple-700 border-purple-200"
                    }`}
                  >
                    {msg.sender_role}
                  </Badge>
                  <span className="text-[10px] text-slate-400">
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>

                {/* Message Bubble */}
                <div
                  className={`relative max-w-[85%] sm:max-w-md rounded-2xl p-3.5 shadow-2xs ${
                    isMe
                      ? "bg-purple-600 text-white rounded-tr-none"
                      : "bg-white text-slate-800 border border-slate-200/90 rounded-tl-none"
                  }`}
                >
                  {/* Message Type Tag if special */}
                  {msg.message_type !== "text" && (
                    <div
                      className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full mb-1.5 ${
                        isMe ? "bg-purple-700 text-purple-100" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {msg.message_type === "flyer" && <ImageIcon className="w-3 h-3" />}
                      {msg.message_type === "draft_preview" && <Sparkles className="w-3 h-3" />}
                      {msg.message_type === "schedule_confirmation" && <Calendar className="w-3 h-3" />}
                      {msg.message_type === "attachment" && <Paperclip className="w-3 h-3" />}
                      <span className="capitalize">{msg.message_type.replace("_", " ")}</span>
                    </div>
                  )}

                  {/* Body Text */}
                  <p className="text-xs sm:text-sm whitespace-pre-wrap break-words leading-relaxed">
                    {msg.message_content}
                  </p>

                  {/* Attachments Display */}
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="mt-2.5 space-y-2">
                      {msg.attachments.map((att, idx) => (
                        <div
                          key={idx}
                          className={`rounded-xl p-2 flex items-center justify-between gap-2 border ${
                            isMe
                              ? "bg-purple-700/60 border-purple-500 text-white"
                              : "bg-slate-50 border-slate-200 text-slate-800"
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {att.file_type === "image" ? (
                              <ImageIcon className="w-4 h-4 shrink-0 text-purple-300" />
                            ) : att.file_type === "video" ? (
                              <Video className="w-4 h-4 shrink-0 text-amber-300" />
                            ) : (
                              <FileText className="w-4 h-4 shrink-0 text-blue-300" />
                            )}
                            <div className="min-w-0">
                              <p className="text-xs font-medium truncate">{att.name}</p>
                              <p className={`text-[10px] ${isMe ? "text-purple-200" : "text-slate-400"}`}>
                                {att.file_type.toUpperCase()}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {att.file_type === "image" && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-inherit hover:bg-white/10"
                                onClick={() => setPreviewAttachment(att)}
                                title="Preview Image"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </Button>
                            )}
                            <a
                              href={att.url}
                              target="_blank"
                              rel="noreferrer"
                              className={`p-1.5 rounded-lg hover:bg-white/10 text-inherit`}
                              title="Open link"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Read receipts footer */}
                  <div
                    className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${
                      isMe ? "text-purple-200" : "text-slate-400"
                    }`}
                  >
                    {isMe && (
                      msg.read_by && msg.read_by.length > 1 ? (
                        <span className="flex items-center gap-0.5 text-purple-100" title="Read by participant">
                          <CheckCheck className="w-3 h-3" />
                        </span>
                      ) : (
                        <span className="flex items-center gap-0.5" title="Delivered">
                          <Check className="w-3 h-3" />
                        </span>
                      )
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 3. Staged Attachments Strip */}
      {stagedAttachments.length > 0 && (
        <div className="bg-purple-50/80 border-t border-purple-100 px-4 py-2 flex items-center gap-2 overflow-x-auto">
          <span className="text-xs font-semibold text-purple-900 shrink-0">Attached:</span>
          {stagedAttachments.map((att, idx) => (
            <div
              key={idx}
              className="bg-white border border-purple-200 rounded-lg px-2.5 py-1 flex items-center gap-2 text-xs text-slate-700 shadow-2xs shrink-0"
            >
              <Paperclip className="w-3 h-3 text-purple-600" />
              <span className="max-w-[120px] truncate">{att.name}</span>
              <button
                type="button"
                onClick={() => removeStagedAttachment(idx)}
                className="text-slate-400 hover:text-rose-600"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 4. Quick Macros & Message Type Bar */}
      <div className="bg-white border-t border-slate-100 px-4 py-1.5 flex items-center justify-between gap-2 overflow-x-auto">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setMessageType("text")}
            className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
              messageType === "text"
                ? "bg-purple-100 text-purple-800 font-semibold"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            General
          </button>
          <button
            type="button"
            onClick={() => setMessageType("flyer")}
            className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
              messageType === "flyer"
                ? "bg-purple-100 text-purple-800 font-semibold"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Flyer Asset
          </button>
          <button
            type="button"
            onClick={() => setMessageType("draft_preview")}
            className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
              messageType === "draft_preview"
                ? "bg-purple-100 text-purple-800 font-semibold"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Draft Preview
          </button>
          <button
            type="button"
            onClick={() => setMessageType("schedule_confirmation")}
            className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
              messageType === "schedule_confirmation"
                ? "bg-purple-100 text-purple-800 font-semibold"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Schedule
          </button>
        </div>

        {/* Quick Macro Buttons */}
        <div className="hidden sm:flex items-center gap-1">
          <button
            type="button"
            onClick={() => applyQuickMacro("Broadcast confirmed for:", "schedule_confirmation")}
            className="text-[11px] text-slate-500 hover:text-purple-600 hover:bg-purple-50 px-2 py-0.5 rounded"
          >
            + Confirm Schedule
          </button>
          <button
            type="button"
            onClick={() => applyQuickMacro("Please review this draft preview:", "draft_preview")}
            className="text-[11px] text-slate-500 hover:text-purple-600 hover:bg-purple-50 px-2 py-0.5 rounded"
          >
            + Draft Ready
          </button>
        </div>
      </div>

      {/* 5. Message Composer */}
      <form
        onSubmit={handleSendMessage}
        className="bg-white p-3 sm:p-4 border-t border-slate-200 flex items-center gap-2"
      >
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-10 w-10 shrink-0 text-slate-600 hover:text-purple-600 hover:border-purple-300"
          onClick={() => setShowAttachModal(true)}
          title="Attach creative asset or flyer"
        >
          <Paperclip className="w-4 h-4" />
        </Button>

        <Input
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={
            messageType === "flyer"
              ? "Add notes about this flyer..."
              : messageType === "draft_preview"
              ? "Share draft preview notes or request changes..."
              : messageType === "schedule_confirmation"
              ? "Specify exact broadcast timing..."
              : "Type a message to collaborate on this order..."
          }
          className="h-10 text-sm focus-visible:ring-purple-600"
          disabled={isSending}
        />

        <Button
          type="submit"
          className="h-10 px-4 bg-purple-600 hover:bg-purple-700 text-white shrink-0 font-medium text-xs sm:text-sm gap-1.5 shadow-sm"
          disabled={isSending || (!inputText.trim() && stagedAttachments.length === 0)}
        >
          {isSending ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <span className="hidden sm:inline">Send</span>
              <Send className="w-4 h-4" />
            </>
          )}
        </Button>
      </form>

      {/* 6. Attach Asset Modal */}
      {showAttachModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileUp className="w-5 h-5 text-purple-600" />
                <h3 className="text-sm font-bold text-slate-900">Attach Creative Asset</h3>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-slate-400 hover:text-slate-700"
                onClick={() => setShowAttachModal(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-3.5 py-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Asset / Flyer URL (Cloud / Supabase / Image Link)
                </label>
                <Input
                  value={attachmentUrl}
                  onChange={(e) => setAttachmentUrl(e.target.value)}
                  placeholder="https://example.com/assets/flyer-promo.png"
                  className="text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Asset Title / Label
                </label>
                <Input
                  value={attachmentName}
                  onChange={(e) => setAttachmentName(e.target.value)}
                  placeholder="e.g. Campaign Flyer HD v2"
                  className="text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Asset Format
                </label>
                <select
                  value={attachmentMime}
                  onChange={(e) => setAttachmentMime(e.target.value)}
                  className="w-full h-9 text-xs rounded-lg border border-slate-200 bg-white px-3 focus:outline-none focus:ring-2 focus:ring-purple-600"
                >
                  <option value="image/jpeg">JPEG Image</option>
                  <option value="image/png">PNG Image (Transparent/HD)</option>
                  <option value="image/webp">WebP Image</option>
                  <option value="video/mp4">MP4 Video Clip</option>
                  <option value="application/pdf">PDF Document / Presentation</option>
                </select>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-[11px] text-slate-500">
                🛡️ All assets are validated server-side. Executable or unverified formats are blocked. Maximum 15MB.
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => setShowAttachModal(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="text-xs bg-purple-600 hover:bg-purple-700 text-white font-medium"
                onClick={handleStageAttachment}
              >
                Add Attachment
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Image Preview Modal */}
      {previewAttachment && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPreviewAttachment(null)}
        >
          <div
            className="bg-white rounded-2xl overflow-hidden max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-3 border-b border-slate-100">
              <span className="text-xs font-semibold text-slate-800 truncate">
                {previewAttachment.name}
              </span>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={() => setPreviewAttachment(null)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-4 bg-slate-900 flex items-center justify-center overflow-auto max-h-[70vh]">
              <img
                src={previewAttachment.url}
                alt={previewAttachment.name}
                className="max-h-[60vh] object-contain rounded-lg"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="p-3 bg-slate-50 flex justify-end gap-2">
              <a
                href={previewAttachment.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs px-3 py-1.5 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open Original
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
