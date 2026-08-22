import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Image, Upload } from "lucide-react";

interface SlideForm {
  title: string;
  subtitle: string;
  image_url: string;
  link_url: string;
  link_text: string;
  display_order: number;
  active: boolean;
}

const emptyForm: SlideForm = { title: "", subtitle: "", image_url: "", link_url: "", link_text: "", display_order: 0, active: true };

export default function AdminSlides() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<SlideForm>(emptyForm);
  const [uploading, setUploading] = useState(false);

  const { data: slides, isLoading } = useQuery({
    queryKey: ["admin-hero-slides"],
    queryFn: async () => {
      const { data, error } = await supabase.from("hero_slides").select("*").order("display_order");
      if (error) throw error;
      return data;
    },
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `slides/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("slider-images").upload(path, file);
    if (error) { toast.error("Upload failed"); setUploading(false); return; }
    const { data } = supabase.storage.from("slider-images").getPublicUrl(path);
    setForm({ ...form, image_url: data.publicUrl });
    setUploading(false);
  };

  const save = useMutation({
    mutationFn: async () => {
      if (editId) {
        const { error } = await supabase.from("hero_slides").update(form).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("hero_slides").insert(form);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-hero-slides"] });
      qc.invalidateQueries({ queryKey: ["hero-slides"] });
      toast.success(editId ? "Slide updated" : "Slide added");
      setOpen(false);
      setEditId(null);
      setForm(emptyForm);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("hero_slides").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-hero-slides"] });
      qc.invalidateQueries({ queryKey: ["hero-slides"] });
      toast.success("Slide deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const openEdit = (s: any) => {
    setEditId(s.id);
    setForm({ title: s.title || "", subtitle: s.subtitle || "", image_url: s.image_url, link_url: s.link_url || "", link_text: s.link_text || "", display_order: s.display_order, active: s.active });
    setOpen(true);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Image className="h-6 w-6" /> Hero Slides</h1>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditId(null); setForm(emptyForm); } }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1" /> Add Slide</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editId ? "Edit" : "Add"} Slide</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Title (optional)</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div><Label>Subtitle (optional)</Label><Input value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} /></div>
              <div>
                <Label>Slide Image *</Label>
                <div className="flex gap-2 mt-1">
                  <Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="URL or upload below" className="flex-1" />
                </div>
                <div className="mt-2">
                  <Label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 border rounded-md text-sm hover:bg-muted transition-colors">
                    <Upload className="h-4 w-4" />
                    {uploading ? "Uploading..." : "Upload Image"}
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
                  </Label>
                </div>
                {form.image_url && <img src={form.image_url} alt="" className="h-20 rounded object-cover mt-2" />}
              </div>
              <div><Label>Link URL (optional)</Label><Input value={form.link_url} onChange={(e) => setForm({ ...form, link_url: e.target.value })} /></div>
              <div><Label>Link Text</Label><Input value={form.link_text} onChange={(e) => setForm({ ...form, link_text: e.target.value })} placeholder="Learn More" /></div>
              <div><Label>Display Order</Label><Input type="number" value={form.display_order} onChange={(e) => setForm({ ...form, display_order: parseInt(e.target.value) || 0 })} /></div>
              <div className="flex items-center gap-2"><Switch checked={form.active} onCheckedChange={(c) => setForm({ ...form, active: c })} /><Label>Active</Label></div>
              <Button className="w-full" onClick={() => save.mutate()} disabled={!form.image_url || save.isPending}>
                {editId ? "Update" : "Add"} Slide
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? <p className="text-muted-foreground">Loading...</p> : !slides?.length ? (
        <p className="text-muted-foreground">No slides yet. Add your first hero slide!</p>
      ) : (
        <div className="grid gap-4">
          {slides.map((s: any) => (
            <Card key={s.id} className={!s.active ? "opacity-50" : ""}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex gap-3 items-center">
                    {s.image_url && <img src={s.image_url} alt={s.title || "Slide"} className="h-16 w-24 object-cover rounded" />}
                    <div>
                      <CardTitle className="text-base">{s.title || "(No title)"}</CardTitle>
                      {s.subtitle && <p className="text-xs text-muted-foreground">{s.subtitle}</p>}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(s)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => { if (confirm("Delete?")) remove.mutate(s.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 text-xs">
                  <span className="bg-muted px-2 py-0.5 rounded">Order: {s.display_order}</span>
                  <span className={`px-2 py-0.5 rounded ${s.active ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}>
                    {s.active ? "Active" : "Inactive"}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
