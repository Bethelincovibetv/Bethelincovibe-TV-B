import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Sparkles, Search, Trash2, Download, Phone, MessageCircle, Mail } from "lucide-react";
import { waLink } from "@/lib/phone";

const STATUSES = ["all", "new", "contacted", "converted", "rejected"] as const;

export default function AdminLeads() {
  const [leads, setLeads] = useState<any[]>([]);
  const [pages, setPages] = useState<Record<string, any>>({});
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<typeof STATUSES[number]>("all");

  const load = async () => {
    setLoading(true);
    const { data: ld } = await supabase.from("sales_page_leads").select("*").order("created_at", { ascending: false });
    const list = ld || [];
    setLeads(list);
    const pageIds = Array.from(new Set(list.map((l) => l.sales_page_id)));
    const userIds = Array.from(new Set(list.map((l) => l.user_id)));
    if (pageIds.length) {
      const { data: p } = await supabase.from("sales_pages").select("id, product_name, slug").in("id", pageIds);
      const m: any = {}; p?.forEach((x: any) => m[x.id] = x); setPages(m);
    }
    if (userIds.length) {
      const { data: pr } = await supabase.from("profiles").select("user_id, display_name, email, username").in("user_id", userIds);
      const m: any = {}; pr?.forEach((x: any) => m[x.user_id] = x); setProfiles(m);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => leads.filter((l) => {
    if (status !== "all" && l.status !== status) return false;
    if (q.trim()) {
      const s = q.toLowerCase();
      const owner = profiles[l.user_id];
      const haystack = `${l.name} ${l.phone} ${l.email || ""} ${pages[l.sales_page_id]?.product_name || ""} ${owner?.display_name || ""} ${owner?.email || ""}`.toLowerCase();
      if (!haystack.includes(s)) return false;
    }
    return true;
  }), [leads, q, status, pages, profiles]);

  const remove = async (id: string) => {
    if (!confirm("Delete this lead?")) return;
    const { error } = await supabase.from("sales_page_leads").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };
  const setStatusFor = async (id: string, s: string) => {
    const { error } = await supabase.from("sales_page_leads").update({ status: s }).eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  const exportCSV = () => {
    const rows = [["Name", "Phone", "Email", "Message", "Status", "Sales Page", "Owner", "Date"]];
    filtered.forEach((l) => {
      const o = profiles[l.user_id];
      rows.push([l.name, l.phone, l.email || "", (l.message || "").replace(/\n/g, " "), l.status,
        pages[l.sales_page_id]?.product_name || "", o?.display_name || o?.email || "", new Date(l.created_at).toISOString()]);
    });
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `all-leads-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 max-w-6xl">
      <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" />All Leads ({leads.length})</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filter</CardTitle>
          <div className="flex flex-col sm:flex-row gap-2 mt-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, phone, product, owner…" className="pl-8" />
            </div>
            <select className="h-10 rounded-md border bg-background px-3 text-sm" value={status} onChange={(e) => setStatus(e.target.value as any)}>
              {STATUSES.map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
            </select>
            <Button size="sm" variant="outline" onClick={exportCSV}><Download className="h-3.5 w-3.5 mr-1" />CSV</Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? <p className="text-sm text-muted-foreground">Loading…</p>
            : filtered.length === 0 ? <p className="text-sm text-muted-foreground">No leads found.</p>
            : (
              <div className="space-y-2">
                {filtered.map((l) => {
                  const o = profiles[l.user_id];
                  const wa = waLink(l.phone, `Hi ${l.name}, regarding your enquiry on Bethelincovibe TV…`);
                  return (
                    <div key={l.id} className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="min-w-0">
                          <p className="font-semibold text-sm">{l.name}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {pages[l.sales_page_id]?.product_name || "—"} • Owner: {o?.display_name || o?.email || "Unknown"} • {new Date(l.created_at).toLocaleString()}
                          </p>
                        </div>
                        <Badge variant="outline" className="capitalize text-xs">{l.status}</Badge>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs">
                        <a href={`tel:${l.phone}`} className="inline-flex items-center gap-1 text-primary"><Phone className="h-3 w-3" />{l.phone}</a>
                        {wa && <a href={wa} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-green-600"><MessageCircle className="h-3 w-3" />WhatsApp</a>}
                        {l.email && <a href={`mailto:${l.email}`} className="inline-flex items-center gap-1 text-blue-600"><Mail className="h-3 w-3" />{l.email}</a>}
                      </div>
                      {l.message && <p className="text-xs bg-muted/40 rounded p-2">{l.message}</p>}
                      <div className="flex gap-1 flex-wrap">
                        {STATUSES.filter(s => s !== "all").map((s) => (
                          <Button key={s} size="sm" variant={l.status === s ? "default" : "outline"} onClick={() => setStatusFor(l.id, s)} className="text-[11px] h-7 capitalize">{s}</Button>
                        ))}
                        <Button size="sm" variant="ghost" onClick={() => remove(l.id)} className="text-destructive h-7"><Trash2 className="h-3 w-3" /></Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
