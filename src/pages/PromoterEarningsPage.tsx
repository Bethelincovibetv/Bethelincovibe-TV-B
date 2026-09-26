import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  Wallet,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  Building2,
  CreditCard,
  ArrowDownToLine,
  Plus,
  RefreshCw,
  Search,
  Filter,
  Eye,
  ShieldCheck,
  Sparkles,
  Printer,
  Share2,
  Copy,
  Check,
  ChevronRight,
  HelpCircle,
  DollarSign,
  ArrowUpRight,
  ExternalLink,
  Lock,
  Trash2,
  Star,
} from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  PromoterEarningsSummary,
  PromoterBankAccount,
  PayoutReceiptData,
  getPromoterEarningsSummary,
  getPromoterBankAccounts,
  deletePromoterBankAccount,
  setDefaultBankAccount,
  getPayoutReceipt,
  maskAccountNumber,
} from "@/services/promoterPayoutService";
import {
  PayoutRequest,
  getPromoterPayouts,
  PayoutStatus,
} from "@/services/promotionSettlementService";
import {
  PromotionOrder,
  getMyPromoterOrders,
} from "@/services/promotionOrderService";
import PayoutRequestModal from "@/components/promoter/PayoutRequestModal";
import BankDetailsForm from "@/components/promoter/BankDetailsForm";

