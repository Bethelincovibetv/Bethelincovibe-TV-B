import { useEffect, useState, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Printer,
  Share2,
  CheckCircle2,
  Clock,
  AlertCircle,
  Copy,
  Check,
  Download,
  Wallet,
  ShieldCheck,
  Receipt,
  Building2,
  CreditCard,
  Send,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { copyToClipboard } from "@/lib/clipboard";

export default function TransactionReceipt() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [transaction, setTransaction] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadReceipt() {
      if (!id) return;
      setLoading(true);

      try {
        // 1. Try fetching from wallet_transactions by ID or reference
        const { data: tx, error: txErr } = await supabase
          .from("wallet_transactions")
          .select("*")
          .or(`id.eq.${id},payment_ref.eq.${id}`)
          .maybeSingle();

        if (tx) {
          setTransaction(tx);
          // Fetch user profile
          if (tx.user_id) {
            const { data: p } = await supabase
              .from("profiles")
              .select("display_name, username, email, full_name")
              .eq("user_id", tx.user_id)
              .maybeSingle();
            setUserProfile(p);
          }
        } else {
          // Fallback check if it's a product order or payment
          const { data: ord } = await supabase
            .from("product_orders")
            .select("*, seller_products(title, price)")
            .eq("id", id)
            .maybeSingle();

          if (ord) {
            setTransaction({
              id: ord.id,
              user_id: ord.buyer_id,
              amount: ord.total_amount || ord.amount,
              type: "product_purchase",
              description: ord.seller_products?.title ? `Purchase of ${ord.seller_products.title}` : "Marketplace Product Order",
              status: ord.status || "completed",
              created_at: ord.created_at,
              payment_ref: ord.paystack_reference || ord.payment_ref || ord.id,
              metadata: { order: ord },
            });
          }
        }
      } catch (err) {
        console.error("Error loading transaction receipt:", err);
      } finally {
        setLoading(false);
      }
    }

    loadReceipt();
  }, [id, user]);

  const handlePrint = () => {
    window.print();
  };

  const handleCopyLink = async () => {
    const url = window.location.href;
    const success = await copyToClipboard(url);
    if (success) {
      setCopied(true);
      toast.success("Receipt link copied!");
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.info("Link: " + url);
    }
  };

  const handleShare = async () => {
    const title = `Bethelincovibe TV Transaction Receipt #${transaction?.id?.substring(0, 8)}`;
    const url = window.location.href;
    if ((navigator as any).share) {
      try {
        await (navigator as any).share({ title, url });
        return;
      } catch {
        /* ignore */
      }
    }
    handleCopyLink();
  };

  if (loading) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-12 space-y-4">
        <Skeleton className="h-10 w-40 rounded-xl" />
        <Skeleton className="h-96 w-full rounded-3xl" />
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className="container mx-auto max-w-xl px-4 py-16 text-center space-y-4">
        <Receipt className="h-16 w-16 mx-auto text-muted-foreground/50" />
        <h1 className="text-2xl font-bold text-foreground">Transaction Receipt Not Found</h1>
        <p className="text-sm text-muted-foreground">
          We could not locate this transaction receipt with reference: <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{id}</code>
        </p>
        <div className="pt-4 flex justify-center gap-3">
          <Button asChild variant="outline">
            <Link to="/dashboard/wallet">Back to Wallet</Link>
          </Button>
          <Button asChild>
            <Link to="/dashboard">Go to Dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  const rawAmount = Number(transaction.amount || 0);
  const isCredit = rawAmount > 0;
  const absAmount = Math.abs(rawAmount);
  const formattedDate = new Date(transaction.created_at).toLocaleString("en-NG", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const txTypeLabel = (transaction.type || "transaction")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c: string) => c.toUpperCase());

  return (
    <>
      <Helmet>
        <title>Transaction Receipt #{transaction.id?.substring(0, 8)} | Bethelincovibe TV</title>
        <style>{`
          @media print {
            body { background: white !important; color: black !important; }
            header, nav, footer, .no-print { display: none !important; }
            .print-container { box-shadow: none !important; border: 1px solid #ccc !important; max-width: 100% !important; margin: 0 !important; }
          }
        `}</style>
      </Helmet>

      <div className="container mx-auto max-w-2xl px-4 py-8 space-y-6">
        {/* Navigation & Action Bar */}
        <div className="flex items-center justify-between no-print">
          <Button asChild variant="ghost" size="sm" className="rounded-xl font-bold">
            <Link to="/dashboard/wallet">
              <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Wallet
            </Link>
          </Button>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleShare} className="rounded-xl text-xs font-bold gap-1.5">
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Share2 className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Share"}
            </Button>
            <Button size="sm" onClick={handlePrint} className="rounded-xl text-xs font-bold gap-1.5 bg-primary hover:bg-primary/90 text-white shadow-md">
              <Printer className="h-3.5 w-3.5" /> Print / PDF
            </Button>
          </div>
        </div>

        {/* The Printable Receipt Card */}
        <div ref={printRef} className="print-container bg-card border border-border/90 rounded-3xl shadow-xl overflow-hidden">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-slate-900 via-primary/95 to-slate-900 text-white p-6 sm:p-8 text-center relative overflow-hidden">
            <div className="relative z-10 space-y-2">
              <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-white/10 backdrop-blur-md ring-1 ring-white/30 text-white mb-1 shadow-inner">
                <Receipt className="h-6 w-6" />
              </div>
              <p className="text-xs uppercase tracking-widest font-extrabold text-white/80">Official Transaction Receipt</p>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight">Bethelincovibe TV</h2>
              <p className="text-[11px] text-white/70">Lagos SME Directory, Supplier Marketplace & Growth Engine</p>
            </div>
            {/* Watermark Logo Accent */}
            <ShieldCheck className="absolute -bottom-6 -right-6 h-36 w-36 text-white/5 pointer-events-none" />
          </div>

          <CardContent className="p-6 sm:p-8 space-y-6">
            {/* Amount & Status Block */}
            <div className="text-center py-4 border-b border-border/70 space-y-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Amount</span>
              <div className="text-3xl sm:text-4xl font-black tracking-tight text-foreground flex items-center justify-center gap-1">
                <span>₦{absAmount.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-center gap-2 pt-1">
                <Badge
                  className={`text-xs font-bold px-3 py-1 rounded-full ${
                    isCredit
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                      : "bg-primary/10 text-primary border border-primary/20"
                  }`}
                >
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                  {isCredit ? "Funds Credited / Successful" : "Payment Completed"}
                </Badge>
                <Badge variant="outline" className="text-xs font-mono">
                  {txTypeLabel}
                </Badge>
              </div>
            </div>

            {/* Receipt Key-Value Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/60 space-y-1">
                <span className="text-muted-foreground font-medium block">Transaction Reference ID</span>
                <span className="font-mono font-bold text-foreground text-[13px] break-all">
                  {transaction.payment_ref || transaction.id}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/60 space-y-1">
                <span className="text-muted-foreground font-medium block">Date & Time</span>
                <span className="font-semibold text-foreground text-[12px]">
                  {formattedDate}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/60 space-y-1">
                <span className="text-muted-foreground font-medium block">Transaction Type</span>
                <span className="font-semibold text-foreground text-[12px]">
                  {txTypeLabel}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/60 space-y-1">
                <span className="text-muted-foreground font-medium block">Payment Channel</span>
                <span className="font-semibold text-foreground text-[12px] flex items-center gap-1.5">
                  <Wallet className="h-3.5 w-3.5 text-primary" />
                  {transaction.payment_ref?.startsWith("tr_") ? "P2P User Wallet Transfer" : "Paystack / Automated Direct"}
                </span>
              </div>
            </div>

            {/* Description & Narrative */}
            <div className="p-4 rounded-2xl border border-border/80 bg-background space-y-2">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Transaction Summary</span>
              <p className="text-sm font-medium text-foreground leading-relaxed">
                {transaction.description || `Wallet transaction: ${txTypeLabel} for ₦${absAmount.toLocaleString()}`}
              </p>
            </div>

            {/* Account / Holder Information */}
            <div className="p-4 rounded-2xl bg-muted/30 border border-border/60 space-y-2 text-xs">
              <div className="flex items-center justify-between text-muted-foreground font-medium pb-2 border-b border-border/60">
                <span>Account Holder</span>
                <span className="font-bold text-foreground">{userProfile?.display_name || user?.email || "Platform User"}</span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground font-medium">
                <span>Account Email</span>
                <span className="font-mono text-foreground">{userProfile?.email || user?.email || "—"}</span>
              </div>
            </div>

            {/* Security Stamp & Verification */}
            <div className="pt-4 border-t border-border/70 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
              <div className="space-y-1">
                <div className="flex items-center justify-center sm:justify-start gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                  <ShieldCheck className="h-4 w-4" />
                  <span>Digitally Verified by Bethelincovibe TV System</span>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Official electronic receipt generated for recordkeeping, accounting and audit compliance.
                </p>
              </div>

              <div className="shrink-0 p-2 rounded-xl bg-muted/60 border font-mono text-[10px] text-muted-foreground">
                SEC-REF: {transaction.id?.substring(0, 12)}
              </div>
            </div>
          </CardContent>
        </div>

        {/* Post Actions (no-print) */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 no-print pt-2">
          <Button asChild variant="outline" className="rounded-xl w-full sm:w-auto font-bold text-xs">
            <Link to="/dashboard/wallet">
              <Wallet className="h-4 w-4 mr-1.5" /> Return to My Wallet
            </Link>
          </Button>
          <Button asChild className="rounded-xl w-full sm:w-auto font-bold text-xs">
            <Link to="/dashboard">
              Go to Dashboard
            </Link>
          </Button>
        </div>
      </div>
    </>
  );
}
