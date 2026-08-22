import { useEffect, useState } from "react";
import { useParams, useNavigate, Link, Navigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ChevronLeft, Sparkles, Loader2, CheckCircle2 } from "lucide-react";

type Pkg = { key: string; days: number; price: number; label: string };

export default function BoostBusiness() {
  const { id } = useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [biz, setBiz] = useState<any>(null);
  const [pkgs, setPkgs] = useState<Pkg[]>([]);
  const [wallet, setWallet] = useState<number>(0);
  const [chosen, setChosen] = useState<string>("");
  const [paying, setPaying] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: b }, { data: s }, { data: w }] = await Promise.all([
        supabase.from("suppliers").select("*").eq("id", id!).maybeSingle(),
        supabase.from("site_settings").select("value").eq("key", "boost_packages").maybeSingle(),
        supabase.from("wallets").select("balance").eq("user_id", user.id).maybeSingle(),
      ]);
      if (!b || b.submitted_by !== user.id) { toast.error("Not found"); navigate("/dashboard/businesses"); return; }
      setBiz(b);
      setPkgs(s?.value ? JSON.parse(s.value) : []);
      setWallet(Number(w?.balance) || 0);
      setLoading(false);
    })();
  }, [id, user, navigate]);

  if (authLoading) return <div className="p-12 text-center">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (loading) return <div className="p-12 text-center"><Loader2 className="h-6 w-6 mx-auto animate-spin" /></div>;

  const isBoosted = biz.boosted_until && new Date(biz.boosted_until) > new Date();
  const selected = pkgs.find((p) => p.key === chosen);

  const purchase = async () => {
    if (!selected) return;
    if (wallet < selected.price) {
      toast.error("Not enough wallet balance. Please top up.");
      navigate("/dashboard/wallet");
      return;
    }
    setPaying(true);
    const { data: result, error } = await (supabase as any).rpc("activate_business_boost", {
      _business_id: biz.id,
      _package_key: selected.key,
      _duration_days: selected.days,
      _amount: selected.price,
    });
    setPaying(false);
    if (error || !result?.success) { toast.error(result?.error || error?.message || "Activation error"); return; }
    toast.success(`Boosted until ${new Date(result.ends_at).toLocaleDateString()}!`);
    navigate("/dashboard/businesses");
  };

  return (
    <>
      <Helmet><title>Boost Business | Bethelincovibe TV</title></Helmet>
      <div className="container mx-auto max-w-2xl px-4 py-6">
        <Button asChild variant="ghost" size="sm" className="mb-3"><Link to="/dashboard/businesses"><ChevronLeft className="h-4 w-4 mr-1" />Back</Link></Button>

        <div className="rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-pink-500 p-5 text-white mb-4 shadow-lg">
          <Sparkles className="h-7 w-7 mb-2" />
          <h1 className="text-xl font-bold">Boost {biz.name}</h1>
          <p className="text-sm opacity-90 mt-1">Appear at the top of the directory as a Sponsored listing.</p>
          {isBoosted && <Badge className="mt-2 bg-white/20 text-white">Active until {new Date(biz.boosted_until).toLocaleDateString()}</Badge>}
        </div>

        <Card className="mb-4">
          <CardContent className="p-4 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Wallet balance</span>
            <span className="text-lg font-bold">₦{wallet.toLocaleString()}</span>
          </CardContent>
        </Card>

        <div className="space-y-3">
          {pkgs.map((p) => {
            const active = chosen === p.key;
            const canAfford = wallet >= p.price;
            return (
              <Card key={p.key} className={`cursor-pointer transition ${active ? "ring-2 ring-primary" : ""} ${!canAfford ? "opacity-60" : ""}`} onClick={() => setChosen(p.key)}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    {p.label}
                    {active && <CheckCircle2 className="h-4 w-4 text-primary" />}
                  </CardTitle>
                  <span className="text-lg font-extrabold">₦{p.price.toLocaleString()}</span>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground">
                  • {p.days} days at the top of the directory<br />
                  • Sponsored badge on your listing<br />
                  • Priority placement in search
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Button className="w-full mt-5 h-12 text-base bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-90 text-white" disabled={!selected || paying} onClick={purchase}>
          {paying && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {selected ? `Pay ₦${selected.price.toLocaleString()} from Wallet` : "Choose a package"}
        </Button>
        <p className="text-center text-xs text-muted-foreground mt-3">
          Need credits? <Link to="/dashboard/wallet" className="underline text-primary">Top up your wallet</Link>
        </p>
      </div>
    </>
  );
}
