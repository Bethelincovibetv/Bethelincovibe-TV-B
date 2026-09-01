import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  getPromotionOrderById,
  PromotionOrder,
} from "@/services/promotionOrderService";
import {
  acceptPromotionOrder,
  declinePromotionOrder,
  submitDeliveryProof,
  checkSLAStatus,
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
import { Input } from "@/components/ui/input";
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
  Users,
  Eye,
  ExternalLink,
  FileText,
  ShieldCheck,
  Check,
  UploadCloud,
  Image as ImageIcon,
  Link as LinkIcon,
  RotateCcw,
  History,
  AlertTriangle,
  Send,
  XCircle,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function PromoterPromotionOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [order, setOrder] = useState<PromotionOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Execution Action States
  const [actionLoading, setActionLoading] = useState(false);
  const [declineDialogOpen, setDeclineDialogOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState("");

  // Proof Submission Form State
  const [screenshotUrlInput, setScreenshotUrlInput] = useState("");
  const [screenshotList, setScreenshotList] = useState<string[]>([]);
  const [postUrl, setPostUrl] = useState("");
  const [viewsCount, setViewsCount] = useState<string>("");
  const [notes, setNotes] = useState("");

  // Selected Proof for Viewing
  const [selectedProof, setSelectedProof] = useState<DeliveryProofSubmission | null>(null);

  // Settlement Data
  const [settlement, setSettlement] = useState<PromotionSettlement | null>(null);
  const [settling, setSettling] = useState(false);

  useEffect(() => {
    async function loadOrder() {
      if (!id) return;
      setLoading(true);
      const result = await getPromotionOrderById(id, user?.id, user?.role);
      if (result.error || !result.order) {
        setError(result.error || "Order not found");
      } else {
        setOrder(result.order);
        // Pre-fill proofs if available
        const proofs = (result.order as any).delivery_proofs;
        if (proofs && proofs.length > 0) {
          setSelectedProof(proofs[proofs.length - 1]);
        }

        // Check if settlement exists
        if (result.order.status === "completed" || result.order.status === "approved") {
          const settleRes = await getSettlementByOrderId(result.order.id, user?.id, user?.role);
          if (settleRes.settlement) {
            setSettlement(settleRes.settlement);
          }
        }
      }
      setLoading(false);
    }
    loadOrder();
  }, [id, user]);

  async function handleClaimEscrowSettlement() {
    if (!order) return;
    setSettling(true);
    try {
      const res = await releaseEscrowAndSettleOrder(order.id, user?.id);
      if (res.error || !res.order) {
        toast.error(res.error || "Failed to release escrow settlement");
      } else {
        setOrder(res.order);
        if (res.settlement) {
          setSettlement(res.settlement);
        }
        toast.success("Escrow settled! Net earnings credited to your wallet.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to settle escrow");
    } finally {
      setSettling(false);
    }
  }

  async function handleAcceptOrder() {
    if (!order) return;
    setActionLoading(true);
    try {
      const res = await acceptPromotionOrder(order.id, user?.id);
      if (res.error || !res.order) {
        toast.error(res.error || "Failed to accept order");
      } else {
        setOrder(res.order);
        toast.success("Order accepted! The SLA broadcast timer is now active.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to accept order");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDeclineOrder() {
    if (!order) return;
    if (!declineReason.trim() || declineReason.trim().length < 5) {
      toast.error("Please provide a decline reason with at least 5 characters.");
      return;
    }
    setActionLoading(true);
    try {
      const res = await declinePromotionOrder(order.id, declineReason.trim(), user?.id);
      if (res.error || !res.order) {
        toast.error(res.error || "Failed to decline order");
      } else {
        setOrder(res.order);
        setDeclineDialogOpen(false);
        toast.info("Order has been declined and cancelled.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to decline order");
    } finally {
      setActionLoading(false);
    }
  }

  function handleAddScreenshot() {
    if (!screenshotUrlInput.trim()) return;
    const url = screenshotUrlInput.trim();
    if (
      !url.startsWith("http://") &&
      !url.startsWith("https://") &&
      !url.startsWith("data:image/")
    ) {
      toast.error("URL must start with http:// or https:// or be a valid image URL.");
      return;
    }
    setScreenshotList((prev) => [...prev, url]);
    setScreenshotUrlInput("");
  }

  function handleRemoveScreenshot(index: number) {
    setScreenshotList((prev) => prev.filter((_, i) => i !== index));
  }

  // Quick Demo Helper to insert a sample screenshot
  function handleAddSampleScreenshot() {
    const sample = "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&auto=format&fit=crop&q=80";
    setScreenshotList((prev) => [...prev, sample]);
    toast.success("Sample status screenshot added.");
  }

  async function handleSubmitProof() {
    if (!order) return;
    if (screenshotList.length === 0 && !screenshotUrlInput.trim()) {
      toast.error("Please add at least one screenshot or deliverable evidence image.");
      return;
    }

    const finalScreenshots = [...screenshotList];
    if (screenshotUrlInput.trim()) {
      finalScreenshots.push(screenshotUrlInput.trim());
    }

    setActionLoading(true);
    try {
      const payload = {
        screenshotUrls: finalScreenshots,
        postUrl: postUrl.trim() || undefined,
        viewsCount: viewsCount ? parseInt(viewsCount, 10) : undefined,
        notes: notes.trim() || undefined,
      };

      const res = await submitDeliveryProof(order.id, payload, user?.id);
      if (res.error || !res.order) {
        toast.error(res.error || "Failed to submit delivery proof");
      } else {
        setOrder(res.order);
        if (res.proof) {
          setSelectedProof(res.proof);
        }
        setScreenshotList([]);
        setScreenshotUrlInput("");
        setPostUrl("");
        setViewsCount("");
        setNotes("");
        toast.success("Proof submitted successfully! Business has 48 hours to review.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to submit proof");
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
        <div className="text-center space-y-2">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-muted-foreground">Loading order execution workspace...</p>
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
            <Link to="/dashboard/promoter-orders">
              <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
              Back to Assigned Orders
            </Link>
          </Button>
        </Card>
      </div>
    );
  }

  const isPendingPayment = order.status === "pending_payment";
  const isPaidEscrow = order.status === "paid_escrow";
  const isInProgress = order.status === "in_progress";
  const isEvidenceSubmitted = order.status === "evidence_submitted";
  const isRevisionRequested = order.status === "revision_requested";
  const isApproved = order.status === "approved";
  const isCompleted = order.status === "completed";
  const isDisputed = order.status === "disputed";
  const isCancelled = order.status === "cancelled";

  const slaStatus = checkSLAStatus(order);
  const deliveryProofs: DeliveryProofSubmission[] = (order as any).delivery_proofs || [];
  const auditTrail: OrderAuditEvent[] = (order as any).audit_trail || [];

  return (
    <div className="min-h-screen bg-background text-foreground pb-16">
      {/* Top Header Navigation */}
      <div className="border-b border-border/70 bg-card/60 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <Button variant="ghost" size="sm" asChild className="rounded-xl text-xs gap-1.5">
            <Link to="/dashboard/promoter-orders">
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Assigned Orders</span>
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
                {isPendingPayment && (
                  <Badge variant="outline" className="text-xs font-extrabold bg-amber-500/10 text-amber-600 border-amber-500/30">
                    Awaiting Business Payment
                  </Badge>
                )}
                {isPaidEscrow && (
                  <Badge variant="outline" className="text-xs font-extrabold bg-blue-500/10 text-blue-600 border-blue-500/30 animate-pulse">
                    Action Required: Accept Order
                  </Badge>
                )}
                {isInProgress && (
                  <Badge variant="outline" className="text-xs font-extrabold bg-indigo-500/10 text-indigo-600 border-indigo-500/30">
                    Execution in Progress
                  </Badge>
                )}
                {isEvidenceSubmitted && (
                  <Badge variant="outline" className="text-xs font-extrabold bg-amber-500/10 text-amber-600 border-amber-500/30">
                    Proof Submitted (Under Review)
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
                {isCompleted && (
                  <Badge variant="outline" className="text-xs font-extrabold bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                    Order Settled & Completed
                  </Badge>
                )}
                {isDisputed && (
                  <Badge variant="outline" className="text-xs font-extrabold bg-rose-500/10 text-rose-600 border-rose-500/30">
                    Dispute Active
                  </Badge>
                )}
                {isCancelled && (
                  <Badge variant="outline" className="text-xs font-extrabold bg-muted text-muted-foreground border-border">
                    Cancelled / Declined
                  </Badge>
                )}

                <span className="text-xs text-muted-foreground">
                  Requested {new Date(order.created_at).toLocaleDateString()}
                </span>
              </div>

              <h1 className="text-2xl font-black text-foreground mt-1">
                {order.package?.title || "Promotion Order"}
              </h1>
            </div>

            <div className="sm:text-right">
              <span className="text-[11px] text-muted-foreground block font-medium">Your Net Earning</span>
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {formatNaira(order.promoter_net_earning)}
              </span>
              <span className="text-[10px] text-muted-foreground block">
                Total Price: {formatNaira(order.amount)} (Fee: {formatNaira(order.platform_fee)})
              </span>
            </div>
          </div>

          {/* 1. Paid Escrow: Accept / Decline Action Banner */}
          {isPaidEscrow && (
            <div className="p-5 rounded-2xl bg-blue-500/10 border border-blue-500/30 space-y-4">
              <div className="flex items-start gap-3">
                <ShieldCheck className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-blue-900 dark:text-blue-100">
                    Order Funded in Escrow ({formatNaira(order.amount)})
                  </h3>
                  <p className="text-xs text-blue-800/80 dark:text-blue-200/80 leading-relaxed">
                    The client has funded this order. Please review the campaign brief and accept to start the broadcast timer, or decline if you cannot fulfill the schedule.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Button
                  id="promoter-accept-btn"
                  onClick={handleAcceptOrder}
                  disabled={actionLoading}
                  className="rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-sm"
                >
                  <Check className="h-4 w-4" />
                  <span>Accept Order & Start SLA</span>
                </Button>

                <Button
                  id="promoter-decline-btn"
                  variant="outline"
                  onClick={() => setDeclineDialogOpen(true)}
                  disabled={actionLoading}
                  className="rounded-xl font-bold text-xs text-destructive border-destructive/30 hover:bg-destructive/10 gap-1.5"
                >
                  <XCircle className="h-4 w-4" />
                  <span>Decline Order</span>
                </Button>
              </div>
            </div>
          )}

          {/* 2. In Progress: SLA Countdown Timer Banner */}
          {isInProgress && (
            <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <div>
                  <div className="text-xs font-bold text-indigo-900 dark:text-indigo-100 flex items-center gap-1.5">
                    <span>SLA Execution Timer Active</span>
                    {slaStatus.isExpired ? (
                      <Badge variant="destructive" className="text-[10px] py-0">Deadline Passed</Badge>
                    ) : (
                      <Badge className="bg-indigo-600 text-white text-[10px] py-0">{slaStatus.hoursRemaining}h remaining</Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-indigo-800/80 dark:text-indigo-200/80">
                    Deadline: {slaStatus.deadlineIso ? new Date(slaStatus.deadlineIso).toLocaleString() : "24 hours"}
                  </p>
                </div>
              </div>

              <a
                href="#proof-submission-section"
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 shrink-0"
              >
                <span>Submit Delivery Proof Below</span>
                <ArrowLeft className="h-3 w-3 rotate-180" />
              </a>
            </div>
          )}

          {/* 3. Revision Requested Alert */}
          {isRevisionRequested && (
            <Alert className="bg-orange-500/10 border-orange-500/30 text-orange-950 dark:text-orange-50 rounded-2xl">
              <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5 shrink-0" />
              <div className="space-y-1">
                <AlertTitle className="text-xs font-bold text-orange-700 dark:text-orange-400">
                  Revision Requested by Business
                </AlertTitle>
                <AlertDescription className="text-xs text-muted-foreground leading-relaxed">
                  Reason: &ldquo;{(order as any).revision_reason || "Please update your deliverable proof"}&rdquo;
                </AlertDescription>
                <p className="text-[11px] text-orange-600 dark:text-orange-400 font-medium pt-1">
                  Please submit updated proof (Proof V{((order as any).proof_version || 1) + 1}) addressing the client&apos;s request.
                </p>
              </div>
            </Alert>
          )}

          {/* 4. Evidence Submitted: Under 48-Hour Review Banner */}
          {isEvidenceSubmitted && (
            <Alert className="bg-amber-500/10 border-amber-500/30 text-amber-950 dark:text-amber-50 rounded-2xl">
              <Clock className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <div className="space-y-1">
                <AlertTitle className="text-xs font-bold text-amber-700 dark:text-amber-400">
                  Proof Under 48-Hour Business Review
                </AlertTitle>
                <AlertDescription className="text-xs text-muted-foreground leading-relaxed">
                  Your delivery proof (Version {(order as any).proof_version || 1}) has been submitted to the client. The client has 48 hours to approve, request revisions, or raise inquiries. If no action is taken within 48 hours, escrow auto-approval will trigger automatically.
                </AlertDescription>
                {(order as any).review_deadline && (
                  <div className="pt-1 text-[11px] text-muted-foreground font-mono">
                    Review Deadline: {new Date((order as any).review_deadline).toLocaleString()}
                  </div>
                )}
              </div>
            </Alert>
          )}

          {/* 5. Approved / Completed Settlement Card */}
          {(isApproved || isCompleted) && (
            <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-emerald-950 dark:text-emerald-100">
                      {isCompleted ? "Escrow Settled & Credited to Wallet" : "Deliverables Approved — Ready for Escrow Release"}
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {isCompleted
                        ? `Funds have been transferred to your promoter wallet balance. You can withdraw to your bank account anytime.`
                        : `The client has approved your campaign delivery! Your net earning of ${formatNaira(order.promoter_net_earning)} is ready for settlement.`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isApproved && !isCompleted && (
                    <Button
                      size="sm"
                      onClick={handleClaimEscrowSettlement}
                      disabled={settling}
                      className="rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-sm"
                    >
                      {settling ? (
                        <>
                          <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Settling...</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="h-3.5 w-3.5" />
                          <span>Release Escrow to Wallet</span>
                        </>
                      )}
                    </Button>
                  )}
                  {isCompleted && (
                    <Button
                      asChild
                      size="sm"
                      className="rounded-xl text-xs font-bold bg-primary text-primary-foreground gap-1.5 shadow-sm"
                    >
                      <Link to="/dashboard/wallet">
                        <span>Go to Wallet & Withdraw</span>
                        <ArrowLeft className="h-3.5 w-3.5 rotate-180" />
                      </Link>
                    </Button>
                  )}
                </div>
              </div>

              {/* Settlement Financial Breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-emerald-500/20 text-xs">
                <div className="p-3 rounded-xl bg-background/80 border border-border/60">
                  <span className="text-muted-foreground block text-[11px]">Gross Order Escrow</span>
                  <span className="font-bold text-foreground text-sm">{formatNaira(order.amount)}</span>
                </div>
                <div className="p-3 rounded-xl bg-background/80 border border-border/60">
                  <span className="text-muted-foreground block text-[11px]">Platform Fee (10%)</span>
                  <span className="font-bold text-muted-foreground text-sm">-{formatNaira(order.platform_fee)}</span>
                </div>
                <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40">
                  <span className="text-emerald-900 dark:text-emerald-200 block text-[11px] font-bold">Net Wallet Credit</span>
                  <span className="font-black text-emerald-700 dark:text-emerald-400 text-sm">{formatNaira(order.promoter_net_earning)}</span>
                </div>
              </div>

              {settlement && (
                <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 font-mono">
                  <span>Settlement Ref: {settlement.settlement_reference}</span>
                  <span>Settled: {new Date(settlement.settled_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
              )}
            </div>
          )}

          {/* 6. Disputed Alert */}
          {isDisputed && (
            <Alert className="bg-rose-500/10 border-rose-500/30 text-rose-950 dark:text-rose-50 rounded-2xl">
              <AlertCircle className="h-4 w-4 text-rose-600 mt-0.5 shrink-0" />
              <div className="space-y-1">
                <AlertTitle className="text-xs font-bold text-rose-700 dark:text-rose-400">
                  Order Disputed
                </AlertTitle>
                <AlertDescription className="text-xs text-muted-foreground leading-relaxed">
                  The client raised a dispute: &ldquo;{(order as any).dispute_reason}&rdquo;. Escrow funds are safely frozen while our support team reviews the submission.
                </AlertDescription>
              </div>
            </Alert>
          )}
        </Card>

        {/* Deliverable Proof Submission Form (Visible when in_progress or revision_requested) */}
        {(isInProgress || isRevisionRequested) && (
          <Card id="proof-submission-section" className="p-6 rounded-3xl border border-primary/30 bg-card space-y-5 shadow-sm">
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-border/60">
              <div className="flex items-center gap-2">
                <UploadCloud className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-bold text-foreground">
                  {isRevisionRequested ? "Submit Revised Delivery Proof" : "Submit Deliverable Proof"}
                </h2>
              </div>
              <Badge variant="outline" className="text-xs font-bold text-primary">
                Version {((order as any).proof_version || 0) + 1}
              </Badge>
            </div>

            <div className="space-y-4">
              {/* Screenshots Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold">
                    Delivery Screenshots / Evidence Files <span className="text-destructive">*</span>
                  </Label>
                  <button
                    type="button"
                    onClick={handleAddSampleScreenshot}
                    className="text-[11px] text-primary hover:underline font-medium flex items-center gap-1"
                  >
                    <Sparkles className="h-3 w-3" />
                    <span>Insert Sample Screenshot</span>
                  </button>
                </div>

                <div className="flex gap-2">
                  <Input
                    placeholder="https://... image URL (PNG, JPG, WEBP, PDF)"
                    value={screenshotUrlInput}
                    onChange={(e) => setScreenshotUrlInput(e.target.value)}
                    className="rounded-xl text-xs"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddScreenshot();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddScreenshot}
                    className="rounded-xl text-xs shrink-0"
                  >
                    Add Evidence
                  </Button>
                </div>

                {/* Screenshot Thumbnails List */}
                {screenshotList.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                    {screenshotList.map((url, idx) => (
                      <div
                        key={idx}
                        className="relative group rounded-xl overflow-hidden border border-border/80 bg-muted/40 aspect-video flex items-center justify-center"
                      >
                        <img
                          src={url}
                          alt={`Proof preview ${idx + 1}`}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            (e.target as any).src = "https://placehold.co/400x250/222/fff?text=Proof+Image";
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveScreenshot(idx)}
                          className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/70 text-white hover:bg-destructive transition-colors"
                          title="Remove"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* View Count & Live Link Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Total Reach / View Counter (Optional)</Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="e.g. 1500"
                    value={viewsCount}
                    onChange={(e) => setViewsCount(e.target.value)}
                    className="rounded-xl text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Published Post / Group URL (Optional)</Label>
                  <Input
                    type="url"
                    placeholder="https://chat.whatsapp.com/..."
                    value={postUrl}
                    onChange={(e) => setPostUrl(e.target.value)}
                    className="rounded-xl text-xs"
                  />
                </div>
              </div>

              {/* Delivery Notes */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Proof Notes / Confirmation Details</Label>
                <Textarea
                  placeholder="Broadcast posted to verified group members at 2:00 PM. Live for 24 hours."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="rounded-xl text-xs resize-none"
                />
              </div>

              {/* Submit Action */}
              <div className="pt-2 flex justify-end">
                <Button
                  id="submit-proof-btn"
                  onClick={handleSubmitProof}
                  disabled={actionLoading || (screenshotList.length === 0 && !screenshotUrlInput.trim())}
                  className="rounded-xl font-bold text-xs bg-primary text-primary-foreground gap-2 px-6 shadow-md"
                >
                  {actionLoading ? (
                    <>
                      <div className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                      <span>Submitting Proof...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      <span>Submit Proof for Business Review</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Previously Submitted Proofs History */}
        {deliveryProofs.length > 0 && (
          <Card className="p-6 rounded-3xl border border-border/70 bg-card space-y-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5 text-primary" />
                <h3 className="text-base font-bold text-foreground">Submitted Deliverable Proofs</h3>
              </div>
              <span className="text-xs text-muted-foreground">{deliveryProofs.length} version(s)</span>
            </div>

            {/* Proof Versions Tabs/Selector */}
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

            {/* Selected Proof Details */}
            {selectedProof && (
              <div className="p-4 rounded-2xl border border-border/60 bg-muted/20 space-y-4">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Submitted: {new Date(selectedProof.submitted_at).toLocaleString()}</span>
                  {selectedProof.views_count !== null && (
                    <Badge variant="secondary" className="text-xs font-bold">
                      {selectedProof.views_count?.toLocaleString()} Views
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
                      className="block group rounded-xl overflow-hidden border border-border/80 bg-background aspect-video relative"
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
                    <span className="text-muted-foreground block">Published Post Link:</span>
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
                  <div className="text-xs">
                    <span className="text-muted-foreground block">Notes:</span>
                    <p className="text-foreground italic">{selectedProof.notes}</p>
                  </div>
                )}
              </div>
            )}
          </Card>
        )}

        {/* Campaign Brief & Materials */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Content (2 cols) */}
          <div className="md:col-span-2 space-y-6">
            {/* Promotion Brief */}
            <Card className="p-5 rounded-2xl border border-border/70 bg-card space-y-3">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-primary" />
                <span>Client Promotion Brief</span>
              </h3>
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                {order.promotion_brief}
              </p>
            </Card>

            {/* Creative Assets */}
            <Card className="p-5 rounded-2xl border border-border/70 bg-card space-y-3">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <ExternalLink className="h-3.5 w-3.5 text-primary" />
                <span>Provided Creative Assets / Links</span>
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
                  No external asset URLs provided. Use the text brief.
                </p>
              )}
            </Card>

            {/* Special Instructions */}
            {order.special_instructions && (
              <Card className="p-5 rounded-2xl border border-border/70 bg-card space-y-3">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                  Client Special Instructions
                </h3>
                <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                  {order.special_instructions}
                </p>
              </Card>
            )}

            {/* Audit Trail Log */}
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

          {/* Sidebar (1 col) */}
          <div className="space-y-6">
            {/* Target Community Info */}
            {order.community && (
              <Card className="p-5 rounded-2xl border border-border/70 bg-card space-y-3">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                  Target Community
                </h3>
                <span className="text-xs font-bold text-foreground block">{order.community.name}</span>
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
              </Card>
            )}

            {/* Package Deliverables */}
            {order.package && (
              <Card className="p-5 rounded-2xl border border-border/70 bg-card space-y-3">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                  Required Deliverables
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
          </div>
        </div>
      </div>

      {/* Decline Dialog Modal */}
      <Dialog open={declineDialogOpen} onOpenChange={setDeclineDialogOpen}>
        <DialogContent className="rounded-3xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Decline Promotion Order</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Please provide a reason for declining this order. The client will be notified and escrow refunded.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <Label className="text-xs font-bold">Decline Reason (Required)</Label>
            <Textarea
              placeholder="e.g. Schedule conflict, cannot broadcast within the requested timeframe."
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              rows={3}
              className="rounded-xl text-xs"
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeclineDialogOpen(false)}
              className="rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeclineOrder}
              disabled={actionLoading || declineReason.trim().length < 5}
              className="rounded-xl text-xs font-bold"
            >
              Confirm Decline
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
