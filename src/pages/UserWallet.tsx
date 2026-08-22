import { useEffect, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Wallet, ArrowLeft, ArrowUp, ArrowDown, Plus, Send } from "lucide-react";
import { toast } from "sonner";
import TransferDialog from "@/components/wallet/TransferDialog";

declare global {
  interface Window { PaystackPop?: any; }
}

function loadPaystack(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.PaystackPop) return resolve();
    if (document.getElementById("paystack-inline-js")) {
      const wait = setInterval(() => { if (window.PaystackPop) { clearInterval(wait); resolve(); } }, 100);
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
  const [wallet, setWallet] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [amount, setAmount] = useState<string>("1000");
  const [paystackPublicKey, setPaystackPublicKey] = useState<string>("");
  const [paying, setPaying] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);

  const load = async () => {
    if (!user) return;
    const [{ data: w }, { data: tx }, { data: setting }] = await Promise.all([
      supabase.from("wallets").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("wallet_transactions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50),
      supabase.from("site_settings").select("value").eq("key", "paystack_public_key").maybeSingle(),
    ]);
    setWallet(w);
    setTransactions(tx || []);
    setPaystackPublicKey(setting?.value || "");
  };

  useEffect(() => { load(); }, [user]);

  const handleTopup = async () => {
    const amt = Number(amount);
    if (!amt || amt < 100) { toast.error("Enter at least ₦100"); return; }
    if (!paystackPublicKey) { toast.error("Paystack not configured by admin yet"); return; }
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
            const { data: vData, error: vErr } = await supabase.functions.invoke("paystack-verify", { body: { reference: resp.reference } });
            if (vErr || vData?.error) throw new Error(vErr?.message || vData?.error);
            toast.success(`₦${amt.toLocaleString()} added to wallet`);
            await load();
          } catch (e: any) {
            toast.error(e.message || "Verification failed");
          } finally { setPaying(false); }
        },
      });
      handler.openIframe();
    } catch (e: any) {
      toast.error(e.message || "Payment failed");
      setPaying(false);
    }
  };

  if (loading) return <div className="min-h-[50vh] flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="container mx-auto max-w-3xl px-4 py-6 space-y-6">
      <Helmet><title>My Wallet | Bethelincovibe TV</title></Helmet>

      <Button asChild variant="ghost" size="sm"><Link to="/dashboard"><ArrowLeft className="h-4 w-4 mr-1" />Back</Link></Button>

      <Card className="overflow-hidden">
        <div className="bg-gradient-to-br from-primary to-primary/70 p-6 text-primary-foreground">
          <div className="flex items-center gap-2 text-sm opacity-90"><Wallet className="h-4 w-4" />Available Balance</div>
          <p className="text-4xl font-extrabold mt-2">₦{(wallet?.balance ?? 0).toLocaleString()}</p>
          <p className="text-xs opacity-75 mt-1">Currency: {wallet?.currency || "NGN"}</p>
        </div>
        <CardContent className="p-4 space-y-3">
          <Label>Top up with Paystack</Label>
          <div className="flex gap-2">
            <Input type="number" min={100} step={100} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount in ₦" />
            <Button onClick={handleTopup} disabled={paying}>
              <Plus className="h-4 w-4 mr-1" />{paying ? "Processing..." : "Pay"}
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {[500, 1000, 2000, 5000, 10000].map((v) => (
              <Button key={v} variant="outline" size="sm" onClick={() => setAmount(String(v))}>₦{v.toLocaleString()}</Button>
            ))}
          </div>
          {!paystackPublicKey && (
            <p className="text-xs text-amber-600">Paystack is not yet configured. Please contact admin.</p>
          )}
          <Button onClick={() => setTransferOpen(true)} variant="outline" className="w-full mt-2 border-primary/40 text-primary hover:bg-primary/10">
            <Send className="h-4 w-4 mr-2" />Send Money to Another User
          </Button>
        </CardContent>
      </Card>

      <TransferDialog open={transferOpen} onOpenChange={setTransferOpen} currentBalance={Number(wallet?.balance ?? 0)} onSuccess={load} />

      <Card>
        <CardHeader><CardTitle className="text-base">Transaction History</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {transactions.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No transactions yet.</p>}
          {transactions.map((t) => {
            const isCredit = Number(t.amount) > 0;
            return (
              <div key={t.id} className="flex items-center gap-3 p-3 border rounded-lg">
                <div className={`h-9 w-9 rounded-full flex items-center justify-center ${isCredit ? "bg-emerald-500/15 text-emerald-600" : "bg-destructive/15 text-destructive"}`}>
                  {isCredit ? <ArrowDown className="h-4 w-4" /> : <ArrowUp className="h-4 w-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{t.description || t.type}</p>
                  <p className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className={`font-bold text-sm ${isCredit ? "text-emerald-600" : "text-destructive"}`}>{isCredit ? "+" : ""}₦{Math.abs(Number(t.amount)).toLocaleString()}</p>
                  <Badge variant="outline" className="text-[10px]">{t.type}</Badge>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-sm font-medium">{children}</p>;
}
