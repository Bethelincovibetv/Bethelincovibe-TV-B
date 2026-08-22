import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Eye, MousePointerClick, Users, Smartphone, Monitor, BarChart3, ExternalLink } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend } from "recharts";

const COLORS = ["hsl(var(--primary))", "#22c55e", "#f59e0b", "#ec4899", "#3b82f6", "#a855f7"];

export default function SalesPageAnalytics() {
  const { user, loading } = useAuth();
  const { id } = useParams();
  const [page, setPage] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);

  useEffect(() => {
    if (!id || !user) return;
    (async () => {
      const [{ data: p }, { data: ev }, { data: ld }] = await Promise.all([
        supabase.from("sales_pages").select("*").eq("id", id).maybeSingle(),
        supabase.from("sales_page_events").select("*").eq("sales_page_id", id).order("created_at", { ascending: true }),
        supabase.from("sales_page_leads").select("*").eq("sales_page_id", id).order("created_at", { ascending: false }),
      ]);
      setPage(p);
      setEvents(ev || []);
      setLeads(ld || []);
    })();
  }, [id, user]);

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  const stats = useMemo(() => {
    const views = events.filter(e => e.type === "view").length;
    const clicks = events.filter(e => e.type?.startsWith("click")).length;
    const conv = leads.length;
    const cr = views > 0 ? Math.round((conv / views) * 1000) / 10 : 0;
    return { views, clicks, conv, cr };
  }, [events, leads]);

  const dailySeries = useMemo(() => {
    const map: Record<string, { date: string; views: number; clicks: number; leads: number }> = {};
    const add = (date: string, key: "views" | "clicks" | "leads") => {
      const d = date.slice(0, 10);
      map[d] = map[d] || { date: d, views: 0, clicks: 0, leads: 0 };
      map[d][key]++;
    };
    events.forEach((e) => {
      if (e.type === "view") add(e.created_at, "views");
      else if (e.type?.startsWith("click")) add(e.created_at, "clicks");
    });
    leads.forEach((l) => add(l.created_at, "leads"));
    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date)).slice(-30);
  }, [events, leads]);

  const sourceData = useMemo(() => {
    const m: Record<string, number> = {};
    events.filter(e => e.type === "view").forEach((e) => {
      const s = e.source || "direct";
      m[s] = (m[s] || 0) + 1;
    });
    return Object.entries(m).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 6);
  }, [events]);

  const deviceData = useMemo(() => {
    let mobile = 0, desktop = 0;
    events.filter(e => e.type === "view").forEach((e) => {
      if (e.device === "mobile") mobile++; else desktop++;
    });
    return [{ name: "Mobile", value: mobile }, { name: "Desktop", value: desktop }];
  }, [events]);

  const clickBreakdown = useMemo(() => {
    const m: Record<string, number> = { whatsapp: 0, call: 0, email: 0, cta: 0 };
    events.forEach((e) => {
      if (e.type === "click_whatsapp") m.whatsapp++;
      else if (e.type === "click_call") m.call++;
      else if (e.type === "click_email") m.email++;
      else if (e.type === "click_cta") m.cta++;
    });
    return Object.entries(m).map(([name, value]) => ({ name, value }));
  }, [events]);

  if (!page) return <div className="container py-12 text-center text-muted-foreground">Loading…</div>;

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background pb-12">
      <Helmet><title>Analytics: {page.product_name} | Bethelincovibe TV</title></Helmet>
      <div className="container max-w-5xl mx-auto px-4 py-6 space-y-5">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" asChild><Link to="/dashboard/sales-pages"><ArrowLeft className="h-4 w-4 mr-1" />Back</Link></Button>
          <Button size="sm" variant="outline" asChild><Link to={`/sales/${page.slug}`} target="_blank"><ExternalLink className="h-3.5 w-3.5 mr-1" />View page</Link></Button>
        </div>

        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2"><BarChart3 className="h-5 w-5 text-primary" />{page.product_name}</h1>
          <p className="text-xs text-muted-foreground">Analytics & insights</p>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat icon={Eye} label="Views" value={stats.views} />
          <Stat icon={MousePointerClick} label="Clicks" value={stats.clicks} />
          <Stat icon={Users} label="Leads" value={stats.conv} />
          <Stat icon={BarChart3} label="Conversion" value={`${stats.cr}%`} />
        </div>

        {/* Time series */}
        <Card>
          <CardHeader><CardTitle className="text-base">Last 30 days</CardTitle></CardHeader>
          <CardContent className="h-72">
            {dailySeries.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">No data yet — share your page to start collecting visits.</p> : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailySeries}>
                  <XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="views" stroke={COLORS[0]} strokeWidth={2} />
                  <Line type="monotone" dataKey="clicks" stroke={COLORS[1]} strokeWidth={2} />
                  <Line type="monotone" dataKey="leads" stroke={COLORS[3]} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <div className="grid sm:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Traffic sources</CardTitle></CardHeader>
            <CardContent className="h-64">
              {sourceData.length === 0 ? <p className="text-xs text-muted-foreground text-center py-6">No views yet</p> : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={sourceData} dataKey="value" nameKey="name" outerRadius={80} label>
                      {sourceData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Device split</CardTitle></CardHeader>
            <CardContent className="h-64">
              <div className="grid grid-cols-2 gap-3 mb-2">
                <div className="flex items-center gap-2"><Smartphone className="h-4 w-4 text-primary" /><span className="text-sm">Mobile {deviceData[0]?.value || 0}</span></div>
                <div className="flex items-center gap-2"><Monitor className="h-4 w-4 text-primary" /><span className="text-sm">Desktop {deviceData[1]?.value || 0}</span></div>
              </div>
              <ResponsiveContainer width="100%" height="80%">
                <BarChart data={deviceData}>
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Bar dataKey="value" fill={COLORS[0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Click breakdown</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={clickBreakdown}>
                <XAxis dataKey="name" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Bar dataKey="value" fill={COLORS[1]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent leads</CardTitle>
            <Badge variant="secondary">{leads.length}</Badge>
          </CardHeader>
          <CardContent>
            {leads.length === 0 ? <p className="text-xs text-muted-foreground">No leads yet.</p> : (
              <div className="space-y-2">
                {leads.slice(0, 8).map((l) => (
                  <div key={l.id} className="flex items-center justify-between border-b last:border-0 pb-2 text-sm">
                    <div>
                      <p className="font-medium">{l.name}</p>
                      <p className="text-xs text-muted-foreground">{l.phone} • {new Date(l.created_at).toLocaleString()}</p>
                    </div>
                    <Badge variant="outline" className="text-xs capitalize">{l.status}</Badge>
                  </div>
                ))}
                <Button size="sm" variant="ghost" asChild className="w-full mt-2"><Link to="/dashboard/leads">View all leads →</Link></Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: any) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center gap-2 text-muted-foreground text-xs"><Icon className="h-3.5 w-3.5" />{label}</div>
        <p className="text-2xl font-bold mt-1">{value}</p>
      </CardContent>
    </Card>
  );
}
