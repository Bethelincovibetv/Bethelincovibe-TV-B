import { useCallback, useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Activity, Megaphone, RefreshCw, Users, Wallet, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { whatsappPromotersHub } from "@/services/whatsappPromotersHub";

function countRows(value: unknown) {
  if (Array.isArray(value)) return value.length;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of ["data", "promoters", "campaigns", "promotions", "transactions", "withdrawals", "items", "rows"]) {
      if (Array.isArray(record[key])) return record[key].length;
    }
  }
  return 0;
}

export default function AdminWhatsAppPromotersHub() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [connected, setConnected] = useState(false);
  const [latency, setLatency] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [data, setData] = useState({ promoters: 0, campaigns: 0, promotions: 0, transactions: 0 });

  const testConnection = useCallback(async () => {
    const started = performance.now();
    setRefreshing(true);
    setError("");
    try {
      const health = await whatsappPromotersHub.health();
      const healthy = health?.ok === true || String(health?.status ?? "").toLowerCase() === "ok" || String(health?.status ?? "").toLowerCase() === "healthy";
      if (!healthy) throw new Error(`Hub returned an unhealthy response${health?.status ? `: ${health.status}` : ""}.`);
      setConnected(true);
      setLatency(Math.round(performance.now() - started));
    } catch (err: any) {
      setConnected(false);
      setLatency(null);
      setError(err?.message || "Unable to reach WhatsApp Promoters Hub.");
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, []);

  const loadData = useCallback(async () => {
    setRefreshing(true);
    try {
      await testConnection();
      const [promoters, campaigns, promotions, transactions] = await Promise.all([
        whatsappPromotersHub.getPromoter(),
        whatsappPromotersHub.campaigns(),
        whatsappPromotersHub.promotions(),
        whatsappPromotersHub.transactions(),
      ]);
      setData({
        promoters: countRows(promoters) || (promoters ? 1 : 0),
        campaigns: countRows(campaigns),
        promotions: countRows(promotions),
        transactions: countRows(transactions),
      });
    } catch (err: any) {
      setError(err?.message || "Failed to load live Hub data.");
      toast.error(err?.message || "Failed to load live Hub data.");
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, [testConnection]);

  useEffect(() => { loadData(); }, [loadData]);

  return (
    <>
      <Helmet><title>WhatsApp Promoters Hub | Admin</title></Helmet>
      <div className="min-h-full space-y-6 p-4 md:p-8 max-w-7xl mx-auto pb-24">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-primary text-sm font-black uppercase tracking-wider">
              <Wifi className="h-4 w-4" /> Live Integration
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight mt-1">WhatsApp Promoters Hub</h1>
            <p className="text-muted-foreground mt-1">Admin control surface connected to the live Promoters Hub without exposing Hub credentials to the browser.</p>
          </div>
          <Button onClick={loadData} disabled={refreshing} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} /> Refresh Hub
          </Button>
        </div>

        <Card className="border-primary/20 overflow-hidden">
          <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${connected ? "bg-emerald-500/10 text-emerald-600" : "bg-destructive/10 text-destructive"}`}>
                {connected ? <Wifi className="h-6 w-6" /> : <WifiOff className="h-6 w-6" />}
              </div>
              <div>
                <p className="font-black text-lg">{connected ? "CONNECTED" : loading ? "CHECKING…" : "NOT CONNECTED"}</p>
                <p className="text-sm text-muted-foreground">{connected ? `Live Hub health confirmed${latency !== null ? ` • ${latency} ms` : ""}` : error || "Connection has not been confirmed."}</p>
              </div>
            </div>
            <Button variant="outline" onClick={testConnection} disabled={refreshing}>Test Connection</Button>
          </CardContent>
        </Card>

        {error && !connected && (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="p-4 text-sm text-destructive font-semibold">{error}</CardContent>
          </Card>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Users className="h-4 w-4" /> Promoter</CardTitle></CardHeader><CardContent><p className="text-3xl font-black">{data.promoters}</p><p className="text-xs text-muted-foreground">Live response</p></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Megaphone className="h-4 w-4" /> Campaigns</CardTitle></CardHeader><CardContent><p className="text-3xl font-black">{data.campaigns}</p><p className="text-xs text-muted-foreground">Hub records</p></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Activity className="h-4 w-4" /> Promotions</CardTitle></CardHeader><CardContent><p className="text-3xl font-black">{data.promotions}</p><p className="text-xs text-muted-foreground">Hub records</p></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Wallet className="h-4 w-4" /> Transactions</CardTitle></CardHeader><CardContent><p className="text-3xl font-black">{data.transactions}</p><p className="text-xs text-muted-foreground">Hub records</p></CardContent></Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Integration boundary</CardTitle></CardHeader>
          <CardContent className="grid md:grid-cols-3 gap-4 text-sm">
            <div><Badge variant="secondary">Frontend</Badge><p className="mt-2 text-muted-foreground">Uses the signed-in user's session only.</p></div>
            <div><Badge variant="secondary">Secure Bridge</Badge><p className="mt-2 text-muted-foreground">The main app Edge Function forwards authorized requests server-side.</p></div>
            <div><Badge variant="secondary">Promoters Hub</Badge><p className="mt-2 text-muted-foreground">Live campaigns, promotions and wallet records remain in the Hub.</p></div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
