import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Sparkles, Eye, Trash2, ExternalLink, Power, Search, Edit } from "lucide-react";

export default function AdminSalesPages() {
  const [rows, setRows] = useState<any[]>([]);
  const [profilesMap, setProfilesMap] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "disabled">("all");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("sales_pages")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    const pages = data || [];
    setRows(pages);

    const userIds = Array.from(new Set(pages.map((p: any) => p.user_id).filter(Boolean)));
    if (userIds.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, display_name, email, username, avatar_url")
        .in("user_id", userIds);
      const map: Record<string, any> = {};
      (profs || []).forEach((p: any) => { map[p.user_id] = p; });
      setProfilesMap(map);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggle = async (p: any) => {
    const { error } = await supabase.from("sales_pages").update({ active: !p.active }).eq("id", p.id);
    if (error) { toast.error(error.message); return; }
    toast.success(p.active ? "Disabled" : "Enabled");
    load();
  };

  const remove = async (p: any) => {
    if (!confirm(`Delete "${p.product_name}"?`)) return;
    const { error } = await supabase.from("sales_pages").delete().eq("id", p.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Deleted");
    load();
  };

  const filtered = useMemo(() => {
    return rows.filter((p) => {
      if (filter === "active" && !p.active) return false;
      if (filter === "disabled" && p.active) return false;
      if (!q.trim()) return true;
      const owner = profilesMap[p.user_id];
      const haystack = [
        p.product_name, p.slug, p.headline, p.contact_whatsapp, p.contact_email,
        owner?.display_name, owner?.email, owner?.username,
      ].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(q.toLowerCase());
    });
  }, [rows, profilesMap, q, filter]);

  const totals = rows.reduce((acc, r) => {
    acc.views += r.views_count || 0;
    acc.clicks += r.clicks_count || 0;
    return acc;
  }, { views: 0, clicks: 0 });

  return (
    <div className="space-y-4 max-w-6xl">
      <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />Sales Pages
      </h1>

      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total pages</p><p className="text-2xl font-bold">{rows.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total views</p><p className="text-2xl font-bold">{totals.views.toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total clicks</p><p className="text-2xl font-bold">{totals.clicks.toLocaleString()}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All sales pages ({filtered.length})</CardTitle>
          <div className="flex flex-col sm:flex-row gap-2 mt-2">
            <div className="relative flex-1">
              <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search product, owner, slug…" className="pl-8" />
            </div>
            <div className="flex gap-1">
              {(["all", "active", "disabled"] as const).map((f) => (
                <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)} className="capitalize">{f}</Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? <p className="text-muted-foreground text-sm">Loading…</p>
            : filtered.length === 0 ? <p className="text-muted-foreground text-sm">No sales pages found.</p>
            : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b">
                    <tr className="text-left text-xs text-muted-foreground">
                      <th className="py-2 pr-3">Product</th>
                      <th className="py-2 pr-3">Owner</th>
                      <th className="py-2 pr-3">Views</th>
                      <th className="py-2 pr-3">Clicks</th>
                      <th className="py-2 pr-3">Status</th>
                      <th className="py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((p) => {
                      const owner = profilesMap[p.user_id];
                      return (
                        <tr key={p.id} className="border-b last:border-0">
                          <td className="py-3 pr-3">
                            <Link to={`/sales/${p.slug}`} target="_blank" className="font-medium hover:text-primary flex items-center gap-1">
                              {p.product_name}<ExternalLink className="h-3 w-3" />
                            </Link>
                            <p className="text-[11px] text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</p>
                          </td>
                          <td className="py-3 pr-3 text-xs">
                            {owner?.display_name || owner?.username || owner?.email || <span className="text-muted-foreground">Unknown</span>}
                            {owner?.email && <p className="text-[10px] text-muted-foreground">{owner.email}</p>}
                          </td>
                          <td className="py-3 pr-3"><span className="flex items-center gap-1"><Eye className="h-3 w-3" />{p.views_count || 0}</span></td>
                          <td className="py-3 pr-3">{p.clicks_count || 0}</td>
                          <td className="py-3 pr-3">{p.active ? <Badge variant="secondary">Active</Badge> : <Badge variant="destructive">Disabled</Badge>}</td>
                          <td className="py-3">
                            <div className="flex gap-1">
                              <Button size="sm" variant="ghost" asChild title="Edit"><Link to={`/dashboard/sales-pages/${p.id}/edit`}><Edit className="h-3.5 w-3.5" /></Link></Button>
                              <Button size="sm" variant="ghost" onClick={() => toggle(p)} title="Toggle active"><Power className="h-3.5 w-3.5" /></Button>
                              <Button size="sm" variant="ghost" onClick={() => remove(p)} className="text-destructive" title="Delete"><Trash2 className="h-3.5 w-3.5" /></Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
