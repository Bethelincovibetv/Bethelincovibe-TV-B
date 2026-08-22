import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CreditCard, Loader2, ShieldCheck, Unplug } from "lucide-react";

type Account = {
  public_key: string | null;
  merchant_id: string | null;
  business_name: string | null;
  status: string;
  last_verified_at: string | null;
} | null;

export default function SellerPayments() {
  const { user, loading } = useAuth();
  const [account, setAccount] = useState<Account>(null);
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(true);
  const [form, setForm] = useState({ public_key: "", secret_key: "", merchant_id: "" });

  const load = async () => {
    setChecking(true);
    const { data, error } = await supabase.functions.invoke("seller-paystack", { body: { action: "status" } });
    if (!error) setAccount(data?.account ?? null);
    setChecking(false);
  };

  useEffect(() => { if (user) load(); }, [user]);

  if (loading) return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!user) return <Navigate to="/login?redirect=/dashboard/payments" replace />;

  const connect = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("seller-paystack", {
      body: { action: "connect", ...form },
    });
    setBusy(false);
    if (error || data?.error) {
      toast.error(data?.error || "Could not verify those keys. Please check and try again.");
      await load();
      return;
    }
    toast.success("Paystack account connected and verified.");
    setForm({ public_key: "", secret_key: "", merchant_id: "" });
    setAccount(data.account);
  };

  const disconnect = async () => {
    if (!confirm("Disconnect your Paystack account? Buyers will no longer be able to pay you directly.")) return;
    setBusy(true);
    await supabase.functions.invoke("seller-paystack", { body: { action: "disconnect" } });
    setBusy(false);
    setAccount(null);
    toast.success("Disconnected");
  };

  const status = account?.status ?? "not_connected";
  const statusBadge =
    status === "connected" ? <Badge className="bg-emerald-600 hover:bg-emerald-600">Connected</Badge>
    : status === "invalid" ? <Badge variant="destructive">Invalid credentials</Badge>
    : <Badge variant="secondary">Not connected</Badge>;

  return (
    <div className="container mx-auto max-w-2xl px-4 py-6">
      <Helmet><title>Payment Settings — Connect Paystack | Seller Dashboard</title></Helmet>

      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/15 text-primary"><CreditCard className="h-5 w-5" /></span>
        <div>
          <h1 className="text-xl font-bold">Payment settings</h1>
          <p className="text-xs text-muted-foreground">Connect your own Paystack account to sell digital products and get paid directly.</p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base">Paystack connection</CardTitle>
            <CardDescription>
              {checking ? "Checking…" : account?.business_name ? `Merchant: ${account.business_name}` : "Your keys are encrypted and never shown again."}
            </CardDescription>
          </div>
          {statusBadge}
        </CardHeader>
        <CardContent className="space-y-4">
          {status === "connected" && account ? (
            <div className="space-y-3">
              <div className="rounded-2xl border bg-muted/40 p-4 text-sm">
                <p className="flex items-center gap-2 font-medium text-emerald-600"><ShieldCheck className="h-4 w-4" />Verified with Paystack</p>
                <p className="mt-2 text-xs text-muted-foreground">Public key: <span className="font-mono">{account.public_key}</span></p>
                {account.merchant_id && <p className="text-xs text-muted-foreground">Merchant ID: {account.merchant_id}</p>}
                {account.last_verified_at && <p className="text-xs text-muted-foreground">Last verified {new Date(account.last_verified_at).toLocaleString()}</p>}
              </div>
              <Button variant="outline" onClick={disconnect} disabled={busy} className="w-full">
                <Unplug className="mr-2 h-4 w-4" />Disconnect account
              </Button>
              <p className="text-center text-xs text-muted-foreground">To update keys, disconnect first and connect again.</p>
            </div>
          ) : (
            <form onSubmit={connect} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pk">Paystack public key</Label>
                <Input id="pk" required placeholder="pk_live_xxxxxxxx" value={form.public_key} onChange={(e) => setForm({ ...form, public_key: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sk">Paystack secret key</Label>
                <Input id="sk" required type="password" placeholder="sk_live_xxxxxxxx" value={form.secret_key} onChange={(e) => setForm({ ...form, secret_key: e.target.value })} />
                <p className="text-[11px] text-muted-foreground">Encrypted before storage. We verify it with Paystack before saving.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="mid">Merchant ID (optional)</Label>
                <Input id="mid" placeholder="Only if your Paystack setup requires it" value={form.merchant_id} onChange={(e) => setForm({ ...form, merchant_id: e.target.value })} />
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Verifying…</> : "Verify & connect"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
