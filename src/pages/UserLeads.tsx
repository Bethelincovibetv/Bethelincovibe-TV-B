import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ArrowLeft, Phone, MessageCircle, Mail, Download, Trash2, Search, Sparkles } from "lucide-react";

const STATUSES = ["new", "contacted", "converted", "rejected"] as const;
type Status = typeof STATUSES[number];

export default function UserLeads() {
  const { user, loading } = useAuth();
  const [leads, setLeads] = useState<any[]>([]);
  const [pages, setPages] = useState<Record<string, any>>({});
  const [search, setSearch] = useState("");
  const [pageFilter, setPageFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("sales_page_leads").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setLeads(data || []);
    const ids = Array.from(new Set((data || []).map((l: any) => l.sales_page_id)));
    if (ids.length) {
      const { data: p } = await supabase.from("sales_pages").select("id, product_name, slug").in("id", ids);
      const map: any = {}; p?.forEach((x: any) => map[x.id] = x);
      setPages(map);
    }
  };

  useEffect(() => { load(); }, [user]);

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  const filtered = useMemo(() => leads.filter((l) => {
    if (statusFilter !== "all" && l.status !== statusFilter) return false;
    if (pageFilter !== "all" && l.sales_page_id !== pageFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      if (!`${l.name} ${l.phone} ${l.email || ""} ${l.message || ""}`.toLowerCase().includes(s)) return false;
    }
    return true;
  }), [leads, search, pageFilter, statusFilter]);

  const setStatus = async (id: string, status: Status) => {
    const { error } = await supabase.from("sales_page_leads").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Updated");
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this lead?")) return;
    const { error } = await supabase.from("sales_page_leads").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  const exportCSV = () => {
    const rows = [["Name", "Phone", "Email", "Message", "Status", "Sales Page", "Date"]];
    filtered.forEach((l) => rows.push([
      l.name, l.phone, l.email || "", (l.message || "").replace(/\n/g, " "),
      l.status, pages[l.sales_page_id]?.product_name || "", new Date(l.created_at).toISOString(),
    ]));
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `leads-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const wa = (phone: string, name: string) => window.open(`https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Hi ${name}, thanks for your interest!`)}`, "_blank");

  const statusColor = (s: string) => s === "new" ? "default" : s === "contacted" ? "secondary" : s === "converted" ? "default" : "destructive";

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background pb-12">
      <Helmet><title>My Leads | Bethelincovibe TV</title></Helmet>
      <div className="container max-w-5xl mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" asChild><Link to="/dashboard"><ArrowLeft className="h-4 w-4" /></Link></Button>
            <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" />My Leads</h1>
          </div>
          <Button onClick={exportCSV} variant="outline" size="sm"><Download className="h-4 w-4 mr-1" />Export CSV</Button>
        </div>

        <Card>
          <CardContent className="p-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search leads…" className="pl-8" />
            </div>
            <select className="h-10 rounded-md border bg-background px-3 text-sm" value={pageFilter} onChange={(e) => setPageFilter(e.target.value)}>
              <option value="all">All sales pages</option>
              {Object.values(pages).map((p: any) => <option key={p.id} value={p.id}>{p.product_name}</option>)}
            </select>
            <select className="h-10 rounded-md border bg-background px-3 text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All statuses</option>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </CardContent>
        </Card>

        {filtered.length === 0 ? (
          <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">No leads yet — share your sales pages to start capturing enquiries.</CardContent></Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((l) => (
              <Card key={l.id}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <p className="font-semibold">{l.name}</p>
                      <p className="text-xs text-muted-foreground">{new Date(l.created_at).toLocaleString()} • {pages[l.sales_page_id]?.product_name || "—"}</p>
                    </div>
                    <Badge variant={statusColor(l.status) as any}>{l.status}</Badge>
                  </div>
                  <div className="flex gap-2 flex-wrap text-xs">
                    <a href={`tel:${l.phone}`} className="inline-flex items-center gap-1 text-primary hover:underline"><Phone className="h-3 w-3" />{l.phone}</a>
                    <button onClick={() => wa(l.phone, l.name)} className="inline-flex items-center gap-1 text-green-600 hover:underline"><MessageCircle className="h-3 w-3" />WhatsApp</button>
                    {l.email && <a href={`mailto:${l.email}`} className="inline-flex items-center gap-1 text-blue-600 hover:underline"><Mail className="h-3 w-3" />{l.email}</a>}
                  </div>
                  {l.message && <p className="text-sm bg-muted/50 rounded p-2">{l.message}</p>}
                  <div className="flex gap-1 flex-wrap pt-1">
                    {STATUSES.map(s => (
                      <Button key={s} size="sm" variant={l.status === s ? "default" : "outline"} onClick={() => setStatus(l.id, s)} className="text-xs h-7">{s}</Button>
                    ))}
                    <Button size="sm" variant="ghost" onClick={() => remove(l.id)} className="text-destructive h-7"><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
