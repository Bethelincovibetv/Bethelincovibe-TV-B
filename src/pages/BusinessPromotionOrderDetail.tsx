import React, { useEffect, useState } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import {
  getPromotionOrderById,
  PromotionOrder,
} from "@/services/promotionOrderService";
import {
  initPromotionOrderPayment,
  verifyPromotionOrderPayment,
  loadPaystackInlineScript,
} from "@/services/promotionPaymentService";
import {
  reviewDeliveryProof,
  checkAndProcessAutoApproval,
  DeliveryProofSubmission,
  OrderAuditEvent,
  REVIEW_WINDOW_HOURS,
} from "@/services/promotionExecutionService";
import {
  releaseEscrowAndSettleOrder,
  getSettlementByOrderId,
  PromotionSettlement,
} from "@/services/promotionSettlementService";
import { formatNaira } from "@/services/packageService";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Users,
  Eye,
  ExternalLink,
  ShieldCheck,
  FileText,
  CreditCard,
  Check,
  RefreshCw,
  Image as ImageIcon,
  RotateCcw,
  AlertTriangle,
  History,
  Link as LinkIcon,
  ShieldAlert,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export default function BusinessPromotionOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [order, setOrder] = useState<PromotionOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [paystackKey, setPaystackKey] = useState<string>("");

  // Review Workflow States
  const [reviewLoading, setReviewLoading] = useState(false);
  const [revisionDialogOpen, setRevisionDialogOpen] = useState(false);
  const [revisionReason, setRevisionReason] = useState("");
  const [disputeDialogOpen, setDisputeDialogOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");

  // Proof Viewer
  const [selectedProof, setSelectedProof] = useState<DeliveryProofSubmission | null>(null);

  useEffect(() => {
    loadPaystackInlineScript();

    async function fetchPaystackKey() {
      try {
        const { data } = await supabase
          .from("site_settings")
          .select("value")
          .eq("key", "paystack_public_key")
          .maybeSingle();
        if (data?.value) {
          setPaystackKey(data.value);
        }
      } catch (err) {
        console.warn("Could not fetch paystack_public_key from site_settings", err);
      }
    }
    fetchPaystackKey();
  }, []);

  useEffect(() => {
    async function loadOrder() {
      if (!id) return;
      setLoading(true);
      const result = await getPromotionOrderById(id, user?.id, user?.role);
      if (result.error || !result.order) {
        setError(result.error || "Order not found");
      } else {
        setOrder(result.order);

        // Pre-select latest proof if available
        const proofs = (result.order as any).delivery_proofs;
        if (proofs && proofs.length > 0) {
          setSelectedProof(proofs[proofs.length - 1]);
        }

        // Auto-check 48h auto-approval if in review
        if (result.order.status === "evidence_submitted") {
          const autoRes = await checkAndProcessAutoApproval(result.order.id);
          if (autoRes.autoApproved && autoRes.order) {
            setOrder(autoRes.order);
            toast.info("48-Hour review window concluded: Order automatically approved.");
          }
        }

        // Auto-verify payment if redirected with ref
        const queryRef = searchParams.get("paystack_ref") || searchParams.get("reference");
        if (queryRef && result.order.status === "pending_payment") {
          handleAutoVerify(result.order.id, queryRef);
        }
      }
      setLoading(false);
    }
    loadOrder();
  }, [id, user, searchParams]);

  async function handleAutoVerify(orderId: string, reference: string) {
    setVerifying(true);
    try {
      const verifyRes = await verifyPromotionOrderPayment(orderId, reference, user?.id);
      if (verifyRes.ok && verifyRes.order) {
        setOrder(verifyRes.order);
        toast.success("Payment Confirmed! Your funds are securely held in escrow.");
      } else {
        toast.error(verifyRes.error || "Payment verification could not be completed.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to verify payment");
    } finally {
      setVerifying(false);
    }
  }

  async function handlePayOrder() {
    if (!order) return;
    setPaying(true);

    try {
      const initResult = await initPromotionOrderPayment(order.id, user?.id);

      if (!initResult.ok || !initResult.reference) {
        toast.error(initResult.error || "Failed to initialize payment");
        setPaying(false);
        return;
      }

      const reference = initResult.reference;
      const amountNaira = initResult.amount || order.amount;
      const amountKobo = initResult.amount_kobo || Math.round(amountNaira * 100);

      if (typeof window !== "undefined" && (window as any).PaystackPop && paystackKey) {
        const handler = (window as any).PaystackPop.setup({
          key: paystackKey,
          email: user?.email || "business@example.com",
          amount: amountKobo,
          currency: "NGN",
          ref: reference,
          metadata: {
            order_id: order.id,
            order_reference: order.order_reference,
            purpose: "promotion_order_payment",
          },
          callback: async (response: any) => {
            setVerifying(true);
            const verifiedRef = response.reference || reference;
            const verifyRes = await verifyPromotionOrderPayment(order.id, verifiedRef, user?.id);

            if (verifyRes.ok && verifyRes.order) {
              setOrder(verifyRes.order);
              toast.success("Payment Confirmed! Escrow is now funded.");
            } else {
              toast.error(verifyRes.error || "Payment verification failed.");
            }
            setVerifying(false);
            setPaying(false);
          },
          onClose: () => {
            toast.info("Payment window was closed.");
            setPaying(false);
          },
        });
        handler.openIframe();
      } else if (
        initResult.authorization_url &&
        initResult.authorization_url.startsWith("http") &&
        !initResult.authorization_url.includes("mock")
      ) {
        window.location.href = initResult.authorization_url;
      } else {
        const verifyRes = await verifyPromotionOrderPayment(order.id, reference, user?.id, {
          status: "success",
          amount: amountNaira,
          currency: "NGN",
        });

        if (verifyRes.ok && verifyRes.order) {
          setOrder(verifyRes.order);
          toast.success("Payment Confirmed! Escrow is now funded.");
        } else {
          toast.error(verifyRes.error || "Verification failed");
        }
        setPaying(false);
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred during payment.");
      setPaying(false);
    }
  }

  // Business Review Actions
  async function handleApproveDeliverables() {
    if (!order) return;
    setReviewLoading(true);
    try {
      const res = await reviewDeliveryProof(order.id, "approve", {}, user?.id);
      if (res.error || !res.order) {
        toast.error(res.error || "Failed to approve deliverables");
      } else {
        setOrder(res.order);
        toast.success("Deliverables approved! Escrow payment will be released.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to approve");
    } finally {
      setReviewLoading(false);
    }
  }

  async function handleRequestRevision() {
    if (!order) return;
    if (!revisionReason.trim() || revisionReason.trim().length < 5) {
      toast.error("Please provide a revision reason (at least 5 characters).");
      return;
    }
    setReviewLoading(true);
    try {
      const res = await reviewDeliveryProof(
        order.id,
        "request_revision",
        { reason: revisionReason.trim() },
        user?.id
      );
      if (res.error || !res.order) {
        toast.error(res.error || "Failed to submit revision request");
      } else {
        setOrder(res.order);
        setRevisionDialogOpen(false);
        setRevisionReason("");
        toast.success("Revision requested! Promoter will receive your instructions.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to request revision");
    } finally {
      setReviewLoading(false);
    }
  }

  async function handleRaiseDispute() {
    if (!order) return;
    if (!disputeReason.trim() || disputeReason.trim().length < 10) {
      toast.error("Please provide a detailed dispute reason (at least 10 characters).");
      return;
    }
    setReviewLoading(true);
    try {
      const res = await reviewDeliveryProof(
        order.id,
        "dispute",
        { reason: disputeReason.trim() },
        user?.id
      );
      if (res.error || !res.order) {
        toast.error(res.error || "Failed to open dispute");
      } else {
        setOrder(res.order);
        setDisputeDialogOpen(false);
        setDisputeReason("");
        toast.info("Dispute opened. Escrow release is frozen pending mediation.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to open dispute");
    } finally {
      setReviewLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
        <div className="text-center space-y-2">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-muted-foreground">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
        <Card className="p-8 max-w-md w-full text-center rounded-3xl space-y-4">
          <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
          <div>
            <h2 className="text-lg font-bold text-foreground">Order Access Restricted</h2>
            <p className="text-xs text-muted-foreground mt-1">{error || "Could not retrieve order details."}</p>
          </div>
          <Button asChild variant="outline" className="rounded-xl text-xs">
            <Link to="/dashboard/promotion-orders">
              <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
              Back to My Orders
            </Link>
          </Button>
        </Card>
      </div>
    );
  }

  const isPending = order.status === "pending_payment";
  const isPaid = order.status === "paid_escrow";
  const isInProgress = order.status === "in_progress";
  const isEvidenceSubmitted = order.status === "evidence_submitted";
  const isRevisionRequested = order.status === "revision_requested";
  const isApproved = order.status === "approved";
  const isDisputed = order.status === "disputed";
  const isCancelled = order.status === "cancelled";

  const deliveryProofs: DeliveryProofSubmission[] = (order as any).delivery_proofs || [];
  const auditTrail: OrderAuditEvent[] = (order as any).audit_trail || [];

  return (
    <div className="min-h-screen bg-background text-foreground pb-16">
      {/* Top Header Navigation */}
      <div className="border-b border-border/70 bg-card/60 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <Button variant="ghost" size="sm" asChild className="rounded-xl text-xs gap-1.5">
            <Link to="/dashboard/promotion-orders">
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Orders</span>
            </Link>
          </Button>

          <Badge variant="outline" className="text-xs font-mono font-bold text-primary border-primary/30">
            {order.order_reference}
          </Badge>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Order Status Header Card */}
        <Card className="p-6 rounded-3xl border border-border/70 bg-card space-y-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                {isPending && (
                  <Badge variant="outline" className="text-xs font-extrabold bg-amber-500/10 text-amber-600 border-amber-500/30">
                    Payment Required (Pending)
                  </Badge>
                )}
                {isPaid && (
                  <Badge variant="outline" className="text-xs font-extrabold bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                    Payment Confirmed (Escrow Held)
                  </Badge>
                )}
                {isInProgress && (
                  <Badge variant="outline" className="text-xs font-extrabold bg-indigo-500/10 text-indigo-600 border-indigo-500/30">
                    Campaign Broadcast in Progress
                  </Badge>
                )}
                {isEvidenceSubmitted && (
                  <Badge variant="outline" className="text-xs font-extrabold bg-blue-500/10 text-blue-600 border-blue-500/30 animate-pulse">
                    Action Required: Review Proof
                  </Badge>
                )}
                {isRevisionRequested && (
                  <Badge variant="outline" className="text-xs font-extrabold bg-orange-500/10 text-orange-600 border-orange-500/30">
                    Revision Requested
                  </Badge>
                )}
                {isApproved && (
                  <Badge variant="outline" className="text-xs font-extrabold bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                    Deliverables Approved
                  </Badge>
                )}
                {isDisputed && (
                  <Badge variant="outline" className="text-xs font-extrabold bg-rose-500/10 text-rose-600 border-rose-500/30">
                    Dispute Active
                  </Badge>
                )}
                {isCancelled && (
                  <Badge variant="outline" className="text-xs font-extrabold bg-muted text-muted-foreground border-border">
                    Cancelled
                  </Badge>
                )}

                <span className="text-xs text-muted-foreground">
                  Created {new Date(order.created_at).toLocaleDateString()}
                </span>
              </div>

              <h1 className="text-2xl font-black text-foreground mt-1">
                {order.package?.title || "Promotion Order"}
              </h1>
            </div>

            <div className="sm:text-right">
              <span className="text-[11px] text-muted-foreground block font-medium">Order Amount</span>
              <span className="text-2xl font-black text-primary">{formatNaira(order.amount)}</span>
            </div>
          </div>

          {/* Verification in Progress Alert */}
          {verifying && (
            <Alert className="bg-primary/10 border-primary/30 text-primary rounded-2xl animate-pulse">
              <RefreshCw className="h-4 w-4 text-primary animate-spin mt-0.5 shrink-0" />
              <div>
                <AlertTitle className="text-xs font-bold">Payment Verification Pending</AlertTitle>
                <AlertDescription className="text-xs text-muted-foreground mt-0.5">
                  Verifying your transaction with Paystack. Please do not close this window...
                </AlertDescription>
              </div>
            </Alert>
          )}

          {/* Pending Payment State */}
          {isPending && !verifying && (
            <div className="space-y-4 pt-2">
              <Alert className="bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-100 rounded-2xl">
                <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <AlertTitle className="text-xs font-bold text-amber-700 dark:text-amber-400">
                    Payment required before promotion can begin.
                  </AlertTitle>
                  <AlertDescription className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    Pay securely using Paystack (Debit Card, Bank Transfer, USSD). Your funds will be held safely in escrow until the promoter posts your campaign and you review the verification evidence.
                  </AlertDescription>
                </div>
              </Alert>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-muted/40 border border-border/60">
                <div className="space-y-0.5 text-center sm:text-left">
                  <div className="text-xs font-semibold text-foreground flex items-center gap-1.5 justify-center sm:justify-start">
                    <ShieldCheck className="h-4 w-4 text-emerald-500" />
                    <span>Protected by Bethelincovibe Escrow</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Promoter only gets paid after you confirm campaign delivery.
                  </p>
                </div>

                <Button
                  id="paystack-checkout-btn"
                  onClick={handlePayOrder}
                  disabled={paying || verifying}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl font-bold text-sm bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-all gap-2"
                >
                  {paying ? (
                    <>
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Processing Checkout...</span>
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4" />
                      <span>Pay {formatNaira(order.amount)}</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Paid / Escrow State */}
          {isPaid && (
            <Alert className="bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-50 rounded-2xl">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
              <div className="space-y-1">
                <AlertTitle className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                  Payment Confirmed — Funds Secured in Escrow
                </AlertTitle>
                <AlertDescription className="text-xs text-muted-foreground leading-relaxed">
                  Your payment of {formatNaira(order.amount)} was verified and is safely locked in escrow. The promoter has been notified to schedule and broadcast your campaign.
                </AlertDescription>
                {order.paid_at && (
                  <div className="pt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground font-mono">
                    <span>Paid on: {new Date(order.paid_at).toLocaleString()}</span>
                    {order.payment_reference && <span>Ref: {order.payment_reference}</span>}
                  </div>
                )}
              </div>
            </Alert>
          )}

          {/* In Progress State */}
          {isInProgress && (
            <Alert className="bg-indigo-500/10 border-indigo-500/30 text-indigo-950 dark:text-indigo-50 rounded-2xl">
              <Clock className="h-4 w-4 text-indigo-600 dark:text-indigo-400 mt-0.5 shrink-0" />
              <div className="space-y-1">
                <AlertTitle className="text-xs font-bold text-indigo-700 dark:text-indigo-300">
                  Promoter is Executing Your Campaign
                </AlertTitle>
                <AlertDescription className="text-xs text-muted-foreground leading-relaxed">
                  The promoter accepted your order and is preparing/broadcasting your promotional materials to their WhatsApp audience.
                </AlertDescription>
                {(order as any).sla_deadline && (
                  <div className="pt-1 text-[11px] text-muted-foreground font-mono">
                    Estimated Delivery SLA: {new Date((order as any).sla_deadline).toLocaleString()}
                  </div>
                )}
              </div>
            </Alert>
          )}

          {/* Revision Requested State */}
          {isRevisionRequested && (
            <Alert className="bg-orange-500/10 border-orange-500/30 text-orange-950 dark:text-orange-50 rounded-2xl">
              <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5 shrink-0" />
              <div className="space-y-1">
                <AlertTitle className="text-xs font-bold text-orange-700 dark:text-orange-400">
                  Revision In Progress
                </AlertTitle>
                <AlertDescription className="text-xs text-muted-foreground leading-relaxed">
                  You requested revisions: &ldquo;{(order as any).revision_reason}&rdquo;. The promoter is preparing updated evidence.
                </AlertDescription>
              </div>
            </Alert>
          )}

          {/* Approved State */}
          {isApproved && (
            <Alert className="bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-50 rounded-2xl">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
              <div className="space-y-1">
                <AlertTitle className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                  Deliverables Approved & Verified
                </AlertTitle>
                <AlertDescription className="text-xs text-muted-foreground leading-relaxed">
                  You have confirmed delivery of this promotion. Escrow payout has been authorized for the promoter.
                </AlertDescription>
                {order.approved_at && (
                  <div className="pt-1 text-[11px] text-muted-foreground font-mono">
                    Approved on: {new Date(order.approved_at).toLocaleString()}
                    {(order as any).auto_approved && " (Auto-approved via 48h SLA)"}
                  </div>
                )}
              </div>
            </Alert>
          )}

          {/* Disputed State */}
          {isDisputed && (
            <Alert className="bg-rose-500/10 border-rose-500/30 text-rose-950 dark:text-rose-50 rounded-2xl">
              <ShieldAlert className="h-4 w-4 text-rose-600 mt-0.5 shrink-0" />
              <div className="space-y-1">
                <AlertTitle className="text-xs font-bold text-rose-700 dark:text-rose-400">
                  Dispute Case Active
                </AlertTitle>
                <AlertDescription className="text-xs text-muted-foreground leading-relaxed">
                  Dispute Reason: &ldquo;{(order as any).dispute_reason}&rdquo;. Escrow funds are locked securely while mediation is handled by the platform team.
                </AlertDescription>
              </div>
            </Alert>
          )}
        </Card>

        {/* Business Review Deliverables Card (Visible when evidence_submitted) */}
        {isEvidenceSubmitted && (
          <Card className="p-6 rounded-3xl border border-blue-500/30 bg-card space-y-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5 text-blue-600" />
                <h2 className="text-lg font-bold text-foreground">
                  Review Deliverables (Proof V{(order as any).proof_version || 1})
                </h2>
              </div>

              {(order as any).review_deadline && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                  <Clock className="h-3.5 w-3.5 text-amber-500" />
                  <span>48h Review Window: {new Date((order as any).review_deadline).toLocaleString()}</span>
                </div>
              )}
            </div>

            {/* Proof Details */}
            {selectedProof ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Submitted: {new Date(selectedProof.submitted_at).toLocaleString()}</span>
                  {selectedProof.views_count !== null && (
                    <Badge variant="secondary" className="text-xs font-bold">
                      {selectedProof.views_count?.toLocaleString()} Verified Views
                    </Badge>
                  )}
                </div>

                {/* Evidence Image Gallery */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {selectedProof.screenshot_urls.map((url, idx) => (
                    <a
                      key={idx}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block group rounded-xl overflow-hidden border border-border/80 bg-background aspect-video relative shadow-sm"
                    >
                      <img
                        src={url}
                        alt={`Proof evidence ${idx + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <ExternalLink className="h-4 w-4 text-white" />
                      </div>
                    </a>
                  ))}
                </div>

                {selectedProof.post_url && (
                  <div className="text-xs">
                    <span className="text-muted-foreground block">Broadcast Post Link:</span>
                    <a
                      href={selectedProof.post_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline font-medium break-all flex items-center gap-1"
                    >
                      <LinkIcon className="h-3 w-3 shrink-0" />
                      <span>{selectedProof.post_url}</span>
                    </a>
                  </div>
                )}

                {selectedProof.notes && (
                  <div className="text-xs p-3 rounded-xl bg-muted/30 border border-border/50">
                    <span className="text-muted-foreground block font-medium">Promoter Notes:</span>
                    <p className="text-foreground mt-0.5">{selectedProof.notes}</p>
                  </div>
                )}

                {/* Action Buttons: Approve, Request Revision, Dispute */}
                <div className="pt-4 border-t border-border/60 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Button
                      id="business-approve-btn"
                      onClick={handleApproveDeliverables}
                      disabled={reviewLoading}
                      className="rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-sm"
                    >
                      <Check className="h-4 w-4" />
                      <span>Approve Deliverables</span>
                    </Button>

                    <Button
                      id="business-revision-btn"
                      variant="outline"
                      onClick={() => setRevisionDialogOpen(true)}
                      disabled={reviewLoading}
                      className="rounded-xl font-bold text-xs gap-1.5"
                    >
                      <RotateCcw className="h-4 w-4" />
                      <span>Request Revision</span>
                    </Button>
                  </div>

                  <Button
                    id="business-dispute-btn"
                    variant="ghost"
                    onClick={() => setDisputeDialogOpen(true)}
                    disabled={reviewLoading}
                    className="rounded-xl font-bold text-xs text-destructive hover:bg-destructive/10 gap-1.5"
                  >
                    <ShieldAlert className="h-4 w-4" />
                    <span>Raise Dispute</span>
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">No proof submission found.</p>
            )}
          </Card>
        )}

        {/* Deliverables History for Non-Review States */}
        {deliveryProofs.length > 0 && !isEvidenceSubmitted && (
          <Card className="p-6 rounded-3xl border border-border/70 bg-card space-y-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5 text-primary" />
                <h3 className="text-base font-bold text-foreground">Delivered Verification Evidence</h3>
              </div>
              <span className="text-xs text-muted-foreground">{deliveryProofs.length} version(s)</span>
            </div>

            {/* Proof Versions Tabs */}
            <div className="flex flex-wrap gap-2">
              {deliveryProofs.map((proof) => (
                <Button
                  key={proof.id}
                  variant={selectedProof?.id === proof.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedProof(proof)}
                  className="rounded-xl text-xs font-bold gap-1"
                >
                  <span>Proof V{proof.version}</span>
                  <span className="text-[10px] opacity-70">
                    ({new Date(proof.submitted_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })})
                  </span>
                </Button>
              ))}
            </div>

            {selectedProof && (
              <div className="p-4 rounded-2xl border border-border/60 bg-muted/20 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {selectedProof.screenshot_urls.map((url, idx) => (
                    <a
                      key={idx}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block group rounded-xl overflow-hidden border border-border/80 bg-background aspect-video relative"
                    >
                      <img
                        src={url}
                        alt={`Proof evidence ${idx + 1}`}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </a>
                  ))}
                </div>

                {selectedProof.post_url && (
                  <div className="text-xs">
                    <span className="text-muted-foreground block">Link:</span>
                    <a
                      href={selectedProof.post_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline font-medium break-all"
                    >
                      {selectedProof.post_url}
                    </a>
                  </div>
                )}
              </div>
            )}
          </Card>
        )}

        {/* Campaign & Deliverables Details */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Details (2 cols) */}
          <div className="md:col-span-2 space-y-6">
            {/* Promotion Brief */}
            <Card className="p-5 rounded-2xl border border-border/70 bg-card space-y-3">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-primary" />
                <span>Promotion Brief</span>
              </h3>
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                {order.promotion_brief}
              </p>
            </Card>

            {/* Creative Assets */}
            <Card className="p-5 rounded-2xl border border-border/70 bg-card space-y-3">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <ExternalLink className="h-3.5 w-3.5 text-primary" />
                <span>Creative Assets & Links</span>
              </h3>
              {order.creative_assets_urls && order.creative_assets_urls.length > 0 ? (
                <div className="space-y-2">
                  {order.creative_assets_urls.map((url, idx) => (
                    <a
                      key={idx}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-2.5 rounded-xl border border-border/60 bg-muted/30 hover:bg-muted/60 text-xs text-primary font-medium transition-colors"
                    >
                      <span className="line-clamp-1 break-all">{url}</span>
                      <ExternalLink className="h-3.5 w-3.5 shrink-0 ml-2 text-muted-foreground" />
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">
                  No external asset URLs provided. The promoter will use the text brief.
                </p>
              )}
            </Card>

            {/* Special Instructions */}
            {order.special_instructions && (
              <Card className="p-5 rounded-2xl border border-border/70 bg-card space-y-3">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                  Special Instructions
                </h3>
                <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                  {order.special_instructions}
                </p>
              </Card>
            )}

            {/* Audit History */}
            {auditTrail.length > 0 && (
              <Card className="p-5 rounded-2xl border border-border/70 bg-card space-y-3">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <History className="h-3.5 w-3.5 text-primary" />
                  <span>Order Audit History</span>
                </h3>
                <div className="space-y-2.5">
                  {auditTrail.map((ev, idx) => (
                    <div key={idx} className="text-xs flex items-start gap-2.5 pb-2 border-b border-border/40 last:border-0 last:pb-0">
                      <div className="h-2 w-2 rounded-full bg-primary mt-1.5 shrink-0" />
                      <div className="space-y-0.5 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-foreground capitalize">
                            {ev.event_type.replace(/_/g, " ")}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {new Date(ev.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground">{ev.details}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>

          {/* Sidebar Info (1 col) */}
          <div className="space-y-6">
            {/* Promoter Info */}
            <Card className="p-5 rounded-2xl border border-border/70 bg-card space-y-4">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                Promoter & Audience
              </h3>

              <div>
                <span className="text-[11px] text-muted-foreground block">Assigned Promoter</span>
                <span className="text-sm font-bold text-foreground">
                  {order.promoter?.display_name || "Verified Promoter"}
                </span>
              </div>

              {order.community && (
                <div className="pt-3 border-t border-border/50 space-y-2">
                  <div>
                    <span className="text-[11px] text-muted-foreground block">WhatsApp Community</span>
                    <span className="text-xs font-semibold text-foreground">{order.community.name}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {order.community.member_count.toLocaleString()} members
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {order.community.active_daily_views.toLocaleString()} daily
                    </span>
                  </div>
                </div>
              )}
            </Card>

            {/* Package Deliverables */}
            {order.package && (
              <Card className="p-5 rounded-2xl border border-border/70 bg-card space-y-3">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                  Package Deliverables
                </h3>

                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5 text-primary" />
                  <span>Duration: {order.package.duration_hours} hours active status</span>
                </div>

                <ul className="space-y-1.5 pt-2">
                  {order.package.deliverables.map((del, idx) => (
                    <li key={idx} className="text-xs text-muted-foreground flex items-start gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{del}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {/* Financial Summary Card */}
            <Card className="p-5 rounded-2xl border border-border/70 bg-card space-y-3">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                Payment Summary
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Promotion Fee</span>
                  <span>{formatNaira(order.amount)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Escrow Protection</span>
                  <span className="text-emerald-600 font-semibold">Included (Free)</span>
                </div>
                <div className="pt-2 border-t border-border/50 flex justify-between font-bold text-foreground text-sm">
                  <span>Total</span>
                  <span className="text-primary">{formatNaira(order.amount)}</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Revision Dialog */}
      <Dialog open={revisionDialogOpen} onOpenChange={setRevisionDialogOpen}>
        <DialogContent className="rounded-3xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Request Deliverable Revision</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Please specify what changes or updated screenshots are needed from the promoter.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <Label className="text-xs font-bold">Revision Instructions (Required)</Label>
            <Textarea
              placeholder="e.g. Please provide full view counter screenshot showing 24h expiration timestamp."
              value={revisionReason}
              onChange={(e) => setRevisionReason(e.target.value)}
              rows={3}
              className="rounded-xl text-xs"
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRevisionDialogOpen(false)}
              className="rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleRequestRevision}
              disabled={reviewLoading || revisionReason.trim().length < 5}
              className="rounded-xl text-xs font-bold bg-primary text-primary-foreground"
            >
              Submit Revision Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dispute Dialog */}
      <Dialog open={disputeDialogOpen} onOpenChange={setDisputeDialogOpen}>
        <DialogContent className="rounded-3xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-destructive flex items-center gap-2">
              <ShieldAlert className="h-5 w-5" />
              <span>Raise Order Dispute</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Raising a dispute will freeze escrow release. Our support staff will review the deliverable logs and mediate between both parties.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <Label className="text-xs font-bold">Dispute Reason & Details (Required)</Label>
            <Textarea
              placeholder="Please explain in detail why the deliverable does not match the promotion brief (minimum 10 characters)..."
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
              rows={4}
              className="rounded-xl text-xs"
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDisputeDialogOpen(false)}
              className="rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleRaiseDispute}
              disabled={reviewLoading || disputeReason.trim().length < 10}
              className="rounded-xl text-xs font-bold"
            >
              Confirm Dispute
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
