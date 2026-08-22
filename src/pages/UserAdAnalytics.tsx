import { useParams, Link, Navigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Eye, MousePointerClick, Percent, Calendar, Clock,
  Wallet, TrendingUp, MapPin, Loader2,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, Legend,
} from "recharts";

export default function UserAdAnalytics() {
  const { id } = useParams();
  const { user, loading } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["ad-analytics", id, user?.id],
    enabled: !!user && !!id,
    queryFn: async () => {
      const [{ data: ad }, { data: events }] = await Promise.all([
        supabase.from("user_ads").select("*").eq("id", id!).eq("user_id", user!.id).maybeSingle(),
        supabase.from("ad_events").select("event_type, page_path, referrer, created_at").eq("ad_id", id!).order("created_at", { ascending: false }).limit(2000),
      ]);
      return { ad, events: events || [] };
    },
  });

  if (loading) return <div className="min-h-[40vh] flex items-center justify-center"><Loader2 className="animate-spin h-6 w-6" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (isLoading) return <div className="min-h-[40vh] flex items-center justify-center"><Loader2 className="animate-spin h-6 w-6" /></div>;
  if (!data?.ad) return <div className="container mx-auto py-12 text-center text-muted-foreground">Campaign not found.</div>;

  const ad = data.ad as any;
  const events = data.events as any[];

  // Aggregations
  const impressions = events.filter(e => e.event_type === "impression").length || Number(ad.impressions || 0);
  const clicks = events.filter(e => e.event_type === "click").length || Number(ad.clicks || 0);
  const ctr = impressions ? (clicks / impressions) * 100 : 0;

  const now = new Date();
  const startsAt = ad.starts_at ? new Date(ad.starts_at) : null;
  const endsAt = ad.ends_at ? new Date(ad.ends_at) : null;
  const totalDays = Number(ad.duration_days || 0);
  const daysLeft = endsAt ? Math.max(0, Math.ceil((endsAt.getTime() - now.getTime()) / 86400000)) : totalDays;
  const daysRun = totalDays - daysLeft;
  const progressPct = totalDays > 0 ? Math.min(100, Math.round((daysRun / totalDays) * 100)) : 0;

  // Daily series (last 14 days)
  const dayMap = new Map<string, { date: string; impressions: number; clicks: number }>();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now); d.setDate(d.getDate() - i);
    const k = d.toISOString().slice(0, 10);
    dayMap.set(k, { date: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }), impressions: 0, clicks: 0 });
  }
  events.forEach((e) => {
    const k = new Date(e.created_at).toISOString().slice(0, 10);
    const row = dayMap.get(k);
    if (!row) return;
    if (e.event_type === "impression") row.impressions++;
    else if (e.event_type === "click") row.clicks++;
  });
  const series = Array.from(dayMap.values());

  // Top pages
  const pageCounts: Record<string, number> = {};
  events.forEach((e) => {
    if (e.event_type !== "impression") return;
    const p = e.page_path || "/";
    pageCounts[p] = (pageCounts[p] || 0) + 1;
  });
  const topPages = Object.entries(pageCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const costPerClick = clicks ? Number(ad.cost_amount) / clicks : 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 pb-16">
      <Helmet><title>Campaign Analytics — {ad.title} | Bethelincovibe TV</title></Helmet>
      <div className="bg-gradient-to-br from-fuchsia-600 via-purple-600 to-indigo-600 text-white px-4 pt-6 pb-10 rounded-b-3xl">
        <div className="container mx-auto max-w-5xl">
          <Button asChild variant="ghost" size="sm" className="text-white hover:bg-white/10 -ml-2">
            <Link to="/dashboard/ads"><ArrowLeft className="h-4 w-4 mr-1" />Back to My Ads</Link>
          </Button>
          <div className="flex items-start gap-4 mt-3">
            {ad.image_url && <img src={ad.image_url} alt={ad.title} className="h-20 w-28 object-cover rounded-xl ring-2 ring-white/30" />}
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold leading-tight">{ad.title}</h1>
              {ad.description && <p className="text-sm opacity-90 line-clamp-2 mt-1">{ad.description}</p>}
              <div className="flex flex-wrap gap-2 mt-2">
                <Badge variant="secondary" className="text-xs">{ad.status}</Badge>
                <Badge variant="secondary" className="text-xs">{ad.placement}</Badge>
                <Badge variant="secondary" className="text-xs">₦{Number(ad.cost_amount).toLocaleString()} budget</Badge>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-5xl px-4 -mt-6 space-y-4">
        {/* KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard icon={Eye} label="Impressions" value={impressions.toLocaleString()} tint="text-blue-600" />
          <KpiCard icon={MousePointerClick} label="Clicks" value={clicks.toLocaleString()} tint="text-emerald-600" />
          <KpiCard icon={Percent} label="CTR" value={ctr.toFixed(2) + "%"} tint="text-fuchsia-600" />
          <KpiCard icon={Wallet} label="Cost / click" value={clicks ? `₦${costPerClick.toFixed(2)}` : "—"} tint="text-orange-600" />
        </div>

        {/* Campaign timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4 text-primary" />Campaign Timeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-1.5 text-muted-foreground"><Calendar className="h-3.5 w-3.5" />{startsAt ? startsAt.toLocaleDateString() : "Not started"}</div>
              <div className="flex items-center gap-1.5 text-muted-foreground">{endsAt ? endsAt.toLocaleDateString() : "—"}</div>
            </div>
            <div className="h-3 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-gradient-to-r from-primary to-fuchsia-500 transition-all" style={{ width: `${progressPct}%` }} />
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-primary">{daysRun} of {totalDays} day{totalDays > 1 ? "s" : ""} run</span>
              <span className={`font-semibold ${daysLeft <= 1 ? "text-destructive" : "text-emerald-600"}`}>
                {daysLeft} day{daysLeft !== 1 ? "s" : ""} left
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Daily performance area chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" />Last 14 days</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={series} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                  <defs>
                    <linearGradient id="impG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="clkG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Area type="monotone" dataKey="impressions" stroke="hsl(var(--primary))" fill="url(#impG)" strokeWidth={2} />
                  <Area type="monotone" dataKey="clicks" stroke="#10b981" fill="url(#clkG)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top pages */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" />Top pages serving your ad</CardTitle>
          </CardHeader>
          <CardContent>
            {topPages.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No impression data yet. Once your ad runs you'll see where it's shown.</p>
            ) : (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topPages.map(([p, c]) => ({ page: p.length > 22 ? "…" + p.slice(-22) : p, impressions: c }))} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis dataKey="page" type="category" tick={{ fontSize: 11 }} width={140} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                    <Bar dataKey="impressions" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Insights */}
        <Card>
          <CardHeader><CardTitle className="text-base">Insights</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Insight ok={ctr >= 1}>Your CTR is <strong>{ctr.toFixed(2)}%</strong>. {ctr >= 1 ? "Great — above the 1% industry average." : "Below the 1% industry average — try a sharper headline or stronger creative."}</Insight>
            <Insight ok={impressions > 100}>You've earned <strong>{impressions.toLocaleString()}</strong> impressions so far. {impressions < 100 ? "Give it 24–48 hours for traffic to ramp." : "Healthy reach for this campaign."}</Insight>
            <Insight ok={daysLeft > 1}>{daysLeft > 1 ? `${daysLeft} days remain — momentum is still building.` : daysLeft === 1 ? "Last day — consider extending to lock in conversions." : "Campaign ended. Top up your wallet and relaunch when ready."}</Insight>
            {clicks > 0 && (
              <Insight ok>Average cost per click is <strong>₦{costPerClick.toFixed(2)}</strong> — excellent compared to Google Ads (₦100+ on similar Nigeria niches).</Insight>
            )}
          </CardContent>
        </Card>

        <div className="text-center">
          <Button asChild><Link to="/dashboard/ads">Back to My Ads</Link></Button>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, tint }: any) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground"><Icon className={`h-4 w-4 ${tint}`} />{label}</div>
        <p className="text-2xl font-extrabold mt-1">{value}</p>
      </CardContent>
    </Card>
  );
}

function Insight({ ok, children }: { ok?: boolean; children: any }) {
  return (
    <div className={`flex items-start gap-2 p-2.5 rounded-lg ${ok ? "bg-emerald-500/5 border border-emerald-500/20" : "bg-amber-500/5 border border-amber-500/20"}`}>
      <span className={`mt-0.5 inline-block h-2 w-2 rounded-full flex-shrink-0 ${ok ? "bg-emerald-500" : "bg-amber-500"}`} />
      <p className="text-sm leading-relaxed">{children}</p>
    </div>
  );
}