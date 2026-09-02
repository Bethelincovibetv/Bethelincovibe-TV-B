import { useEffect, useState, useMemo } from "react";
import { Navigate, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Wallet,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Plus,
  Send,
  Receipt,
  ChevronRight,
  Sparkles,
  Gift,
  ShieldCheck,
  CreditCard,
  Search,
  Filter,
  CheckCircle2,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { useFeatureFlags } from "@/contexts/FeatureFlagsContext";
import TransferDialog from "@/components/wallet/TransferDialog";
import WithdrawDialog from "@/components/wallet/WithdrawDialog";
import { playNotificationSound, playCreditSound } from "@/lib/notificationSound";

declare global {
  interface Window {
    PaystackPop?: any;
  }
}

function loadPaystack(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.PaystackPop) return resolve();
    if (document.getElementById("paystack-inline-js")) {
      const wait = setInterval(() => {
        if (window.PaystackPop) {
          clearInterval(wait);
          resolve();
        }
      }, 100);
      return;
    }
    const s = document.createElement("script");
    s.id = "paystack-inline-js";
    s.src = "https://js.paystack.co/v2/inline.js";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Paystack script failed to load"));
    document.head.appendChild(s);
  });
}

export default function UserWallet() {
  const { user, loading } = useAuth();
  const { flags } = useFeatureFlags();
  const [wallet, setWallet] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [amount, setAmount] = useState<string>("1000");
  const [paystackPublicKey, setPaystackPublicKey] = useState<string>("");
  const [paying, setPaying] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [filterType, setFilterType] = useState<"all" | "credit" | "debit" | "reward" | "transfer">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const load = async () => {
    if (!user) return;
    const [{ data: w }, { data: tx }, { data: setting }] = await Promise.all([
      supabase.from("wallets").select("*").eq("user_id", user.id).maybeSingle(),
      supabase
        .from("wallet_transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100),
      supabase.from("site_settings").select("value").eq("key", "paystack_public_key").maybeSingle(),
    ]);
    setWallet(w);
    setTransactions(tx || []);
    setPaystackPublicKey(setting?.value || "");
  };

  useEffect(() => {
    load();
    const handleUpdate = () => load();
    window.addEventListener("wallet_updated", handleUpdate);
    return () => window.removeEventListener("wallet_updated", handleUpdate);
  }, [user]);

  const handleTopup = async () => {
    const amt = Number(amount);
    if (!amt || amt < 100) {
      toast.error("Enter at least ₦100");
      return;
    }
    if (!paystackPublicKey) {
      toast.error("Paystack payment gateway is not yet configured. Please contact admin.");
      return;
    }
    setPaying(true);
    try {
      await loadPaystack();
      const { data, error } = await supabase.functions.invoke("paystack-init", { body: { amount: amt } });
      if (error || !data?.reference) throw new Error(error?.message || data?.error || "Init failed");

      const handler = window.PaystackPop.setup({
        key: paystackPublicKey,
        email: user!.email,
        amount: Math.round(amt * 100),
        ref: data.reference,
        onClose: () => setPaying(false),
        callback: async (resp: any) => {
          try {
            const { data: vData, error: vErr } = await supabase.functions.invoke("paystack-verify", {
              body: { reference: resp.reference },
            });
            if (vErr || vData?.error) throw new Error(vErr?.message || vData?.error);

            // Record targeted notification for this top-up
            try {
              const uName = user?.user_metadata?.display_name || user?.user_metadata?.full_name || (user?.email ? user.email.split("@")[0] : "Entrepreneur");
              await supabase.from("user_notifications").insert({
                user_id: user!.id,
                title: `₦${amt.toLocaleString()} Wallet Top-up Successful, ${uName}!`,
                body: `Hi ${uName}, your wallet was successfully credited with ₦${amt.toLocaleString()} via Paystack.`,
                url: `/dashboard/receipt/${resp.reference}`,
                type: "wallet",
                is_read: false,
              });
            } catch {}

            playCreditSound();
            toast.success(`₦${amt.toLocaleString()} added to your wallet successfully!`);
            window.dispatchEvent(new CustomEvent("wallet_updated"));
            await load();
          } catch (e: any) {
            toast.error(e.message || "Verification failed");
          } finally {
            setPaying(false);
          }
        },
      });
      handler.openIframe();
    } catch (e: any) {
      toast.error(e.message || "Payment failed");
      setPaying(false);
    }
  };

  // Filtered & Searched Transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const amt = Number(t.amount || 0);
      const isCredit = amt > 0;
      const type = (t.type || "").toLowerCase();
      const desc = (t.description || "").toLowerCase();
      const query = searchQuery.toLowerCase();

      // Search match
      const matchesSearch = !query || desc.includes(query) || type.includes(query) || t.id.includes(query);
      if (!matchesSearch) return false;

      // Filter match
      if (filterType === "all") return true;
      if (filterType === "credit") return isCredit;
      if (filterType === "debit") return !isCredit;
      if (filterType === "reward") return desc.includes("reward") || type.includes("reward");
      if (filterType === "transfer") return desc.includes("transfer") || type.includes("transfer");
      return true;
    });
  }, [transactions, filterType, searchQuery]);

  // Aggregate stats
  const totalBalance = Number(wallet?.balance ?? 0);
  const rewardTotal = useMemo(() => {
    return transactions
      .filter((t) => (t.description || "").toLowerCase().includes("reward") || (t.type || "").toLowerCase().includes("reward"))
      .reduce((sum, t) => sum + Math.max(0, Number(t.amount || 0)), 0);
  }, [transactions]);

  if (loading)
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="container mx-auto max-w-3xl px-3 sm:px-4 py-4 sm:py-6 space-y-5 sm:space-y-6">
      <Helmet>
        <title>My Wallet & Transactions | Bethelincovibe TV</title>
      </Helmet>

      <div className="flex items-center justify-between">
        <Button asChild variant="ghost" size="sm" className="rounded-xl font-bold text-xs sm:text-sm">
          <Link to="/dashboard">
            <ArrowLeft className="h-4 w-4 mr-1" /> Dashboard
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[11px] sm:text-xs font-bold gap-1 py-1 px-2.5">
            <ShieldCheck className="h-3.5 w-3.5" /> Verified Wallet
          </Badge>
        </div>
      </div>

      {/* Hero 3D Wallet Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-primary/95 p-5 sm:p-8 text-white shadow-2xl border border-white/20">
        {/* Glow & 3D Accents */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-primary/25 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />
        <div className="absolute bottom-0 left-0 w-60 h-60 bg-amber-500/15 rounded-full blur-2xl pointer-events-none -ml-16 -mb-16" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider font-extrabold text-white/90">
              <div className="h-7 w-7 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center text-amber-300 shadow-inner">
                <Wallet className="h-4 w-4" />
              </div>
              <span>Total Available Balance</span>
            </div>
            <div className="flex items-baseline gap-2">
              <h2 className="text-4xl sm:text-5xl font-black tracking-tight text-white drop-shadow-md">
                ₦{totalBalance.toLocaleString()}
              </h2>
              <span className="text-xs font-bold text-white/90">NGN</span>
            </div>
            <div className="flex items-center gap-2 pt-1 flex-wrap">
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-300 bg-emerald-500/20 px-2.5 py-0.5 rounded-full border border-emerald-400/30">
                <CheckCircle2 className="h-3 w-3" /> Live & Ready
              </span>
              {Number(wallet?.reserved_balance || 0) > 0 && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-300 bg-sky-500/20 px-2.5 py-0.5 rounded-full border border-sky-400/30">
                  <Clock className="h-3 w-3" /> ₦{Number(wallet?.reserved_balance || 0).toLocaleString()} In Payout Processing
                </span>
              )}
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-300 bg-amber-500/20 px-2.5 py-0.5 rounded-full border border-amber-400/30">
                <Gift className="h-3 w-3" /> ₦{rewardTotal.toLocaleString()} Earned in Rewards
              </span>
            </div>
          </div>

          {/* Quick Action Badges / Send & Top-up Shortcuts */}
          <div className="flex flex-row sm:flex-col gap-2 shrink-0 w-full sm:w-auto">
            <Button
              onClick={() => setWithdrawOpen(true)}
              variant="outline"
              size="sm"
              className="flex-1 sm:flex-initial rounded-2xl font-bold bg-white/15 hover:bg-white/25 text-white border-white/40 backdrop-blur-md shadow-sm gap-1.5 text-xs sm:text-sm h-10"
            >
              <ArrowDown className="h-4 w-4 text-emerald-300" /> Withdraw Funds
            </Button>
            <Button
              onClick={() => setTransferOpen(true)}
              variant="outline"
              size="sm"
              className="flex-1 sm:flex-initial rounded-2xl font-bold bg-white/10 hover:bg-white/20 text-white border-white/30 backdrop-blur-md shadow-sm gap-1.5 text-xs sm:text-sm h-10"
            >
              <Send className="h-4 w-4 text-amber-300" /> Send Money
            </Button>
            {flags.graphic_designer && (
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="flex-1 sm:flex-initial rounded-2xl font-bold text-white/90 hover:text-white hover:bg-white/15 text-xs justify-center h-10"
              >
                <Link to="/dashboard/graphic-designer">
                  <Sparkles className="h-3.5 w-3.5 mr-1 text-primary-foreground" /> AI Design Studio
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 3D "Add Money" Top-Up Box */}
      <Card className="border-border/80 shadow-lg rounded-3xl overflow-hidden bg-card">
        <CardHeader className="bg-gradient-to-r from-primary/10 via-amber-500/5 to-card p-4 sm:p-6 pb-3 sm:pb-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <CardTitle className="text-base sm:text-lg font-black flex items-center gap-2 text-foreground">
                <Plus className="h-5 w-5 text-primary" /> Add Money to Wallet
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Fund instantly using Debit Card, Bank Transfer, USSD, or Apple Pay via Paystack.
              </p>
            </div>
            <Badge variant="outline" className="font-mono text-[10px] sm:text-[11px] font-bold shrink-0">
              Instant Credit
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Amount to Deposit (₦)
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-muted-foreground text-sm">
                  ₦
                </span>
                <Input
                  type="number"
                  min={100}
                  step={100}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="1,000"
                  className="pl-8 h-12 text-base font-black rounded-2xl border-2 focus-visible:border-primary"
                />
              </div>

              {/* 3D Tactile "Add Money" Button */}
              <button
                onClick={handleTopup}
                disabled={paying}
                className="relative group h-12 px-6 rounded-2xl transition-all duration-200 transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-hidden w-full sm:w-auto shrink-0"
              >
                {/* 3D Beveled Gloss Background */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-primary via-primary/95 to-primary/80 shadow-[0_4px_14px_rgba(var(--primary-rgb,59,130,246),0.4),inset_0_1.5px_0_rgba(255,255,255,0.4),inset_0_-2px_0_rgba(0,0,0,0.2)] group-hover:shadow-[0_6px_20px_rgba(var(--primary-rgb,59,130,246),0.55),inset_0_2px_0_rgba(255,255,255,0.6)]" />
                <span className="relative z-10 flex items-center justify-center gap-2 text-sm font-black text-white tracking-wide">
                  <CreditCard className="h-4 w-4" />
                  {paying ? "Opening Secure Paystack..." : `Add ₦${Number(amount || 0).toLocaleString()} Now`}
                </span>
              </button>
            </div>
          </div>

          {/* Preset Quick-Amount Chips */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-muted-foreground">Quick Select Preset:</span>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {[500, 1000, 2000, 5000, 10000, 20000].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setAmount(String(v))}
                  className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all ${
                    amount === String(v)
                      ? "bg-primary text-primary-foreground border-primary shadow-xs"
                      : "bg-muted/60 hover:bg-muted text-foreground border-border/80"
                  }`}
                >
                  ₦{v.toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          {!paystackPublicKey && (
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs flex items-center gap-2">
              <TrendingUp className="h-4 w-4 shrink-0" />
              <span>Notice: Live Paystack integration gateway is ready. Ensure merchant key is configured in settings.</span>
            </div>
          )}
        </CardContent>
      </Card>

      <TransferDialog
        open={transferOpen}
        onOpenChange={setTransferOpen}
        currentBalance={Number(wallet?.balance ?? 0)}
        onSuccess={load}
      />

      <WithdrawDialog
        open={withdrawOpen}
        onOpenChange={setWithdrawOpen}
        availableBalance={Number(wallet?.balance ?? 0)}
        onSuccess={() => {
          window.dispatchEvent(new CustomEvent("wallet_updated"));
          load();
        }}
      />

      {/* Transaction History & Receipts - Mobile Aligned & No Overflow */}
      <Card className="border-border/80 shadow-md rounded-3xl overflow-hidden">
        <CardHeader className="p-4 sm:p-6 pb-3 border-b border-border/60 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-black flex items-center gap-2">
                <Receipt className="h-4 w-4 text-primary" /> Transaction History & Receipts
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Every transaction includes an official verified digital receipt.
              </p>
            </div>
            {/* Search Input - Full width on mobile, snug on desktop */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search by description, ref..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9 text-xs rounded-xl w-full"
              />
            </div>
          </div>

          {/* Filter Pills - Mobile Horizontal Scroll without overflowing */}
          <div className="overflow-x-auto pb-1 pt-1 -mx-1 px-1 scrollbar-none flex items-center gap-1.5 sm:gap-2">
            {[
              { key: "all", label: `All (${transactions.length})` },
              { key: "credit", label: "Credits (+)" },
              { key: "debit", label: "Debits (-)" },
              { key: "reward", label: "🎁 Daily Rewards" },
              { key: "transfer", label: "↗️ Transfers" },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setFilterType(tab.key as any)}
                className={`text-xs font-bold px-3 py-1.5 rounded-xl whitespace-nowrap transition-all shrink-0 ${
                  filterType === tab.key
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/60"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </CardHeader>

        <CardContent className="p-3 sm:p-4 space-y-2">
          {filteredTransactions.length === 0 && (
            <div className="text-center py-10 space-y-2.5 px-4">
              <div className="h-11 w-11 rounded-2xl bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                <Receipt className="h-5 w-5 opacity-60" />
              </div>
              <p className="text-sm font-bold text-foreground">No matching transactions</p>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                Transactions will appear here when you fund your wallet, claim daily login rewards, or send transfers.
              </p>
            </div>
          )}

          {filteredTransactions.map((t) => {
            const rawAmount = Number(t.amount || 0);
            const isCredit = rawAmount > 0;
            const absAmount = Math.abs(rawAmount);

            return (
              <Link
                key={t.id}
                to={`/dashboard/receipt/${t.id}`}
                className="group flex items-center justify-between gap-2.5 sm:gap-3 p-3 sm:p-3.5 border border-border/70 hover:border-primary/50 hover:bg-muted/40 transition-all rounded-2xl cursor-pointer"
              >
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                  <div
                    className={`h-9 w-9 sm:h-10 sm:w-10 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${
                      isCredit
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                        : "bg-destructive/15 text-destructive"
                    }`}
                  >
                    {isCredit ? <ArrowDown className="h-4 w-4 sm:h-5 sm:w-5" /> : <ArrowUp className="h-4 w-4 sm:h-5 sm:w-5" />}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm font-bold truncate text-foreground group-hover:text-primary transition-colors">
                      {t.description || t.type}
                    </p>
                    <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-muted-foreground mt-0.5 flex-wrap">
                      <span>{new Date(t.created_at).toLocaleDateString()}</span>
                      <span>·</span>
                      <span className="font-mono text-[10px] sm:text-[11px] text-muted-foreground/80">
                        #{t.id.substring(0, 8)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0 pl-1">
                  <p className={`font-black text-xs sm:text-sm ${isCredit ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
                    {isCredit ? "+" : "-"}₦{absAmount.toLocaleString()}
                  </p>
                  <div className="flex items-center justify-end gap-1 mt-0.5">
                    <Badge variant="outline" className="text-[9px] sm:text-[10px] uppercase font-bold py-0 px-1.5">
                      {t.type}
                    </Badge>
                    <span className="text-[10px] font-bold text-primary hidden sm:inline-flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                      Receipt <ChevronRight className="h-3 w-3" />
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

