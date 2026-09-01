import { useState, useEffect, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import {
  Landmark,
  DollarSign,
  TrendingUp,
  ShieldCheck,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  Filter,
  RefreshCw,
  Download,
  Eye,
  FileSpreadsheet,
  ArrowUpDown,
  Building,
  CreditCard,
  User,
  Layers,
  Sparkles,
  HelpCircle,
  Check,
  RotateCcw,
  ExternalLink,
  ShieldAlert,
  Calendar,
  Percent,
  Wallet,
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
import { useAuth } from "@/contexts/AuthContext";
import {
  getPlatformTreasurySummary,
  getAllPayoutRequests,
  adminProcessPayout,
  reconcileFinancialRecord,
  PlatformTreasurySummary,
  PayoutRequest,
  FinancialReconciliationReport,
  PayoutStatus,
} from "@/services/promotionSettlementService";
import {
  PromotionOrder,
  getMyBusinessOrders,
} from "@/services/promotionOrderService";
import { formatNaira } from "@/services/packageService";

export default function AdminPromotionTreasury() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<PlatformTreasurySummary | null>(null);
  const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
  const [orders, setOrders] = useState<PromotionOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filter & Search states
  const [activeTab, setActiveTab] = useState<"payouts" | "escrow" | "reconciliation">("payouts");
  const [payoutStatusFilter, setPayoutStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Payout action modal state
  const [selectedPayout, setSelectedPayout] = useState<PayoutRequest | null>(null);
  const [payoutAction, setPayoutAction] = useState<"complete" | "fail" | "execute" | null>(null);
  const [providerRef, setProviderRef] = useState("");
  const [failureReason, setFailureReason] = useState("");
  const [processingAction, setProcessingAction] = useState(false);

  // Detail view modal
  const [viewPayoutDetail, setViewPayoutDetail] = useState<PayoutRequest | null>(null);

  // Reconciliation state
  const [reconcileOrderId, setReconcileOrderId] = useState("");
  const [activeReconciliation, setActiveReconciliation] = useState<FinancialReconciliationReport | null>(null);
  const [batchReports, setBatchReports] = useState<FinancialReconciliationReport[]>([]);
  const [runningBatch, setRunningBatch] = useState(false);

  const loadData = async () => {
    try {
      setRefreshing(true);
      // 1. Fetch platform treasury metrics
      const { summary: treasurySummary, error: summaryErr } = await getPlatformTreasurySummary(
        user?.id,
        "admin"
      );
      if (summaryErr) {
        toast.error(summaryErr);
      } else {
        setSummary(treasurySummary);
      }

      // 2. Fetch all payout requests
      const { payouts: allPayouts, error: payoutsErr } = await getAllPayoutRequests(
        "all",
        user?.id,
        "admin"
      );
      if (payoutsErr) {
        toast.error(payoutsErr);
      } else {
        setPayouts(allPayouts);
      }

      // 3. Fetch all orders from storage for escrow and reconciliation ledger
      try {
        const storedOrders = localStorage.getItem("bincovibe_promotion_orders_all");
        if (storedOrders) {
          setOrders(JSON.parse(storedOrders));
        }
      } catch (err) {
        console.warn("Could not load local orders:", err);
      }
    } catch (err: any) {
      console.error("Failed to load treasury data:", err);
      toast.error("Failed to load treasury data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered payouts
  const filteredPayouts = useMemo(() => {
    return payouts.filter((p) => {
      const matchesStatus =
        payoutStatusFilter === "all" || p.status === payoutStatusFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        p.payout_reference?.toLowerCase().includes(q) ||
        p.bank_name?.toLowerCase().includes(q) ||
        p.account_number?.includes(q) ||
        p.account_name?.toLowerCase().includes(q) ||
        p.user_id?.toLowerCase().includes(q);

      return matchesStatus && matchesSearch;
    });
  }, [payouts, payoutStatusFilter, searchQuery]);

  // Active Escrow Orders
  const activeEscrowOrders = useMemo(() => {
    const escrowStatuses = [
      "paid_escrow",
      "in_progress",
      "evidence_submitted",
      "revision_requested",
      "disputed",
    ];
    return orders.filter((o) => {
      const inEscrow = escrowStatuses.includes(o.status);
      if (!inEscrow) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        o.order_reference?.toLowerCase().includes(q) ||
        o.business_user_id?.toLowerCase().includes(q) ||
        o.promoter_id?.toLowerCase().includes(q) ||
        o.package?.title?.toLowerCase().includes(q)
      );
    });
  }, [orders, searchQuery]);

  // Handle Admin Payout Action Execution
  const handleExecutePayoutAction = async () => {
    if (!selectedPayout || !payoutAction) return;

    setProcessingAction(true);
    try {
      if (payoutAction === "complete") {
        if (!providerRef.trim()) {
          toast.error("Please provide the provider bank transfer reference code.");
          setProcessingAction(false);
          return;
        }
        const res = await adminProcessPayout(
          selectedPayout.id,
          "complete",
          { providerRef: providerRef.trim(), adminId: user?.id },
          user?.id,
          "admin"
        );
        if (res.error) {
          toast.error(res.error);
        } else {
          toast.success(
            `Payout #${selectedPayout.payout_reference} marked as PAID and disbursed.`
          );
          setSelectedPayout(null);
          setPayoutAction(null);
          setProviderRef("");
          loadData();
        }
      } else if (payoutAction === "fail") {
        if (!failureReason.trim() || failureReason.trim().length < 5) {
          toast.error("Please provide a valid failure reason (min 5 characters).");
          setProcessingAction(false);
          return;
        }
        const res = await adminProcessPayout(
          selectedPayout.id,
          "fail",
          { failureReason: failureReason.trim(), adminId: user?.id },
          user?.id,
          "admin"
        );
        if (res.error) {
          toast.error(res.error);
        } else {
          toast.success(
            `Payout #${selectedPayout.payout_reference} marked as FAILED. Reserved funds refunded to promoter wallet.`
          );
          setSelectedPayout(null);
          setPayoutAction(null);
          setFailureReason("");
          loadData();
        }
      } else if (payoutAction === "execute") {
        // Transition to processing / in-flight
        const updatedPayouts = [...payouts];
        const idx = updatedPayouts.findIndex((p) => p.id === selectedPayout.id);
        if (idx >= 0) {
          updatedPayouts[idx].status = "processing";
          updatedPayouts[idx].processed_at = new Date().toISOString();
          localStorage.setItem(
            "bincovibe_promoter_payouts_all",
            JSON.stringify(updatedPayouts)
          );
        }
        toast.success(`Payout #${selectedPayout.payout_reference} is now IN PROCESSING.`);
        setSelectedPayout(null);
        setPayoutAction(null);
        loadData();
      }
    } catch (err: any) {
      console.error("Payout action failed:", err);
      toast.error(err?.message || "Failed to process payout action.");
    } finally {
      setProcessingAction(false);
    }
  };

  // Run single order financial reconciliation
  const handleRunReconciliation = (orderId: string) => {
    if (!orderId) {
      toast.error("Please select or enter an Order ID.");
      return;
    }
    const report = reconcileFinancialRecord(orderId);
    setActiveReconciliation(report);
    if (report.reconciliationPassed) {
      toast.success(`Order #${report.orderReference} passed financial reconciliation!`);
    } else {
      toast.warning(`Reconciliation issue detected for Order #${report.orderReference}.`);
    }
  };

  // Run Batch Reconciliation across all promotion orders
  const handleRunBatchReconciliation = () => {
    setRunningBatch(true);
    try {
      const reports = orders.map((o) => reconcileFinancialRecord(o.id));
      setBatchReports(reports);
      const passedCount = reports.filter((r) => r.reconciliationPassed).length;
      toast.success(
        `Batch reconciliation complete: ${passedCount}/${reports.length} orders passed!`
      );
    } catch (err) {
      console.error("Batch reconciliation error:", err);
      toast.error("Failed to execute batch reconciliation.");
    } finally {
      setRunningBatch(false);
    }
  };

  // Export CSV Report
  const handleExportCSV = () => {
    try {
      const rows = [
        [
          "Payout Reference",
          "Promoter User ID",
          "Amount (NGN)",
          "Bank Name",
          "Account Number",
          "Account Name",
          "Status",
          "Requested At",
          "Processed At",
          "Paid At",
          "Provider Reference",
          "Failure Reason",
        ],
        ...payouts.map((p) => [
          p.payout_reference,
          p.user_id,
          p.amount,
          p.bank_name,
          `'${p.account_number}`,
          p.account_name,
          p.status,
          p.requested_at || p.created_at,
          p.processed_at || "",
          p.paid_at || "",
          p.provider_reference || "",
          p.failure_reason || "",
        ]),
      ];

      const csvContent =
        "data:text/csv;charset=utf-8," +
        rows.map((e) => e.map((val) => `"${val}"`).join(",")).join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute(
        "download",
        `platform_promotion_treasury_${new Date().toISOString().slice(0, 10)}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Treasury CSV report exported successfully.");
    } catch (err) {
      toast.error("Failed to export CSV report.");
    }
  };

  const getStatusBadge = (status: PayoutStatus) => {
    switch (status) {
      case "requested":
      case "pending":
        return (
          <Badge
            variant="outline"
            className="bg-amber-500/10 text-amber-600 border-amber-500/30 flex items-center gap-1 font-semibold"
          >
            <Clock className="h-3 w-3" />
            Requested
          </Badge>
        );
      case "processing":
        return (
          <Badge
            variant="outline"
            className="bg-blue-500/10 text-blue-600 border-blue-500/30 flex items-center gap-1 font-semibold"
          >
            <RotateCcw className="h-3 w-3 animate-spin" />
            In-Flight
          </Badge>
        );
      case "paid":
        return (
          <Badge
            variant="outline"
            className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 flex items-center gap-1 font-semibold"
          >
            <CheckCircle2 className="h-3 w-3" />
            Paid / Disbursed
          </Badge>
        );
      case "failed":
        return (
          <Badge
            variant="outline"
            className="bg-rose-500/10 text-rose-600 border-rose-500/30 flex items-center gap-1 font-semibold"
          >
            <XCircle className="h-3 w-3" />
            Failed / Refunded
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-8 p-4 md:p-8 max-w-7xl mx-auto pb-24">
      <Helmet>
        <title>Promotion Treasury & Escrow Ledger | Admin Hub</title>
      </Helmet>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/50 pb-6">
        <div>
          <div className="flex items-center gap-2 text-primary font-bold text-sm tracking-wider uppercase">
            <Landmark className="h-4 w-4" />
            Administrative Financial Gateway
          </div>
          <h1 className="text-3xl font-black tracking-tight text-foreground mt-1">
            Promotion Treasury & Escrow Ledger
          </h1>
          <p className="text-muted-foreground text-sm mt-1 max-w-2xl">
            Authoritative platform GMV, platform commission ledger, active promotion escrow
            custody, and promoter bank withdrawal disbursements.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="flex items-center gap-2 border-border/60 hover:bg-muted/50"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          <Button
            size="sm"
            onClick={loadData}
            disabled={refreshing}
            className="flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh Ledger
          </Button>
        </div>
      </div>

      {/* Primary Financial Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Total GMV */}
        <Card className="border-border/60 bg-gradient-to-br from-card to-card/80 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl -mr-8 -mt-8" />
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              Gross Merch. (GMV)
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardDescription>
            <CardTitle className="text-2xl font-black text-foreground">
              {formatNaira(summary?.totalGmv || 0)}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-muted-foreground">
            {summary?.ordersBreakdown.totalCount || 0} Total Orders Placed
          </CardContent>
        </Card>

        {/* Platform Commissions */}
        <Card className="border-border/60 bg-gradient-to-br from-card to-card/80 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl -mr-8 -mt-8" />
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              Platform Revenue (10%)
              <Percent className="h-4 w-4 text-emerald-500" />
            </CardDescription>
            <CardTitle className="text-2xl font-black text-emerald-600">
              {formatNaira(summary?.totalPlatformCommission || 0)}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-muted-foreground">
            Earned Platform Commission
          </CardContent>
        </Card>

        {/* Active Escrow Custody */}
        <Card className="border-border/60 bg-gradient-to-br from-card to-card/80 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl -mr-8 -mt-8" />
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              Active Escrow Custody
              <ShieldCheck className="h-4 w-4 text-blue-500" />
            </CardDescription>
            <CardTitle className="text-2xl font-black text-blue-600">
              {formatNaira(summary?.activeEscrowBalance || 0)}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-muted-foreground">
            Locked in Active Campaigns
          </CardContent>
        </Card>

        {/* Disbursed Payouts */}
        <Card className="border-border/60 bg-gradient-to-br from-card to-card/80 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl -mr-8 -mt-8" />
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              Disbursed Payouts
              <CreditCard className="h-4 w-4 text-purple-500" />
            </CardDescription>
            <CardTitle className="text-2xl font-black text-purple-600">
              {formatNaira(summary?.totalPayoutsDisbursed || 0)}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-muted-foreground">
            {summary?.payoutsBreakdown.paid || 0} Successful Bank Payouts
          </CardContent>
        </Card>

        {/* Pending Payouts */}
        <Card className="border-border/60 bg-gradient-to-br from-card to-card/80 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl -mr-8 -mt-8" />
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              Pending Withdrawals
              <Clock className="h-4 w-4 text-amber-500" />
            </CardDescription>
            <CardTitle className="text-2xl font-black text-amber-600">
              {formatNaira(summary?.totalPendingPayouts || 0)}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-muted-foreground">
            {(summary?.payoutsBreakdown.requested || 0) + (summary?.payoutsBreakdown.processing || 0)} In-Flight Requests
          </CardContent>
        </Card>

        {/* Failed / Refunded Payouts */}
        <Card className="border-border/60 bg-gradient-to-br from-card to-card/80 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-2xl -mr-8 -mt-8" />
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              Failed Payouts
              <ShieldAlert className="h-4 w-4 text-rose-500" />
            </CardDescription>
            <CardTitle className="text-2xl font-black text-rose-600">
              {formatNaira(summary?.totalFailedPayouts || 0)}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-muted-foreground">
            {summary?.payoutsBreakdown.failed || 0} Returned to Wallets
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs Workspace */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as any)}
        className="space-y-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <TabsList className="bg-muted/60 p-1 border border-border/50">
            <TabsTrigger value="payouts" className="flex items-center gap-2">
              <Landmark className="h-4 w-4" />
              Promoter Payouts ({payouts.length})
            </TabsTrigger>
            <TabsTrigger value="escrow" className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              Escrow Custody ({activeEscrowOrders.length})
            </TabsTrigger>
            <TabsTrigger value="reconciliation" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Financial Auditor & Invariant Engine
            </TabsTrigger>
          </TabsList>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search reference, promoter, bank..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-card text-sm"
            />
          </div>
        </div>

        {/* TAB 1: PROMOTER PAYOUTS MANAGEMENT */}
        <TabsContent value="payouts" className="space-y-4">
          {/* Subfilter chips */}
          <div className="flex flex-wrap items-center gap-2 pb-2">
            <Button
              variant={payoutStatusFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setPayoutStatusFilter("all")}
              className="text-xs h-8"
            >
              All Payouts ({payouts.length})
            </Button>
            <Button
              variant={payoutStatusFilter === "requested" ? "default" : "outline"}
              size="sm"
              onClick={() => setPayoutStatusFilter("requested")}
              className="text-xs h-8 text-amber-600"
            >
              Requested ({summary?.payoutsBreakdown.requested || 0})
            </Button>
            <Button
              variant={payoutStatusFilter === "processing" ? "default" : "outline"}
              size="sm"
              onClick={() => setPayoutStatusFilter("processing")}
              className="text-xs h-8 text-blue-600"
            >
              In Processing ({summary?.payoutsBreakdown.processing || 0})
            </Button>
            <Button
              variant={payoutStatusFilter === "paid" ? "default" : "outline"}
              size="sm"
              onClick={() => setPayoutStatusFilter("paid")}
              className="text-xs h-8 text-emerald-600"
            >
              Paid / Disbursed ({summary?.payoutsBreakdown.paid || 0})
            </Button>
            <Button
              variant={payoutStatusFilter === "failed" ? "default" : "outline"}
              size="sm"
              onClick={() => setPayoutStatusFilter("failed")}
              className="text-xs h-8 text-rose-600"
            >
              Failed ({summary?.payoutsBreakdown.failed || 0})
            </Button>
          </div>

          {/* Payouts Table Card */}
          <Card className="border-border/60 overflow-hidden shadow-sm">
            <CardHeader className="bg-muted/30 border-b border-border/40 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold">
                    Promoter Bank Withdrawal Requests
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Review and disburse verified earnings to promoter Nigerian bank accounts.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="font-mono text-xs">
                  {filteredPayouts.length} record(s)
                </Badge>
              </div>
            </CardHeader>

            <div className="overflow-x-auto">
              {loading ? (
                <div className="p-12 text-center text-muted-foreground flex flex-col items-center gap-3">
                  <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                  <p className="text-sm">Loading promoter payout ledger...</p>
                </div>
              ) : filteredPayouts.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground">
                  <Landmark className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="font-semibold text-foreground">No payout requests found</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {searchQuery
                      ? "No records match your search criteria."
                      : "When promoters request withdrawals from their wallet balance, they will appear here."}
                  </p>
                </div>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/40 text-muted-foreground text-xs uppercase font-semibold border-b border-border/40">
                    <tr>
                      <th className="p-3.5 pl-4">Payout Reference</th>
                      <th className="p-3.5">Promoter</th>
                      <th className="p-3.5">Bank Details</th>
                      <th className="p-3.5">Amount</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5">Requested At</th>
                      <th className="p-3.5 pr-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30 font-normal">
                    {filteredPayouts.map((p) => (
                      <tr
                        key={p.id}
                        className="hover:bg-muted/20 transition-colors"
                      >
                        <td className="p-3.5 pl-4 font-mono font-bold text-xs text-foreground">
                          {p.payout_reference}
                        </td>
                        <td className="p-3.5">
                          <div className="flex items-center gap-1.5 text-xs text-foreground font-medium">
                            <User className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="truncate max-w-[120px]">
                              {p.user_id}
                            </span>
                          </div>
                        </td>
                        <td className="p-3.5">
                          <div className="text-xs">
                            <div className="font-semibold text-foreground flex items-center gap-1">
                              <Building className="h-3 w-3 text-muted-foreground" />
                              {p.bank_name}
                            </div>
                            <div className="font-mono text-muted-foreground text-[11px]">
                              {p.account_number} • {p.account_name}
                            </div>
                          </div>
                        </td>
                        <td className="p-3.5 font-bold text-foreground">
                          {formatNaira(p.amount)}
                        </td>
                        <td className="p-3.5">{getStatusBadge(p.status)}</td>
                        <td className="p-3.5 text-xs text-muted-foreground">
                          {new Date(p.requested_at || p.created_at).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="p-3.5 pr-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setViewPayoutDetail(p)}
                              className="h-8 px-2 text-xs"
                              title="Inspect Details"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>

                            {p.status === "requested" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedPayout(p);
                                  setPayoutAction("execute");
                                }}
                                className="h-8 px-2.5 text-xs text-blue-600 border-blue-500/30 hover:bg-blue-500/10"
                              >
                                Mark In-Flight
                              </Button>
                            )}

                            {(p.status === "requested" || p.status === "processing") && (
                              <>
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedPayout(p);
                                    setPayoutAction("complete");
                                    setProviderRef(`PAYSTACK_TRF_${Date.now()}`);
                                  }}
                                  className="h-8 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                                >
                                  <Check className="h-3.5 w-3.5 mr-1" />
                                  Mark Paid
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedPayout(p);
                                    setPayoutAction("fail");
                                    setFailureReason("");
                                  }}
                                  className="h-8 px-2.5 text-xs text-rose-600 border-rose-500/30 hover:bg-rose-500/10"
                                >
                                  <XCircle className="h-3.5 w-3.5 mr-1" />
                                  Reject / Fail
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </Card>
        </TabsContent>

        {/* TAB 2: ACTIVE ESCROW CUSTODY LEDGER */}
        <TabsContent value="escrow" className="space-y-4">
          <Card className="border-border/60 overflow-hidden shadow-sm">
            <CardHeader className="bg-muted/30 border-b border-border/40 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold">
                    Active Promotion Orders in Custody
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Escrow funds safely held in platform custody awaiting campaign proof approval or dispute resolution.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30 font-bold">
                  {formatNaira(summary?.activeEscrowBalance || 0)} Locked
                </Badge>
              </div>
            </CardHeader>

            <div className="overflow-x-auto">
              {activeEscrowOrders.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground">
                  <ShieldCheck className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="font-semibold text-foreground">No active orders in escrow</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    All paid promotion campaigns have either completed and settled, or refunded.
                  </p>
                </div>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/40 text-muted-foreground text-xs uppercase font-semibold border-b border-border/40">
                    <tr>
                      <th className="p-3.5 pl-4">Order Reference</th>
                      <th className="p-3.5">Buyer User ID</th>
                      <th className="p-3.5">Package</th>
                      <th className="p-3.5">Gross (100%)</th>
                      <th className="p-3.5">Platform Fee (10%)</th>
                      <th className="p-3.5">Promoter Net (90%)</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 pr-4 text-right">Audit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30 font-normal">
                    {activeEscrowOrders.map((o) => (
                      <tr key={o.id} className="hover:bg-muted/20 transition-colors">
                        <td className="p-3.5 pl-4 font-mono font-bold text-xs text-foreground">
                          {o.order_reference}
                        </td>
                        <td className="p-3.5 text-xs text-muted-foreground font-mono truncate max-w-[120px]">
                          {o.business_user_id}
                        </td>
                        <td className="p-3.5 text-xs font-medium text-foreground">
                          {o.package?.title || "Promotion Package"}
                        </td>
                        <td className="p-3.5 font-bold text-foreground">
                          {formatNaira(o.amount)}
                        </td>
                        <td className="p-3.5 font-semibold text-emerald-600">
                          {formatNaira(o.platform_fee || o.amount * 0.1)}
                        </td>
                        <td className="p-3.5 font-semibold text-blue-600">
                          {formatNaira(o.promoter_net_earning || o.amount * 0.9)}
                        </td>
                        <td className="p-3.5">
                          <Badge variant="outline" className="uppercase text-[10px] font-bold">
                            {o.status.replace("_", " ")}
                          </Badge>
                        </td>
                        <td className="p-3.5 pr-4 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setActiveTab("reconciliation");
                              setReconcileOrderId(o.id);
                              handleRunReconciliation(o.id);
                            }}
                            className="h-7 px-2.5 text-xs border-primary/30 text-primary hover:bg-primary/10"
                          >
                            <Sparkles className="h-3 w-3 mr-1" />
                            Reconcile
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </Card>
        </TabsContent>

        {/* TAB 3: FINANCIAL RECONCILIATION AUDITOR */}
        <TabsContent value="reconciliation" className="space-y-6">
          {/* Tool Card */}
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="bg-muted/30 border-b border-border/40 p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Double-Entry Financial Invariant Verifier
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Mathematically guarantees that Gross = Platform Fee + Promoter Net, and confirms wallet ledger audit balance.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRunBatchReconciliation}
                    disabled={runningBatch}
                    className="flex items-center gap-1.5 text-xs h-8"
                  >
                    <Layers className={`h-3.5 w-3.5 ${runningBatch ? "animate-spin" : ""}`} />
                    Audit All Orders ({orders.length})
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-4">
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="relative flex-1 w-full">
                  <Input
                    placeholder="Enter Order ID or Order Reference to audit..."
                    value={reconcileOrderId}
                    onChange={(e) => setReconcileOrderId(e.target.value)}
                    className="font-mono text-sm"
                  />
                </div>
                <Button
                  onClick={() => handleRunReconciliation(reconcileOrderId)}
                  disabled={!reconcileOrderId.trim()}
                  className="w-full sm:w-auto"
                >
                  Verify Invariant
                </Button>
              </div>

              {/* Single Report Output */}
              {activeReconciliation && (
                <div className="mt-6 border border-border/60 rounded-xl p-5 bg-card space-y-4">
                  <div className="flex items-center justify-between border-b border-border/40 pb-3">
                    <div>
                      <h4 className="font-bold text-base text-foreground flex items-center gap-2">
                        Audit Report: #{activeReconciliation.orderReference}
                      </h4>
                      <p className="text-xs font-mono text-muted-foreground">
                        Order ID: {activeReconciliation.orderId}
                      </p>
                    </div>
                    {activeReconciliation.reconciliationPassed ? (
                      <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-xs px-3 py-1 font-bold">
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                        Reconciliation Passed
                      </Badge>
                    ) : (
                      <Badge className="bg-rose-500/10 text-rose-600 border-rose-500/30 text-xs px-3 py-1 font-bold">
                        <AlertTriangle className="h-3.5 w-3.5 mr-1" />
                        Discrepancy Found
                      </Badge>
                    )}
                  </div>

                  {/* Mathematical Formula Verification */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-3.5 bg-muted/40 rounded-lg">
                      <p className="text-xs text-muted-foreground font-semibold uppercase">Gross Amount</p>
                      <p className="text-lg font-black text-foreground">{formatNaira(activeReconciliation.grossAmount)}</p>
                    </div>
                    <div className="p-3.5 bg-muted/40 rounded-lg">
                      <p className="text-xs text-muted-foreground font-semibold uppercase">Platform Fee (10%)</p>
                      <p className="text-lg font-black text-emerald-600">{formatNaira(activeReconciliation.platformFee)}</p>
                    </div>
                    <div className="p-3.5 bg-muted/40 rounded-lg">
                      <p className="text-xs text-muted-foreground font-semibold uppercase">Promoter Net (90%)</p>
                      <p className="text-lg font-black text-blue-600">{formatNaira(activeReconciliation.promoterNetAmount)}</p>
                    </div>
                  </div>

                  {/* Invariant Checks Checklist */}
                  <div className="space-y-2 pt-2 text-xs">
                    <div className="flex items-center gap-2">
                      {activeReconciliation.isEquationBalanced ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      ) : (
                        <XCircle className="h-4 w-4 text-rose-500 shrink-0" />
                      )}
                      <span>
                        <strong>Mathematical Invariant:</strong> Gross (₦{activeReconciliation.grossAmount}) == Fee (₦{activeReconciliation.platformFee}) + Net (₦{activeReconciliation.promoterNetAmount})
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {activeReconciliation.isWalletCredited ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      ) : activeReconciliation.settlementStatus === "unsettled" ? (
                        <Clock className="h-4 w-4 text-amber-500 shrink-0" />
                      ) : (
                        <XCircle className="h-4 w-4 text-rose-500 shrink-0" />
                      )}
                      <span>
                        <strong>Wallet Ledger Synchronization:</strong> {activeReconciliation.isWalletCredited ? "Immutable credit ledger entry verified." : activeReconciliation.settlementStatus === "unsettled" ? "Order still in progress (unsettled escrow)." : "Warning: Settlement missing ledger entry."}
                      </span>
                    </div>
                  </div>

                  {activeReconciliation.issues.length > 0 && (
                    <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-700 dark:text-rose-400 text-xs space-y-1">
                      <p className="font-bold">Diagnostics / Warnings:</p>
                      {activeReconciliation.issues.map((iss, idx) => (
                        <p key={idx}>• {iss}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Batch Results Overview */}
              {batchReports.length > 0 && (
                <div className="mt-8 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm text-foreground">
                      Batch Audit Results ({batchReports.length} Orders Verified)
                    </h4>
                    <span className="text-xs text-muted-foreground">
                      {batchReports.filter((r) => r.reconciliationPassed).length} passed •{" "}
                      {batchReports.filter((r) => !r.reconciliationPassed).length} flagged
                    </span>
                  </div>

                  <div className="max-h-72 overflow-y-auto border border-border/60 rounded-lg divide-y divide-border/40 text-xs">
                    {batchReports.map((r, i) => (
                      <div key={i} className="p-3 flex items-center justify-between hover:bg-muted/20">
                        <div>
                          <span className="font-mono font-bold">{r.orderReference}</span>
                          <span className="text-muted-foreground ml-3">
                            Gross: {formatNaira(r.grossAmount)} = Fee: {formatNaira(r.platformFee)} + Net: {formatNaira(r.promoterNetAmount)}
                          </span>
                        </div>
                        {r.reconciliationPassed ? (
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px]">
                            PASSED
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-rose-500/10 text-rose-600 border-rose-500/30 text-[10px]">
                            FLAGGED
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* MODAL 1: PAYOUT EXECUTION / ACTION MODAL */}
      <Dialog
        open={!!selectedPayout && !!payoutAction}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedPayout(null);
            setPayoutAction(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {payoutAction === "complete" ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  Confirm Bank Disbursement
                </>
              ) : payoutAction === "fail" ? (
                <>
                  <XCircle className="h-5 w-5 text-rose-600" />
                  Reject / Fail Payout Request
                </>
              ) : (
                <>
                  <RotateCcw className="h-5 w-5 text-blue-600" />
                  Mark Payout In-Flight
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Payout #{selectedPayout?.payout_reference} • {formatNaira(selectedPayout?.amount || 0)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-sm">
            <div className="p-3.5 bg-muted/40 rounded-lg space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Promoter:</span>
                <span className="font-semibold text-foreground">{selectedPayout?.user_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Bank Name:</span>
                <span className="font-semibold text-foreground">{selectedPayout?.bank_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Account Number:</span>
                <span className="font-mono font-semibold text-foreground">{selectedPayout?.account_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Account Name:</span>
                <span className="font-semibold text-foreground">{selectedPayout?.account_name}</span>
              </div>
              <div className="flex justify-between border-t border-border/40 pt-1.5">
                <span className="font-bold text-muted-foreground">Disbursement Amount:</span>
                <span className="font-black text-foreground text-sm">{formatNaira(selectedPayout?.amount || 0)}</span>
              </div>
            </div>

            {payoutAction === "complete" && (
              <div className="space-y-2">
                <Label htmlFor="providerRef" className="text-xs font-bold">
                  Provider Bank Reference / Transfer Code *
                </Label>
                <Input
                  id="providerRef"
                  placeholder="e.g. PAYSTACK_TRF_99882244"
                  value={providerRef}
                  onChange={(e) => setProviderRef(e.target.value)}
                  className="font-mono text-sm"
                />
                <p className="text-[11px] text-muted-foreground">
                  The external banking transfer reference from Paystack or NIBSS confirming funds were transferred.
                </p>
              </div>
            )}

            {payoutAction === "fail" && (
              <div className="space-y-2">
                <Label htmlFor="failureReason" className="text-xs font-bold">
                  Failure Reason / Rejection Note *
                </Label>
                <Textarea
                  id="failureReason"
                  placeholder="e.g. Account name mismatch or destination bank declined transfer..."
                  value={failureReason}
                  onChange={(e) => setFailureReason(e.target.value)}
                  rows={3}
                  className="text-sm"
                />
                <p className="text-[11px] text-rose-500 font-semibold">
                  Note: The reserved amount ({formatNaira(selectedPayout?.amount || 0)}) will be automatically returned to the promoter's available wallet balance.
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedPayout(null);
                setPayoutAction(null);
              }}
              disabled={processingAction}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleExecutePayoutAction}
              disabled={processingAction}
              className={
                payoutAction === "complete"
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                  : payoutAction === "fail"
                  ? "bg-rose-600 hover:bg-rose-700 text-white font-semibold"
                  : "bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              }
            >
              {processingAction ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1" />
                  Processing...
                </>
              ) : payoutAction === "complete" ? (
                "Confirm & Finalize Disbursement"
              ) : payoutAction === "fail" ? (
                "Reject & Refund Wallet"
              ) : (
                "Mark In Processing"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: INSPECT PAYOUT DETAIL */}
      <Dialog
        open={!!viewPayoutDetail}
        onOpenChange={(open) => {
          if (!open) setViewPayoutDetail(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Payout Request Inspection</DialogTitle>
            <DialogDescription className="text-xs">
              Reference: {viewPayoutDetail?.payout_reference}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="flex justify-between py-1.5 border-b border-border/40">
              <span className="text-muted-foreground">Status:</span>
              <span>{viewPayoutDetail && getStatusBadge(viewPayoutDetail.status)}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border/40">
              <span className="text-muted-foreground">Amount:</span>
              <span className="font-bold text-sm text-foreground">
                {formatNaira(viewPayoutDetail?.amount || 0)}
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border/40">
              <span className="text-muted-foreground">Promoter User ID:</span>
              <span className="font-mono text-foreground">{viewPayoutDetail?.user_id}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border/40">
              <span className="text-muted-foreground">Bank Name:</span>
              <span className="font-semibold text-foreground">{viewPayoutDetail?.bank_name}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border/40">
              <span className="text-muted-foreground">Account Number:</span>
              <span className="font-mono font-bold text-foreground">
                {viewPayoutDetail?.account_number}
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border/40">
              <span className="text-muted-foreground">Account Name:</span>
              <span className="font-semibold text-foreground">
                {viewPayoutDetail?.account_name}
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border/40">
              <span className="text-muted-foreground">Requested Timestamp:</span>
              <span className="text-foreground">
                {viewPayoutDetail?.requested_at || viewPayoutDetail?.created_at}
              </span>
            </div>
            {viewPayoutDetail?.paid_at && (
              <div className="flex justify-between py-1.5 border-b border-border/40">
                <span className="text-muted-foreground">Disbursed Timestamp:</span>
                <span className="text-emerald-600 font-semibold">
                  {viewPayoutDetail.paid_at}
                </span>
              </div>
            )}
            {viewPayoutDetail?.provider_reference && (
              <div className="flex justify-between py-1.5 border-b border-border/40">
                <span className="text-muted-foreground">Provider Ref:</span>
                <span className="font-mono text-foreground">
                  {viewPayoutDetail.provider_reference}
                </span>
              </div>
            )}
            {viewPayoutDetail?.failure_reason && (
              <div className="py-1.5 text-rose-600">
                <span className="font-bold">Failure Reason:</span>
                <p className="mt-0.5">{viewPayoutDetail.failure_reason}</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewPayoutDetail(null)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