export default function PromoterEarningsPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // State management
  const [summary, setSummary] = useState<PromoterEarningsSummary | null>(null);
  const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
  const [bankAccounts, setBankAccounts] = useState<PromoterBankAccount[]>([]);
  const [activeOrders, setActiveOrders] = useState<PromotionOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<"payouts" | "banks" | "pipeline">("payouts");

  // Modals
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const [addBankModalOpen, setAddBankModalOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<PayoutReceiptData | null>(null);
  const [copiedRef, setCopiedRef] = useState(false);

  const loadAllData = async () => {
    if (!user) return;
    try {
      setRefreshing(true);
      const [summaryRes, payoutsRes, banksRes, ordersRes] = await Promise.all([
        getPromoterEarningsSummary(user.id),
        getPromoterPayouts(user.id),
        getPromoterBankAccounts(user.id),
        getMyPromoterOrders(user.id),
      ]);

      if (summaryRes.summary) setSummary(summaryRes.summary);
      if (payoutsRes.payouts) setPayouts(payoutsRes.payouts);
      if (banksRes.accounts) setBankAccounts(banksRes.accounts);
      if (ordersRes.orders) {
        const escrowStatuses = [
          "paid_escrow",
          "in_progress",
          "evidence_submitted",
          "revision_requested",
          "approved",
          "disputed",
        ];
        setActiveOrders(ordersRes.orders.filter((o) => escrowStatuses.includes(o.status)));
      }
    } catch (err: any) {
      toast.error("Failed to load earnings dashboard data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login?redirect=/dashboard/promoter/earnings");
      return;
    }
    if (user) {
      loadAllData();
    }
  }, [user, authLoading]);

  // Filtered payouts
  const filteredPayouts = useMemo(() => {
    return payouts.filter((p) => {
      const matchesStatus = statusFilter === "all" || p.status === statusFilter;
      const matchesSearch =
        searchQuery === "" ||
        p.payout_reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.bank_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.account_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.amount.toString().includes(searchQuery);
      return matchesStatus && matchesSearch;
    });
  }, [payouts, statusFilter, searchQuery]);

  const handleOpenReceipt = async (payoutId: string) => {
    if (!user) return;
    try {
      const { receipt, error } = await getPayoutReceipt(payoutId, user.id);
      if (error || !receipt) {
        toast.error(error || "Could not generate payout receipt.");
        return;
      }
      setSelectedReceipt(receipt);
    } catch {
      toast.error("Could not load receipt.");
    }
  };

  const handleDeleteBank = async (bankAccountId: string) => {
    if (!user) return;
    if (!confirm("Are you sure you want to remove this bank account?")) return;
    try {
      const { success, error } = await deletePromoterBankAccount(bankAccountId, user.id);
      if (error || !success) {
        toast.error(error || "Failed to remove bank account.");
        return;
      }
      toast.success("Bank account removed.");
      loadAllData();
    } catch {
      toast.error("Could not delete bank account.");
    }
  };

  const handleSetDefaultBank = async (bankAccountId: string) => {
    if (!user) return;
    try {
      const { success, error } = await setDefaultBankAccount(bankAccountId, user.id);
      if (error || !success) {
        toast.error(error || "Failed to update default account.");
        return;
      }
      toast.success("Default bank settlement account updated.");
      loadAllData();
    } catch {
      toast.error("Could not set default bank.");
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedRef(true);
    toast.success("Reference code copied to clipboard");
    setTimeout(() => setCopiedRef(false), 2000);
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  const getStatusBadge = (status: PayoutStatus | string) => {
    switch (status) {
      case "paid":
        return (
          <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1 text-[11px] font-bold">
            <CheckCircle2 className="w-3 h-3" /> Paid & Cleared
          </Badge>
        );
      case "processing":
        return (
          <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 gap-1 text-[11px] font-bold">
            <RefreshCw className="w-3 h-3 animate-spin" /> Bank Processing
          </Badge>
        );
      case "pending":
      case "requested":
        return (
          <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 gap-1 text-[11px] font-bold">
            <Clock className="w-3 h-3" /> Pending Review
          </Badge>
        );
      case "failed":
        return (
          <Badge className="bg-destructive/10 text-destructive border-destructive/30 gap-1 text-[11px] font-bold">
            <AlertCircle className="w-3 h-3" /> Failed / Refunded
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground py-8 px-4 sm:px-6 lg:px-8">
      <Helmet>
        <title>Promoter Earnings & Payout Center | BincoVibe</title>
        <meta
          name="description"
          content="View settled promotion earnings, manage Nigerian bank settlement accounts, and initiate self-service payout withdrawals."
        />
      </Helmet>

      <div className="max-w-7xl mx-auto space-y-8">
        {/* Top Header Navigation & Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-border">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              <Link to="/dashboard" className="hover:text-foreground">Dashboard</Link>
              <span>/</span>
              <Link to="/dashboard/promoter/profile" className="hover:text-foreground">Promoter Hub</Link>
              <span>/</span>
              <span className="text-primary font-bold">Earnings & Payouts</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight flex items-center gap-3">
              Earnings & Settlement Center
            </h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              Track settled campaign commissions, manage verified bank settlement accounts, and request instant earnings withdrawals.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={loadAllData}
              disabled={refreshing}
              className="gap-1.5 h-10 px-3.5"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setAddBankModalOpen(true)}
              className="gap-1.5 h-10 px-3.5"
            >
              <Building2 className="w-4 h-4" />
              Add Bank Account
            </Button>

            <Button
              size="sm"
              onClick={() => setWithdrawModalOpen(true)}
              disabled={(summary?.availableBalance || 0) < 1000}
              className="gap-2 h-10 px-5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-lg shadow-primary/20"
            >
              <ArrowDownToLine className="w-4 h-4" />
              Withdraw Earnings
            </Button>
          </div>
        </div>

        {/* 5 Core Metric Cards Bento Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* 1. Total Earned */}
          <Card className="border-border/70 shadow-sm bg-card hover:border-primary/40 transition-colors">
            <CardContent className="p-5 space-y-2">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold uppercase tracking-wider">Total Earned</span>
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black tracking-tight">
                ₦{(summary?.totalEarned || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {summary?.completedOrdersCount || 0} completed orders settled
              </p>
            </CardContent>
          </Card>

          {/* 2. Available Balance */}
          <Card className="border-primary/30 shadow-md bg-gradient-to-br from-primary/10 via-primary/5 to-transparent relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
            <CardContent className="p-5 space-y-2">
              <div className="flex items-center justify-between text-primary">
                <span className="text-xs font-black uppercase tracking-wider">Available to Withdraw</span>
                <div className="p-2 rounded-lg bg-primary/20 text-primary">
                  <Wallet className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black tracking-tight text-primary">
                ₦{(summary?.availableBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <button
                type="button"
                onClick={() => setWithdrawModalOpen(true)}
                disabled={(summary?.availableBalance || 0) < 1000}
                className="text-[11px] font-bold text-primary hover:underline flex items-center gap-0.5"
              >
                Instant Request Payout <ArrowUpRight className="w-3 h-3" />
              </button>
            </CardContent>
          </Card>

          {/* 3. Currently Reserved */}
          <Card className="border-border/70 shadow-sm bg-card hover:border-amber-500/40 transition-colors">
            <CardContent className="p-5 space-y-2">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold uppercase tracking-wider">In-Flight Reserved</span>
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black tracking-tight text-amber-600 dark:text-amber-400">
                ₦{(summary?.reservedBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Locked in active payout transfers
              </p>
            </CardContent>
          </Card>

          {/* 4. Active Campaigns Pipeline */}
          <Card className="border-border/70 shadow-sm bg-card hover:border-blue-500/40 transition-colors">
            <CardContent className="p-5 space-y-2">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold uppercase tracking-wider">Active Campaigns</span>
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                  <Lock className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black tracking-tight text-blue-600 dark:text-blue-400">
                ₦{(summary?.pendingEscrowBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {activeOrders.length} active campaigns running
              </p>
            </CardContent>
          </Card>

          {/* 5. Total Withdrawn */}
          <Card className="border-border/70 shadow-sm bg-card hover:border-purple-500/40 transition-colors">
            <CardContent className="p-5 space-y-2">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold uppercase tracking-wider">Total Withdrawn</span>
                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-500">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black tracking-tight">
                ₦{(summary?.totalWithdrawn || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Disbursed to verified bank accounts
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabbed Interactive Hub */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border">
            <TabsList className="bg-muted/60 p-1 rounded-xl">
              <TabsTrigger value="payouts" className="gap-2 font-semibold text-xs sm:text-sm">
                <CreditCard className="w-4 h-4" />
                Payout History ({payouts.length})
              </TabsTrigger>
              <TabsTrigger value="banks" className="gap-2 font-semibold text-xs sm:text-sm">
                <Building2 className="w-4 h-4" />
                Bank Settlement Accounts ({bankAccounts.length})
              </TabsTrigger>
              <TabsTrigger value="pipeline" className="gap-2 font-semibold text-xs sm:text-sm">
                <Lock className="w-4 h-4" />
                Campaign Pipeline ({activeOrders.length})
              </TabsTrigger>
            </TabsList>

            {activeTab === "payouts" && (
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative min-w-[200px]">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search payouts..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-9 pl-9 text-xs"
                  />
                </div>

                <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-lg border border-border">
                  {["all", "requested", "processing", "paid", "failed"].map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setStatusFilter(st)}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors capitalize ${
                        statusFilter === st
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* TAB 1: PAYOUT HISTORY */}
          <TabsContent value="payouts" className="space-y-4 m-0">
            {filteredPayouts.length === 0 ? (
              <div className="p-12 text-center rounded-2xl border border-dashed border-border bg-card/40 space-y-3">
                <div className="p-4 rounded-2xl bg-muted/50 text-muted-foreground w-fit mx-auto">
                  <CreditCard className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold">No Payout Requests Found</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  {searchQuery || statusFilter !== "all"
                    ? "No payout records match your search filters."
                    : "You haven't initiated any payout withdrawals yet. Request a withdrawal when you have cleared earnings."}
                </p>
                {(summary?.availableBalance || 0) >= 1000 && (
                  <Button
                    size="sm"
                    onClick={() => setWithdrawModalOpen(true)}
                    className="gap-2 text-xs font-bold"
                  >
                    <ArrowDownToLine className="w-4 h-4" />
                    Withdraw Available ₦{summary?.availableBalance.toLocaleString()}
                  </Button>
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-border bg-muted/40 text-muted-foreground uppercase tracking-wider font-semibold">
                        <th className="py-3.5 px-4">Payout Ref</th>
                        <th className="py-3.5 px-4">Date</th>
                        <th className="py-3.5 px-4">Destination Account</th>
                        <th className="py-3.5 px-4">Amount</th>
                        <th className="py-3.5 px-4">Status</th>
                        <th className="py-3.5 px-4 text-right">Receipt</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredPayouts.map((p) => (
                        <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-primary">
                            {p.payout_reference}
                          </td>
                          <td className="py-3.5 px-4 text-muted-foreground">
                            {new Date(p.created_at || p.requested_at).toLocaleDateString("en-NG", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-foreground">{p.bank_name}</div>
                            <div className="text-[11px] text-muted-foreground font-mono">
                              {maskAccountNumber(p.account_number)} • {p.account_name}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 font-black text-sm text-foreground">
                            ₦{p.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-3.5 px-4">
                            {getStatusBadge(p.status)}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenReceipt(p.id)}
                              className="h-8 px-2.5 text-xs font-semibold gap-1 hover:bg-primary/10 hover:text-primary"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              View
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </TabsContent>

          {/* TAB 2: BANK SETTLEMENT ACCOUNTS */}
          <TabsContent value="banks" className="space-y-4 m-0">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">Verified Bank Settlement Accounts</h3>
                <p className="text-xs text-muted-foreground">
                  Manage destination bank accounts used for receiving promotion payments.
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => setAddBankModalOpen(true)}
                className="gap-1.5 text-xs font-bold"
              >
                <Plus className="w-4 h-4" />
                Add Bank Account
              </Button>
            </div>

            {bankAccounts.length === 0 ? (
              <div className="p-12 text-center rounded-2xl border border-dashed border-border bg-card/40 space-y-3">
                <div className="p-4 rounded-2xl bg-muted/50 text-muted-foreground w-fit mx-auto">
                  <Building2 className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold">No Bank Account Added</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Add your Nigerian NUBAN bank account to receive earnings payouts directly.
                </p>
                <Button
                  size="sm"
                  onClick={() => setAddBankModalOpen(true)}
                  className="gap-2 text-xs font-bold"
                >
                  <Building2 className="w-4 h-4" />
                  Add Bank Account Now
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {bankAccounts.map((acc) => (
                  <Card
                    key={acc.id}
                    className={`relative overflow-hidden border transition-all ${
                      acc.is_default ? "border-primary/50 bg-primary/[0.02] shadow-md" : "border-border bg-card hover:border-border/80"
                    }`}
                  >
                    {acc.is_default && (
                      <div className="absolute top-3 right-3">
                        <Badge className="bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-wider">
                          Default
                        </Badge>
                      </div>
                    )}

                    <CardContent className="p-5 space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                          <Building2 className="w-6 h-6" />
                        </div>
                        <div className="min-w-0 pr-12">
                          <h4 className="font-bold text-sm truncate">{acc.bank_name}</h4>
                          <p className="text-xs text-muted-foreground font-mono">
                            {maskAccountNumber(acc.account_number)}
                          </p>
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-muted/40 border border-border space-y-1 text-xs">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                          Account Name
                        </span>
                        <p className="font-bold text-foreground truncate">{acc.account_name}</p>
                        <div className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold pt-1">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Verified NUBAN</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-border/60">
                        {!acc.is_default ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSetDefaultBank(acc.id)}
                            className="h-8 text-xs font-semibold text-primary hover:bg-primary/10 px-2"
                          >
                            <Star className="w-3.5 h-3.5 mr-1" />
                            Set as Default
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground font-medium">
                            Active destination
                          </span>
                        )}

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteBank(acc.id)}
                          className="h-8 text-xs text-destructive hover:bg-destructive/10 px-2"
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-1" />
                          Remove
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* TAB 3: ACTIVE CAMPAIGNS PIPELINE */}
          <TabsContent value="pipeline" className="space-y-4 m-0">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">Active Campaigns Pipeline</h3>
                <p className="text-xs text-muted-foreground">
                  Commissions currently in active campaign orders awaiting broadcast delivery & review approval.
                </p>
              </div>
              <Link to="/dashboard/promoter-orders">
                <Button variant="outline" size="sm" className="gap-1.5 text-xs font-bold">
                  View All Orders <ChevronRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>

            {activeOrders.length === 0 ? (
              <div className="p-12 text-center rounded-2xl border border-dashed border-border bg-card/40 space-y-3">
                <div className="p-4 rounded-2xl bg-muted/50 text-muted-foreground w-fit mx-auto">
                  <Lock className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold">No Active Campaign Orders</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  You do not have any orders currently active. When businesses book your packages, your prospective earnings will appear here.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeOrders.map((order) => {
                  const netEarning = order.promoter_net_earning || Math.round(order.amount * 0.9);
                  return (
                    <Card key={order.id} className="border-border bg-card hover:border-primary/40 transition-all">
                      <CardContent className="p-5 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono font-bold text-primary">
                            #{order.order_reference}
                          </span>
                          <Badge variant="outline" className="text-[10px] font-bold uppercase">
                            {order.status.replace("_", " ")}
                          </Badge>
                        </div>

                        <div>
                          <p className="text-xs font-semibold text-muted-foreground">Net Commission</p>
                          <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                            ₦{netEarning.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </p>
                        </div>

                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {order.promotion_brief || "WhatsApp status promotion campaign"}
                        </p>

                        <div className="pt-2 border-t border-border flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">
                            Gross: ₦{order.amount.toLocaleString()}
                          </span>
                          <Link
                            to={`/dashboard/promoter-orders/${order.id}`}
                            className="font-bold text-primary hover:underline flex items-center gap-1"
                          >
                            Manage Order <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Payout Request Modal */}
      <PayoutRequestModal
        open={withdrawModalOpen}
        onOpenChange={setWithdrawModalOpen}
        availableBalance={summary?.availableBalance || 0}
        onSuccess={() => {
          loadAllData();
        }}
      />

      {/* Bank Account Registration Modal */}
      <BankDetailsForm
        open={addBankModalOpen}
        onOpenChange={setAddBankModalOpen}
        onSuccess={() => {
          loadAllData();
        }}
      />

      {/* Printable / Sharable Payout Receipt Modal */}
      {selectedReceipt && (
        <Dialog open={!!selectedReceipt} onOpenChange={(v) => !v && setSelectedReceipt(null)}>
          <DialogContent className="sm:max-w-md bg-card text-card-foreground border-border shadow-2xl">
            <DialogHeader>
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold">Payout Transfer Receipt</DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    Official financial transaction record for this withdrawal.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4 py-3 text-xs" id="payout-receipt-print-area">
              {/* Receipt Head */}
              <div className="p-4 rounded-xl bg-muted/40 border border-border text-center space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  BincoVibe Creator Marketplace
                </p>
                <p className="text-3xl font-black text-primary">
                  ₦{selectedReceipt.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <div className="pt-1">{getStatusBadge(selectedReceipt.status)}</div>
              </div>

              {/* Receipt Details */}
              <div className="p-3.5 rounded-xl border border-border space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payout Reference:</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(selectedReceipt.payoutReference)}
                    className="font-mono font-bold text-primary flex items-center gap-1 hover:underline"
                  >
                    {selectedReceipt.payoutReference}
                    {copiedRef ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>

                <div className="flex justify-between">
                  <span className="text-muted-foreground">Destination Bank:</span>
                  <span className="font-bold">{selectedReceipt.bankName}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-muted-foreground">Account Number:</span>
                  <span className="font-mono font-bold">{selectedReceipt.maskedAccountNumber}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-muted-foreground">Beneficiary Name:</span>
                  <span className="font-bold text-right">{selectedReceipt.accountName}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-muted-foreground">Requested At:</span>
                  <span>
                    {new Date(selectedReceipt.requestedAt).toLocaleDateString("en-NG", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>

                {selectedReceipt.paidAt && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Disbursed At:</span>
                    <span>
                      {new Date(selectedReceipt.paidAt).toLocaleDateString("en-NG", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                )}

                {selectedReceipt.providerReference && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Gateway Ref:</span>
                    <span className="font-mono">{selectedReceipt.providerReference}</span>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handlePrintReceipt}
                className="gap-1.5 text-xs font-semibold"
              >
                <Printer className="w-4 h-4" />
                Print Receipt
              </Button>
              <Button
                type="button"
                onClick={() => setSelectedReceipt(null)}
                className="text-xs font-semibold"
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
