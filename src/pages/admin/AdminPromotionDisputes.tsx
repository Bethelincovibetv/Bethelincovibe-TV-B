import { useState, useEffect, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import {
  Scale,
  ShieldAlert,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  ExternalLink,
  Eye,
  RefreshCw,
  Info,
  Calendar,
  Layers,
  ArrowUpDown,
  Check,
  RotateCcw,
  Sparkles,
  HelpCircle,
  AlertCircle,
  FileText,
  DollarSign,
  User,
  MessageSquare,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { PromotionOrder } from "@/services/promotionOrderService";
import { formatNaira } from "@/services/packageService";
import {
  getDisputedOrders,
  resolveOrderDispute,
} from "@/services/promotionReviewService";
import { PromotionOrderCollaboration } from "@/components/promoter/PromotionOrderCollaboration";
import { useAuth } from "@/contexts/AuthContext";

export default function AdminPromotionDisputes() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<PromotionOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"pending" | "resolved">("pending");

  // Arbitration modal state
  const [selectedOrder, setSelectedOrder] = useState<PromotionOrder | null>(null);
  const [arbitrationAction, setArbitrationAction] = useState<"release_to_promoter" | "refund_business" | null>(null);
  const [reason, setReason] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Detail inspection modal
  const [inspectOrder, setInspectOrder] = useState<PromotionOrder | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getDisputedOrders();
      setOrders(data);
    } catch (err) {
      console.error("Failed to load disputed orders:", err);
      toast.error("Failed to load disputed promotion orders.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const pendingDisputes = useMemo(() => {
    return orders.filter((o) => o.status === "disputed");
  }, [orders]);

  const resolvedDisputes = useMemo(() => {
    return orders.filter((o) => o.status !== "disputed" && (o as any).dispute_resolution);
  }, [orders]);

  const displayedOrders = useMemo(() => {
    const list = activeTab === "pending" ? pendingDisputes : resolvedDisputes;
    if (!searchTerm.trim()) return list;
    const q = searchTerm.toLowerCase();
    return list.filter(
      (o) =>
        o.order_reference?.toLowerCase().includes(q) ||
        o.package?.title?.toLowerCase().includes(q) ||
        o.dispute_reason?.toLowerCase().includes(q) ||
        o.promoter?.display_name?.toLowerCase().includes(q) ||
        o.business_user_id?.toLowerCase().includes(q)
    );
  }, [activeTab, pendingDisputes, resolvedDisputes, searchTerm]);

  const handleOpenArbitration = (order: PromotionOrder, action: "release_to_promoter" | "refund_business") => {
    setSelectedOrder(order);
    setArbitrationAction(action);
    setReason("");
    setAdminNotes("");
  };

  const handleExecuteArbitration = async () => {
    if (!selectedOrder || !arbitrationAction) return;

    if (!reason.trim() || reason.trim().length < 10) {
      toast.error("Please enter a detailed arbitration justification (minimum 10 characters).");
      return;
    }

    setSubmitting(true);
    try {
      const res = await resolveOrderDispute(
        {
          orderId: selectedOrder.id,
          resolution: arbitrationAction,
          reason: reason.trim(),
          adminNotes: adminNotes.trim(),
        },
        user?.id,
        "admin"
      );

      if (!res.ok) {
        toast.error(res.error || "Failed to execute dispute arbitration.");
        return;
      }

      if (arbitrationAction === "release_to_promoter") {
        toast.success(
          `Dispute resolved in promoter's favor! ₦${(res.order?.amount || selectedOrder.amount).toLocaleString()} escrow released & settled.`
        );
      } else {
        toast.success(
          `Dispute resolved in business's favor! ₦${(res.refundAmount || selectedOrder.amount).toLocaleString()} refunded to business wallet.`
        );
      }

      setSelectedOrder(null);
      setArbitrationAction(null);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred during arbitration.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl space-y-6">
      <Helmet>
        <title>Promotion Dispute Arbitration | Bethelincovibe Admin</title>
      </Helmet>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border/40 pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Scale className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-foreground tracking-tight">
                Promotion Dispute Arbitration
              </h1>
              <p className="text-xs text-muted-foreground">
                Review contested promotion deliverables, inspect evidence & arbitrate escrow releases
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={loading}
            className="rounded-xl text-xs font-bold gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh Queue
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="rounded-2xl border border-amber-500/20 bg-amber-500/5">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400 block">
                Pending Disputes
              </span>
              <span className="text-2xl font-extrabold text-foreground mt-1 block">
                {pendingDisputes.length}
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-600">
              <AlertTriangle className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-border/60 bg-card">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-muted-foreground block">
                Resolved Disputes
              </span>
              <span className="text-2xl font-extrabold text-foreground mt-1 block">
                {resolvedDisputes.length}
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-muted text-muted-foreground">
              <CheckCircle2 className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-border/60 bg-card">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-muted-foreground block">
                Escrow Held in Dispute
              </span>
              <span className="text-2xl font-extrabold text-foreground mt-1 block">
                {formatNaira(pendingDisputes.reduce((sum, o) => sum + (o.amount || 0), 0))}
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-primary/10 text-primary">
              <DollarSign className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Tabs
          value={activeTab}
          onValueChange={(val) => setActiveTab(val as "pending" | "resolved")}
          className="w-full sm:w-auto"
        >
          <TabsList className="grid grid-cols-2 rounded-xl p-1 bg-muted/60">
            <TabsTrigger value="pending" className="text-xs font-bold rounded-lg gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" />
              Pending ({pendingDisputes.length})
            </TabsTrigger>
            <TabsTrigger value="resolved" className="text-xs font-bold rounded-lg gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Resolved History ({resolvedDisputes.length})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search order ref, promoter..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 text-xs rounded-xl h-9"
          />
        </div>
      </div>

      {/* Disputes Table / List */}
      {loading ? (
        <Card className="p-12 text-center rounded-2xl border-dashed">
          <RefreshCw className="h-6 w-6 animate-spin text-primary mx-auto mb-2" />
          <p className="text-xs text-muted-foreground font-semibold">Loading dispute queue...</p>
        </Card>
      ) : displayedOrders.length === 0 ? (
        <Card className="p-12 text-center rounded-2xl border-dashed">
          <div className="h-12 w-12 rounded-2xl bg-muted/60 text-muted-foreground flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-bold text-foreground mb-1">
            {activeTab === "pending" ? "No Active Disputes" : "No Resolved Disputes"}
          </h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {activeTab === "pending"
              ? "Great news! There are currently no promotion campaigns held under contest."
              : "No dispute arbitrations have been recorded yet."}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {displayedOrders.map((order) => {
            const isResolved = order.status !== "disputed";
            const proofs = order.delivery_proofs || [];
            const disputeResolution = (order as any).dispute_resolution;

            return (
              <Card
                key={order.id}
                className="rounded-2xl border border-border/70 bg-card overflow-hidden hover:border-border transition-all"
              >
                <div className="p-5 space-y-4">
                  {/* Top Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border/40">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-xs font-bold text-foreground">
                        {order.order_reference}
                      </span>
                      <Badge
                        variant="outline"
                        className={`text-[11px] font-bold capitalize ${
                          order.status === "disputed"
                            ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                            : disputeResolution === "released_to_promoter"
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                            : "bg-red-500/10 text-red-600 border-red-500/20"
                        }`}
                      >
                        {order.status === "disputed"
                          ? "Under Dispute"
                          : disputeResolution === "released_to_promoter"
                          ? "Resolved: Released to Promoter"
                          : "Resolved: Refunded to Business"}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      <span>
                        Disputed on{" "}
                        {order.disputed_at
                          ? new Date(order.disputed_at).toLocaleDateString()
                          : new Date(order.updated_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Body Info */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    {/* Column 1: Financial & Campaign */}
                    <div className="space-y-1.5 bg-muted/30 p-3.5 rounded-xl border border-border/40">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                        Campaign & Escrow
                      </span>
                      <p className="font-bold text-foreground text-sm">
                        {order.package?.title || "Promotion Campaign"}
                      </p>
                      <div className="flex items-center gap-2 pt-1">
                        <span className="text-base font-extrabold text-foreground">
                          {formatNaira(order.amount)}
                        </span>
                        <span className="text-[11px] text-muted-foreground">Escrow Locked</span>
                      </div>
                    </div>

                    {/* Column 2: Parties */}
                    <div className="space-y-1.5 bg-muted/30 p-3.5 rounded-xl border border-border/40">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                        Parties Involved
                      </span>
                      <p className="text-muted-foreground">
                        <strong className="text-foreground">Promoter:</strong>{" "}
                        {order.promoter?.display_name || order.promoter_id}
                      </p>
                      <p className="text-muted-foreground truncate">
                        <strong className="text-foreground">Business User:</strong>{" "}
                        {order.business_user_id}
                      </p>
                    </div>

                    {/* Column 3: Evidence Summary */}
                    <div className="space-y-1.5 bg-muted/30 p-3.5 rounded-xl border border-border/40">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                        Deliverable Proofs
                      </span>
                      <p className="text-muted-foreground">
                        <strong className="text-foreground">Submitted Proofs:</strong>{" "}
                        {proofs.length} item{proofs.length !== 1 ? "s" : ""} (Version{" "}
                        {order.proof_version || 1})
                      </p>
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => setInspectOrder(order)}
                        className="p-0 h-auto text-xs font-bold text-primary gap-1"
                      >
                        <Eye className="h-3.5 w-3.5" /> Inspect Evidence & Brief
                      </Button>
                    </div>
                  </div>

                  {/* Dispute Reason Box */}
                  <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-3.5">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                      <div>
                        <span className="text-xs font-bold text-destructive block">
                          Contest / Dispute Reason Given by Business:
                        </span>
                        <p className="text-xs text-foreground/90 mt-1 leading-relaxed">
                          "{order.dispute_reason || "No explicit dispute reason logged."}"
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Resolution Notes (if resolved) */}
                  {isResolved && (order as any).dispute_resolution_reason && (
                    <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3.5 text-xs space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Admin Arbitration Decision:</span>
                      </div>
                      <p className="text-muted-foreground">
                        "{(order as any).dispute_resolution_reason}"
                      </p>
                      {(order as any).refund_reference && (
                        <p className="font-mono text-[11px] text-muted-foreground pt-1">
                          Refund Ref: {(order as any).refund_reference}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Action Buttons */}
                  {!isResolved && (
                    <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setInspectOrder(order)}
                        className="rounded-xl text-xs font-bold gap-1.5"
                      >
                        <FileText className="h-3.5 w-3.5" /> Full Audit Details
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenArbitration(order, "refund_business")}
                        className="rounded-xl text-xs font-bold text-destructive border-destructive/30 hover:bg-destructive/10 gap-1.5"
                      >
                        <RotateCcw className="h-3.5 w-3.5" /> Uphold Dispute & Refund Business
                      </Button>

                      <Button
                        size="sm"
                        onClick={() => handleOpenArbitration(order, "release_to_promoter")}
                        className="rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                      >
                        <Check className="h-3.5 w-3.5" /> Uphold Delivery & Release to Promoter
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Arbitration Modal Dialog */}
      {selectedOrder && arbitrationAction && (
        <Dialog
          open={!!selectedOrder}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedOrder(null);
              setArbitrationAction(null);
            }
          }}
        >
          <DialogContent className="sm:max-w-lg rounded-3xl p-6">
            <DialogHeader className="space-y-2">
              <div className="flex items-center gap-2">
                <div
                  className={`p-2 rounded-xl ${
                    arbitrationAction === "release_to_promoter"
                      ? "bg-emerald-500/10 text-emerald-600"
                      : "bg-destructive/10 text-destructive"
                  }`}
                >
                  <Scale className="h-5 w-5" />
                </div>
                <DialogTitle className="text-lg font-bold">
                  {arbitrationAction === "release_to_promoter"
                    ? "Arbitrate: Release Escrow to Promoter"
                    : "Arbitrate: Refund Business & Cancel Order"}
                </DialogTitle>
              </div>
              <DialogDescription className="text-xs text-muted-foreground">
                Order Reference: <strong className="text-foreground">{selectedOrder.order_reference}</strong> • Amount:{" "}
                <strong className="text-foreground">{formatNaira(selectedOrder.amount)}</strong>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div
                className={`p-3.5 rounded-2xl border text-xs leading-relaxed ${
                  arbitrationAction === "release_to_promoter"
                    ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-900 dark:text-emerald-200"
                    : "bg-destructive/5 border-destructive/20 text-destructive-900 dark:text-destructive-200"
                }`}
              >
                {arbitrationAction === "release_to_promoter" ? (
                  <p>
                    <strong>Action Summary:</strong> This decision upholds the promoter's delivery.
                    The order will transition to <em>approved</em> and immediately trigger escrow settlement, crediting the promoter's wallet with their net earnings minus the 10% platform fee.
                  </p>
                ) : (
                  <p>
                    <strong>Action Summary:</strong> This decision upholds the business's contestation.
                    The order will be <em>cancelled</em> and a 100% full refund (
                    {formatNaira(selectedOrder.amount)}) will be credited to the business user's wallet with an immutable ledger entry.
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">
                  Arbitration Justification / Reason <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  placeholder="Explain the arbitration decision (minimum 10 characters)..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="rounded-xl text-xs min-h-[90px]"
                />
                <span className="text-[11px] text-muted-foreground">
                  Visible in audit trail and notified to both parties.
                </span>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Internal Admin Notes (Optional)</Label>
                <Input
                  placeholder="Any private notes for Bethelincovibe compliance team..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="rounded-xl text-xs h-9"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedOrder(null)}
                disabled={submitting}
                className="rounded-xl text-xs font-bold"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleExecuteArbitration}
                disabled={submitting || reason.trim().length < 10}
                className={`rounded-xl text-xs font-bold ${
                  arbitrationAction === "release_to_promoter"
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                    : "bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                }`}
              >
                {submitting ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1.5" />
                ) : arbitrationAction === "release_to_promoter" ? (
                  <Check className="h-3.5 w-3.5 mr-1.5" />
                ) : (
                  <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                )}
                Confirm Arbitration Decision
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Evidence & Brief Inspection Dialog */}
      {inspectOrder && (
        <Dialog open={!!inspectOrder} onOpenChange={(open) => !open && setInspectOrder(null)}>
          <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl p-6">
            <DialogHeader className="space-y-1">
              <DialogTitle className="text-lg font-bold">
                Order Evidence & Audit Inspection
              </DialogTitle>
              <DialogDescription className="text-xs font-mono text-muted-foreground">
                {inspectOrder.order_reference} • Status: {inspectOrder.status}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 py-3 text-xs">
              {/* Campaign Brief */}
              <div className="space-y-1.5">
                <span className="font-bold text-foreground block">Promotion Brief & Assets</span>
                <div className="p-3 bg-muted/40 rounded-xl border border-border/40 space-y-2">
                  <p className="whitespace-pre-wrap">{inspectOrder.promotion_brief}</p>
                  {inspectOrder.special_instructions && (
                    <div className="pt-2 border-t border-border/40 text-muted-foreground">
                      <strong className="text-foreground">Special Instructions:</strong>{" "}
                      {inspectOrder.special_instructions}
                    </div>
                  )}
                  {inspectOrder.creative_assets_urls && inspectOrder.creative_assets_urls.length > 0 && (
                    <div className="pt-2 border-t border-border/40 space-y-1">
                      <strong className="text-foreground block">Asset Links:</strong>
                      <div className="flex flex-wrap gap-2">
                        {inspectOrder.creative_assets_urls.map((url, idx) => (
                          <a
                            key={idx}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary underline flex items-center gap-1 font-semibold"
                          >
                            <ExternalLink className="h-3 w-3" /> Asset #{idx + 1}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Delivery Proofs */}
              <div className="space-y-2">
                <span className="font-bold text-foreground block">
                  Delivery Proof Submissions (Version {inspectOrder.proof_version || 1})
                </span>
                {(!inspectOrder.delivery_proofs || inspectOrder.delivery_proofs.length === 0) ? (
                  <p className="text-muted-foreground italic bg-muted/30 p-3 rounded-xl">
                    No proofs currently attached.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {inspectOrder.delivery_proofs.map((proof, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-muted/30 rounded-xl border border-border/40 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-foreground">
                            Proof Item #{idx + 1} ({proof.proof_type})
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {new Date(proof.submitted_at || Date.now()).toLocaleString()}
                          </span>
                        </div>
                        {proof.metrics && (
                          <div className="grid grid-cols-2 gap-2 text-muted-foreground bg-card p-2 rounded-lg border border-border/40">
                            <div>Views: <strong className="text-foreground">{proof.metrics.view_count || "N/A"}</strong></div>
                            <div>Duration: <strong className="text-foreground">{proof.metrics.duration_hours || "N/A"}h</strong></div>
                          </div>
                        )}
                        {proof.notes && <p className="text-muted-foreground">"{proof.notes}"</p>}
                        {proof.file_url && (
                          <a
                            href={proof.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary font-bold inline-flex items-center gap-1"
                          >
                            <ExternalLink className="h-3 w-3" /> View Submitted Proof Media
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* In-Order Collaboration History */}
              <div className="space-y-1.5 pt-2">
                <span className="font-bold text-foreground block">
                  Order Collaboration & Communication Log
                </span>
                <PromotionOrderCollaboration
                  order={inspectOrder}
                  currentUserId={user?.id}
                  userRole="admin"
                />
              </div>

              {/* Dispute Reason */}
              <div className="space-y-1.5">
                <span className="font-bold text-destructive block">Contestation Reason</span>
                <p className="p-3 bg-destructive/10 border border-destructive/20 text-destructive-900 dark:text-destructive-200 rounded-xl">
                  {inspectOrder.dispute_reason || "None recorded."}
                </p>
              </div>

              {/* Audit Trail */}
              {inspectOrder.audit_trail && inspectOrder.audit_trail.length > 0 && (
                <div className="space-y-1.5">
                  <span className="font-bold text-foreground block">Order Timeline & Audit History</span>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto p-3 bg-muted/30 rounded-xl border border-border/40">
                    {inspectOrder.audit_trail.map((ev, idx) => (
                      <div key={idx} className="text-[11px] pb-1.5 border-b border-border/30 last:border-0 space-y-0.5">
                        <div className="flex items-center justify-between text-muted-foreground">
                          <span className="font-semibold text-foreground capitalize">
                            {ev.event_type?.replace(/_/g, " ")} ({ev.role})
                          </span>
                          <span>{new Date(ev.timestamp).toLocaleString()}</span>
                        </div>
                        <p className="text-muted-foreground">{ev.details}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setInspectOrder(null)}
                className="rounded-xl text-xs font-bold"
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
