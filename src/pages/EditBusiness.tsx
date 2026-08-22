import { useEffect, useState } from "react";
import { useParams, useNavigate, Link, Navigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ChevronLeft, Loader2, Plus, Trash2, ImagePlus } from "lucide-react";

type Service = { title: string; description?: string; image_url?: string; link_url?: string };

export default function EditBusiness() {
  const { id } = useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cats, setCats] = useState<any[]>([]);
  const [form, setForm] = useState<any>(null);
  const [socials, setSocials] = useState<any>({});
  const [services, setServices] = useState<Service[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: b }, { data: c }] = await Promise.all([
        supabase.from("suppliers").select("*").eq("id", id!).maybeSingle(),
        supabase.from("categories").select("*").eq("type", "business").order("name"),
      ]);
      if (!b || b.submitted_by !== user.id) { toast.error("Not found"); navigate("/dashboard/businesses"); return; }
      setForm(b);
      setSocials(b.social_links || {});
      setServices(Array.isArray(b.services) ? (b.services as any as Service[]) : []);
      setCats(c ?? []);
      setLoading(false);
    })();
  }, [id, user, navigate]);

  if (authLoading) return <div className="p-12 text-center">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (loading || !form) return <div className="p-12 text-center"><Loader2 className="h-6 w-6 mx-auto animate-spin" /></div>;

  const onLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const path = `submissions/${user.id}/${Date.now()}.${file.name.split(".").pop()}`;
    const { error } = await supabase.storage.from("supplier-logos").upload(path, file);
    if (error) { toast.error("Upload failed"); return; }
    const { data } = supabase.storage.from("supplier-logos").getPublicUrl(path);
    setForm({ ...form, logo_url: data.publicUrl });
  };

  const onCover = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const path = `covers/${user.id}/${Date.now()}.${file.name.split(".").pop()}`;
    const { error } = await supabase.storage.from("supplier-logos").upload(path, file);
    if (error) { toast.error("Cover upload failed"); return; }
    const { data } = supabase.storage.from("supplier-logos").getPublicUrl(path);
    setForm({ ...form, cover_url: data.publicUrl, cover_template: null });
  };

  const COVER_TEMPLATES = [
    { key: "purple", className: "bg-gradient-to-br from-fuchsia-600 via-purple-600 to-indigo-600" },
    { key: "emerald", className: "bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600" },
    { key: "sunset", className: "bg-gradient-to-br from-orange-500 via-pink-500 to-rose-600" },
    { key: "ocean", className: "bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-700" },
    { key: "noir", className: "bg-gradient-to-br from-zinc-800 via-zinc-900 to-black" },
    { key: "gold", className: "bg-gradient-to-br from-amber-400 via-yellow-500 to-orange-600" },
  ];

  const onServiceImage = async (idx: number, file: File) => {
    const path = `services/${user.id}/${Date.now()}_${idx}.${file.name.split(".").pop()}`;
    const { error } = await supabase.storage.from("supplier-logos").upload(path, file);
    if (error) { toast.error("Image upload failed"); return; }
    const { data } = supabase.storage.from("supplier-logos").getPublicUrl(path);
    setServices((s) => s.map((sv, i) => i === idx ? { ...sv, image_url: data.publicUrl } : sv));
  };

  const addService = () => setServices((s) => [...s, { title: "", description: "", image_url: "" }]);
  const removeService = (idx: number) => setServices((s) => s.filter((_, i) => i !== idx));
  const updateService = (idx: number, patch: Partial<Service>) =>
    setServices((s) => s.map((sv, i) => i === idx ? { ...sv, ...patch } : sv));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const cleaned = services.filter((s) => s.title.trim());
    const { error } = await supabase.from("suppliers").update({
      name: form.name, description: form.description, phone: form.phone,
      address: form.address, website: form.website, logo_url: form.logo_url,
      cover_url: form.cover_url || null, cover_template: form.cover_template || null,
      category_id: form.category_id || null, social_links: socials, services: cleaned,
    }).eq("id", form.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else { toast.success("Saved"); navigate("/dashboard/businesses"); }
  };

  return (
    <>
      <Helmet><title>Edit Business | Bethelincovibe TV</title></Helmet>
      <div className="container mx-auto max-w-2xl px-4 py-6">
        <Button asChild variant="ghost" size="sm" className="mb-3"><Link to="/dashboard/businesses"><ChevronLeft className="h-4 w-4 mr-1" />Back</Link></Button>
        <Card>
          <CardHeader><CardTitle>Edit Business</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={save} className="space-y-4">
              <div className="space-y-2"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Category</Label>
                  <Select value={form.category_id || ""} onValueChange={(v) => setForm({ ...form, category_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{cats.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Phone</Label><Input value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              </div>
              <div className="space-y-2"><Label>Address</Label><Input value={form.address || ""} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
              <div className="space-y-2"><Label>Website</Label><Input value={form.website || ""} onChange={(e) => setForm({ ...form, website: e.target.value })} /></div>
              <div className="space-y-2"><Label>Description</Label><Textarea rows={4} value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div className="space-y-2"><Label>Logo</Label><Input type="file" accept="image/*" onChange={onLogo} />
                {form.logo_url && <img src={form.logo_url} className="h-16 rounded mt-2" alt="" />}
              </div>

              <div className="space-y-2">
                <Label>Cover / Background photo</Label>
                <Input type="file" accept="image/*" onChange={onCover} />
                {form.cover_url && (
                  <img src={form.cover_url} className="h-24 w-full object-cover rounded mt-2" alt="" />
                )}
                <p className="text-xs text-muted-foreground">Or pick a branded background:</p>
                <div className="grid grid-cols-3 gap-2">
                  {COVER_TEMPLATES.map((t) => (
                    <button type="button" key={t.key}
                      onClick={() => setForm({ ...form, cover_template: t.key, cover_url: null })}
                      className={`h-12 rounded-md ${t.className} ${form.cover_template === t.key ? "ring-2 ring-primary ring-offset-2" : ""}`}
                      aria-label={`Use ${t.key} background`}
                    />
                  ))}
                </div>
              </div>

              {/* SERVICES */}
              <div className="space-y-3 pt-2 border-t">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Services</Label>
                  <Button type="button" size="sm" variant="outline" onClick={addService}>
                    <Plus className="h-3.5 w-3.5 mr-1" />Add service
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Each service shows on your profile and customers can tap it to chat with you.</p>
                {services.map((svc, idx) => (
                  <Card key={idx} className="p-3 space-y-2 bg-muted/30">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Service title (e.g. Wedding cake)"
                        value={svc.title}
                        onChange={(e) => updateService(idx, { title: e.target.value })}
                      />
                      <Button type="button" size="icon" variant="ghost" onClick={() => removeService(idx)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                    <Textarea
                      rows={2}
                      placeholder="Short description (optional)"
                      value={svc.description || ""}
                      onChange={(e) => updateService(idx, { description: e.target.value })}
                    />
                    <Input
                      placeholder="Action link (optional) — e.g. https://wa.me/234... or product page"
                      value={svc.link_url || ""}
                      onChange={(e) => updateService(idx, { link_url: e.target.value })}
                    />
                    <div className="flex items-center gap-3">
                      {svc.image_url && <img src={svc.image_url} alt="" className="h-14 w-14 rounded object-cover" />}
                      <label className="text-xs text-primary cursor-pointer flex items-center gap-1">
                        <ImagePlus className="h-3.5 w-3.5" />
                        {svc.image_url ? "Replace image" : "Upload image"}
                        <input type="file" accept="image/*" className="hidden"
                          onChange={(e) => { const f = e.target.files?.[0]; if (f) onServiceImage(idx, f); }} />
                      </label>
                    </div>
                  </Card>
                ))}
              </div>

              <div className="grid sm:grid-cols-2 gap-3 pt-2 border-t">
                <div className="space-y-2"><Label>WhatsApp</Label><Input value={socials.whatsapp || ""} onChange={(e) => setSocials({ ...socials, whatsapp: e.target.value })} placeholder="+234..." /></div>
                <div className="space-y-2"><Label>Email</Label><Input value={socials.email || ""} onChange={(e) => setSocials({ ...socials, email: e.target.value })} /></div>
                <div className="space-y-2"><Label>Instagram</Label><Input value={socials.instagram || ""} onChange={(e) => setSocials({ ...socials, instagram: e.target.value })} /></div>
                <div className="space-y-2"><Label>Facebook</Label><Input value={socials.facebook || ""} onChange={(e) => setSocials({ ...socials, facebook: e.target.value })} /></div>
              </div>
              <Button type="submit" disabled={saving} className="w-full">{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Save changes</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
