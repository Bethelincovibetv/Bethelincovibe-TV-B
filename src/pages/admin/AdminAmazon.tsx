import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Plus, Pencil, Trash2, ExternalLink, Upload } from "lucide-react";
import { toast } from "sonner";

const empty = {
  asin: "",
  title: "",
  image_url: "",
  price: "",
  description: "",
  category: "",
  marketplace: "com",
  active: true,
  display_order: 0,
};

export default function AdminAmazon() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>(empty);

  // Load global affiliate settings (single row per key in site_settings)
  const { data: settings } = useQuery({
    queryKey: ["amazon-affiliate-settings"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("key,value")
        .in("key", ["amazon_affiliate_tag", "amazon_marketplace"]);
      const map: Record<string, string> = {};
      data?.forEach((r: any) => { map[r.key] = r.value || ""; });
      return map;
    },
  });
  const [tag, setTag] = useState<string | null>(null);
  const [marketplace, setMarketplace] = useState<string | null>(null);
  const tagValue = tag ?? settings?.amazon_affiliate_tag ?? "";
  const marketplaceValue = marketplace ?? settings?.amazon_marketplace ?? "com";

  const saveSettings = useMutation({
    mutationFn: async () => {
      const upsertKey = async (key: string, value: string) => {
        const { data: existing } = await supabase.from("site_settings").select("id").eq("key", key).maybeSingle();
        if (existing) {
          const { error } = await supabase.from("site_settings").update({ value }).eq("key", key);
          if (error) throw error;
        } else {
          const { error } = await supabase.from("site_settings").insert({ key, value });
          if (error) throw error;
        }
      };
      await upsertKey("amazon_affiliate_tag", tagValue);
      await upsertKey("amazon_marketplace", marketplaceValue);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["amazon-affiliate-settings"] }); qc.invalidateQueries({ queryKey: ["amazon-products"] }); toast.success("Affiliate settings saved"); },
    onError: (e: any) => toast.error(e.message),
  });

  const { data: products } = useQuery({
    queryKey: ["admin-amazon-products"],
    queryFn: async () => {
      const { data } = await supabase
        .from("amazon_products")
        .select("*")
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!form.asin || !form.title) throw new Error("ASIN and title are required");
      if (editing) {
        const { error } = await supabase.from("amazon_products").update(form).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("amazon_products").insert(form);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-amazon-products"] });
      qc.invalidateQueries({ queryKey: ["amazon-products"] });
      toast.success("Saved");
      reset();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("amazon_products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-amazon-products"] }); toast.success("Deleted"); },
  });

  const bulkImport = useMutation({
    mutationFn: async (raw: string) => {
      const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      if (lines.length === 0) throw new Error("Paste at least one ASIN or CSV row");

      // Detect CSV header
      let headers: string[] | null = null;
      let dataLines = lines;
      const first = lines[0].toLowerCase();
      if (first.includes(",") && first.includes("asin")) {
        headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
        dataLines = lines.slice(1);
      }

      const splitCsv = (line: string) => {
        // simple CSV: handles quoted commas
        const out: string[] = [];
        let cur = "", inQ = false;
        for (let i = 0; i < line.length; i++) {
          const ch = line[i];
          if (ch === '"') { inQ = !inQ; continue; }
          if (ch === "," && !inQ) { out.push(cur); cur = ""; continue; }
          cur += ch;
        }
        out.push(cur);
        return out.map((s) => s.trim());
      };

      const rows: any[] = [];
      const errors: string[] = [];
      for (const line of dataLines) {
        const parts = splitCsv(line);
        let row: any = { ...empty };
        if (headers) {
          headers.forEach((h, i) => {
            const v = parts[i] ?? "";
            if (["asin","title","image_url","price","description","category","marketplace"].includes(h)) row[h] = v;
            else if (h === "display_order") row.display_order = parseInt(v) || 0;
            else if (h === "active") row.active = !["false","0","no","off"].includes(v.toLowerCase());
          });
        } else if (parts.length >= 2) {
          // asin,title[,image_url,price,category]
          row.asin = parts[0];
          row.title = parts[1];
          row.image_url = parts[2] || "";
          row.price = parts[3] || "";
          row.category = parts[4] || "";
        } else {
          // ASIN only
          row.asin = parts[0];
          row.title = parts[0]; // placeholder — admin can edit later
        }
        if (!row.asin || row.asin.length < 8) { errors.push(`Skipped: ${line}`); continue; }
        row.asin = row.asin.toUpperCase();
        rows.push(row);
      }

      if (rows.length === 0) throw new Error("No valid rows found");
      const { error } = await supabase.from("amazon_products").upsert(rows, { onConflict: "asin" });
      if (error) throw error;
      return { count: rows.length, skipped: errors.length };
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["admin-amazon-products"] });
      qc.invalidateQueries({ queryKey: ["amazon-products"] });
      toast.success(`Imported ${r.count} product${r.count > 1 ? "s" : ""}${r.skipped ? ` · skipped ${r.skipped}` : ""}`);
      setBulkText("");
      setBulkOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const reset = () => { setEditing(null); setForm(empty); setOpen(false); };
  const openEdit = (r: any) => { setEditing(r); setForm({ ...empty, ...r }); setOpen(true); };

  const onCsvFile = async (file: File) => {
    const text = await file.text();
    setBulkText(text);
  };

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
          <ShoppingCart className="h-5 w-5" /> Amazon Affiliate
        </h1>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setBulkOpen(true)}><Upload className="h-4 w-4 mr-1" />Bulk Import</Button>
          <Button size="sm" onClick={() => { reset(); setOpen(true); }}><Plus className="h-4 w-4 mr-1" />Product</Button>
        </div>
      </div>

      <Card>
        <CardContent className="py-4 space-y-3">
          <div>
            <Label>Amazon Associate Tag (ID)</Label>
            <Input
              value={tagValue}
              onChange={(e) => setTag(e.target.value)}
              placeholder="yourtag-20"
              className="font-mono"
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              This is auto-appended as <code>?tag=yourtag-20</code> to every product link across the site.
              Get yours at{" "}
              <a href="https://affiliate-program.amazon.com/" target="_blank" rel="noopener" className="text-primary underline">
                Amazon Associates
              </a>.
            </p>
          </div>
          <div>
            <Label>Marketplace</Label>
            <select
              className="w-full h-10 rounded-md border bg-background px-3 text-sm"
              value={marketplaceValue}
              onChange={(e) => setMarketplace(e.target.value)}
            >
              <option value="com">amazon.com (US)</option>
              <option value="co.uk">amazon.co.uk (UK)</option>
              <option value="ca">amazon.ca (Canada)</option>
              <option value="com.au">amazon.com.au (Australia)</option>
              <option value="de">amazon.de (Germany)</option>
              <option value="fr">amazon.fr (France)</option>
              <option value="it">amazon.it (Italy)</option>
              <option value="es">amazon.es (Spain)</option>
              <option value="in">amazon.in (India)</option>
              <option value="ae">amazon.ae (UAE)</option>
              <option value="sa">amazon.sa (Saudi Arabia)</option>
              <option value="com.br">amazon.com.br (Brazil)</option>
              <option value="com.mx">amazon.com.mx (Mexico)</option>
              <option value="co.jp">amazon.co.jp (Japan)</option>
            </select>
          </div>
          <Button size="sm" onClick={() => saveSettings.mutate()} disabled={saveSettings.isPending}>Save affiliate settings</Button>
        </CardContent>
      </Card>

      <div className="grid gap-2">
        {products?.map((p: any) => {
          const href = `https://www.amazon.${p.marketplace || marketplaceValue}/dp/${p.asin}${tagValue ? `?tag=${encodeURIComponent(tagValue)}` : ""}`;
          return (
            <Card key={p.id}>
              <CardContent className="flex items-center gap-3 py-3">
                {p.image_url && <img src={p.image_url} alt="" className="h-14 w-14 rounded-md object-cover shrink-0" />}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm truncate">{p.title}</p>
                    {!p.active && <Badge variant="secondary" className="text-[10px]">Off</Badge>}
                    {p.category && <Badge variant="outline" className="text-[10px]">{p.category}</Badge>}
                  </div>
                  <a href={href} target="_blank" rel="noopener" className="text-[11px] text-muted-foreground truncate font-mono flex items-center gap-1 hover:text-primary">
                    {p.asin} · {p.price || "—"} <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { if (confirm("Delete this product?")) del.mutate(p.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {(!products || products.length === 0) && (
          <p className="text-center text-muted-foreground py-8 text-sm">No products yet. Add your first Amazon product above.</p>
        )}
      </div>

      <Dialog open={bulkOpen} onOpenChange={(v) => { if (!v) { setBulkOpen(false); } else setBulkOpen(v); }}>
        <DialogContent className="max-w-[98vw] sm:max-w-2xl max-h-[95vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Upload className="h-4 w-4" />Bulk import Amazon products</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="text-xs space-y-1.5 rounded-md bg-muted/50 p-3">
              <p className="font-semibold">Accepted formats:</p>
              <p>• <b>One ASIN per line</b> — e.g. <code className="font-mono">B08N5WRWNW</code></p>
              <p>• <b>Simple CSV</b> — <code className="font-mono">asin,title,image_url,price,category</code></p>
              <p>• <b>CSV with header</b> — first line: <code className="font-mono">asin,title,image_url,price,description,category,marketplace,display_order,active</code></p>
              <p className="text-muted-foreground pt-1">Existing ASINs are updated. New ones are inserted. Your affiliate tag is auto-applied when displayed.</p>
            </div>
            <div>
              <Label>Upload CSV file</Label>
              <Input type="file" accept=".csv,text/csv,text/plain" onChange={(e) => { const f = e.target.files?.[0]; if (f) onCsvFile(f); }} />
            </div>
            <div>
              <Label>Or paste rows</Label>
              <Textarea rows={10} value={bulkText} onChange={(e) => setBulkText(e.target.value)} placeholder={"asin,title,image_url,price,category\nB08N5WRWNW,Echo Dot (4th Gen),https://...,$29.99,electronics\nB07XJ8C8F5,Kindle Paperwhite,,,,"} className="font-mono text-xs" />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setBulkOpen(false)}>Cancel</Button>
              <Button size="sm" onClick={() => bulkImport.mutate(bulkText)} disabled={bulkImport.isPending || !bulkText.trim()}>
                {bulkImport.isPending ? "Importing…" : "Import"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>


      <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); else setOpen(v); }}>
        <DialogContent className="max-w-[98vw] sm:max-w-2xl max-h-[95vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit" : "New"} Amazon Product</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>ASIN <span className="text-destructive">*</span></Label>
                <Input required value={form.asin} onChange={(e) => setForm({ ...form, asin: e.target.value.trim() })} placeholder="B08N5WRWNW" className="font-mono uppercase" />
                <p className="text-[10px] text-muted-foreground mt-1">10-char product ID from the Amazon URL.</p>
              </div>
              <div>
                <Label>Marketplace override</Label>
                <Input value={form.marketplace} onChange={(e) => setForm({ ...form, marketplace: e.target.value })} placeholder="com" />
              </div>
            </div>
            <div>
              <Label>Title <span className="text-destructive">*</span></Label>
              <Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <Label>Image URL</Label>
              <Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="https://m.media-amazon.com/images/..." className="font-mono text-xs" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Price (display only)</Label>
                <Input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="$29.99" />
              </div>
              <div>
                <Label>Category slug (optional)</Label>
                <Input value={form.category || ""} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="marketing-sales" />
              </div>
            </div>
            <div>
              <Label>Short description</Label>
              <Textarea rows={2} value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3 items-end">
              <div>
                <Label>Display order</Label>
                <Input type="number" value={form.display_order} onChange={(e) => setForm({ ...form, display_order: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
                <Label>Active</Label>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={save.isPending}>Save</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
