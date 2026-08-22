import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Code2, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

const ROUTE_PRESETS = [
  { value: "*", label: "All pages (site-wide)" },
  { value: "/", label: "Home only" },
  { value: "/blog", label: "Blog index" },
  { value: "/blog/*", label: "All blog pages" },
  { value: "/businesses", label: "Business directory index" },
  { value: "/businesses/*", label: "All business directory pages" },
  { value: "/dashboard/*", label: "User dashboard" },
];

export default function AdminCustomCode() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: "", route_pattern: "*", location: "head", code: "", active: true, display_order: 0 });

  const { data: rules } = useQuery({
    queryKey: ["admin-custom-code"],
    queryFn: async () => {
      const { data } = await supabase.from("custom_code_injections").select("*").order("display_order").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (editing) {
        const { error } = await supabase.from("custom_code_injections").update(form).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("custom_code_injections").insert(form);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-custom-code"] }); toast.success("Saved"); reset(); },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("custom_code_injections").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-custom-code"] }); toast.success("Deleted"); },
  });

  const reset = () => { setEditing(null); setForm({ name: "", route_pattern: "*", location: "head", code: "", active: true, display_order: 0 }); setOpen(false); };
  const openEdit = (r: any) => { setEditing(r); setForm({ name: r.name, route_pattern: r.route_pattern, location: r.location, code: r.code, active: r.active, display_order: r.display_order }); setOpen(true); };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2"><Code2 className="h-5 w-5" />Custom Code Engine</h1>
        <Button size="sm" onClick={() => { reset(); setOpen(true); }}><Plus className="h-4 w-4 mr-1" />New</Button>
      </div>
      <p className="text-xs text-muted-foreground mb-4">Inject custom HTML, scripts, or pixels on specific routes. Use route patterns like <code>/blog/*</code> or comma-separated lists.</p>

      <div className="grid gap-2">
        {rules?.map((r: any) => (
          <Card key={r.id}>
            <CardContent className="flex items-center justify-between gap-2 py-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-sm truncate">{r.name}</p>
                  {!r.active && <Badge variant="secondary" className="text-[10px]">Off</Badge>}
                  <Badge variant="outline" className="text-[10px]">{r.location}</Badge>
                </div>
                <p className="text-xs text-muted-foreground truncate font-mono">{r.route_pattern}</p>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { if (confirm("Delete this injection?")) del.mutate(r.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {rules?.length === 0 && <p className="text-center text-muted-foreground py-8 text-sm">No custom code yet.</p>}
      </div>

      <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); else setOpen(v); }}>
        <DialogContent className="max-w-[98vw] sm:max-w-2xl max-h-[95vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit" : "New"} Code Injection</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-3">
            <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="e.g. Facebook Pixel" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Route Pattern</Label>
                <Select value={ROUTE_PRESETS.find(p => p.value === form.route_pattern)?.value || "custom"}
                  onValueChange={(v) => { if (v !== "custom") setForm({ ...form, route_pattern: v }); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROUTE_PRESETS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                    <SelectItem value="custom">Custom...</SelectItem>
                  </SelectContent>
                </Select>
                <Input className="mt-2 font-mono text-xs" value={form.route_pattern} onChange={(e) => setForm({ ...form, route_pattern: e.target.value })} />
              </div>
              <div>
                <Label>Inject Into</Label>
                <Select value={form.location} onValueChange={(v) => setForm({ ...form, location: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="head">&lt;head&gt;</SelectItem>
                    <SelectItem value="body">end of &lt;body&gt;</SelectItem>
                    <SelectItem value="blog-inline">Random inside blog posts</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Code (HTML / JS)</Label>
              <Textarea rows={10} className="font-mono text-xs" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="<script>...</script>" />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} /><Label>Active</Label>
            </div>
            <Button type="submit" className="w-full" disabled={save.isPending}>Save</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
