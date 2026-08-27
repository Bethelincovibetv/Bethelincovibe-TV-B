import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Pencil, Trash2, ImagePlus, X, Check, Clock, Zap, Sparkles, Building2, Calendar, DollarSign, Tag } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

const generateSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const emptyForm = { name: "", slug: "", category_id: "", description: "", phone: "", address: "", website: "", logo_url: "", social_links: "{}", featured: false, active: true };

const DEFAULT_BOOST_PACKAGES = [
  { key: "3d", days: 3, price: 1000, label: "3 Days Spotlight" },
  { key: "7d", days: 7, price: 2000, label: "7 Days Spotlight" },
  { key: "14d", days: 14, price: 3500, label: "14 Days High Visibility" },
  { key: "30d", days: 30, price: 6500, label: "30 Days Maximum Impact" },
];

export default function AdminBusinesses() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("directory");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);
  const [galleryUploading, setGalleryUploading] = useState(false);

  const { data: businesses } = useQuery({
    queryKey: ["admin-businesses"],
    queryFn: async () => {
      const { data } = await supabase.from("suppliers").select("*, categories(name)").order("name");
      return data ?? [];
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["business-categories"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("*").eq("type", "business").order("name");
      return data ?? [];
    },
  });

  const { data: boosts } = useQuery({
    queryKey: ["admin-business-boosts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("business_boosts")
        .select("*, suppliers(name, slug)")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: galleryImages, refetch: refetchGallery } = useQuery({
    queryKey: ["business-gallery", editing?.id],
    queryFn: async () => {
      if (!editing?.id) return [];
      const { data } = await supabase.from("supplier_images").select("*").eq("supplier_id", editing.id).order("display_order");
      return data ?? [];
    },
    enabled: !!editing?.id,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      let socialLinks = {};
      try { socialLinks = JSON.parse(data.social_links); } catch {}
      const payload = {
        name: data.name, slug: data.slug, category_id: data.category_id || null,
        description: data.description || null, phone: data.phone || null,
        address: data.address || null, website: data.website || null,
        logo_url: data.logo_url || null, social_links: socialLinks,
        featured: data.featured, active: data.active,
      };
      if (data.id) {
        const { error } = await supabase.from("suppliers").update(payload).eq("id", data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("suppliers").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-businesses"] });
      toast.success(editing ? "Business updated" : "Business added");
      resetForm();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("suppliers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-businesses"] });
      toast.success("Business deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("suppliers")
        .update({ status: "approved", active: true, rejection_reason: null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-businesses"] });
      toast.success("Business approved & published");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { error } = await supabase
        .from("suppliers")
        .update({ status: "rejected", active: false, rejection_reason: reason })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-businesses"] });
      toast.success("Submission rejected");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const resetForm = () => { setForm(emptyForm); setEditing(null); setOpen(false); };

  const openEdit = (s: any) => {
    setEditing(s);
    setForm({
      name: s.name, slug: s.slug, category_id: s.category_id || "", description: s.description || "",
      phone: s.phone || "", address: s.address || "", website: s.website || "", logo_url: s.logo_url || "",
      social_links: JSON.stringify(s.social_links || {}, null, 2), featured: s.featured, active: s.active,
    });
    setOpen(true);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const path = `logos/${Date.now()}.${file.name.split(".").pop()}`;
    const { error } = await supabase.storage.from("supplier-logos").upload(path, file);
    if (error) { toast.error("Upload failed"); return; }
    const { data } = supabase.storage.from("supplier-logos").getPublicUrl(path);
    setForm({ ...form, logo_url: data.publicUrl });
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editing?.id) return;
    const files = e.target.files;
    if (!files?.length) return;
    setGalleryUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const path = `gallery/${editing.id}/${Date.now()}_${i}.${file.name.split(".").pop()}`;
        const { error: uploadErr } = await supabase.storage.from("supplier-logos").upload(path, file);
        if (uploadErr) { toast.error(`Failed to upload ${file.name}`); continue; }
        const { data: urlData } = supabase.storage.from("supplier-logos").getPublicUrl(path);
        await supabase.from("supplier_images").insert({
          supplier_id: editing.id,
          image_url: urlData.publicUrl,
          display_order: (galleryImages?.length ?? 0) + i,
        });
      }
      refetchGallery();
      toast.success("Images uploaded");
    } finally {
      setGalleryUploading(false);
    }
  };

  const deleteGalleryImage = async (imgId: string) => {
    await supabase.from("supplier_images").delete().eq("id", imgId);
    refetchGallery();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" /> Business Directory & Promotions
          </h1>
          <p className="text-sm text-muted-foreground">Manage directory businesses, submissions, and Feature My Business promotions.</p>
        </div>
        <Button size="sm" onClick={() => { resetForm(); setOpen(true); }} className="rounded-xl font-bold">
          <Plus className="h-4 w-4 mr-1" />Add Business
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 sm:w-auto">
          <TabsTrigger value="directory">Directory Businesses</TabsTrigger>
          <TabsTrigger value="promotions" className="gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            Feature Promotions & Pricing
          </TabsTrigger>
        </TabsList>

        <TabsContent value="directory" className="space-y-4 mt-4">
          <AutoApproveCard />

          {/* Pending submissions */}
          {(() => {
            const pending = businesses?.filter((s: any) => s.status === "pending") ?? [];
            if (pending.length === 0) return null;
            return (
              <div className="mb-6">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-2">
                  <Clock className="h-4 w-4" /> Pending Submissions ({pending.length})
                </h2>
                <div className="grid gap-3">
                  {pending.map((s: any) => (
                    <Card key={s.id} className="border-amber-500/40 bg-amber-50/30 dark:bg-amber-950/10">
                      <CardContent className="flex flex-col sm:flex-row sm:items-center gap-3 py-4">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          {s.logo_url && <img src={s.logo_url} alt="" className="h-12 w-12 rounded object-cover flex-shrink-0" />}
                          <div className="min-w-0">
                            <p className="font-medium truncate">{s.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{s.categories?.name || "No category"} · {s.phone || "no phone"}</p>
                            {s.description && <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{s.description}</p>}
                          </div>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <Button size="sm" variant="outline" onClick={() => openEdit(s)}><Pencil className="h-3.5 w-3.5 mr-1" />Review</Button>
                          <Button size="sm" onClick={() => approveMutation.mutate(s.id)}><Check className="h-3.5 w-3.5 mr-1" />Approve</Button>
                          <Button size="sm" variant="destructive" onClick={() => {
                            const reason = prompt("Rejection reason (optional):") || "";
                            rejectMutation.mutate({ id: s.id, reason });
                          }}><X className="h-3.5 w-3.5" /></Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })()}

          <div className="grid gap-3">
            {businesses?.filter((s: any) => s.status !== "pending").map((s: any) => {
              const isBoosted = s.boosted_until && new Date(s.boosted_until) > new Date();
              return (
                <Card key={s.id}>
                  <CardContent className="flex items-center justify-between py-4">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {s.logo_url && <img src={s.logo_url} alt="" className="h-10 w-10 rounded-xl object-cover flex-shrink-0" />}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium truncate">{s.name}</p>
                          {isBoosted ? (
                            <Badge className="bg-amber-500 text-white text-xs gap-1">
                              <Sparkles className="h-3 w-3" />Featured until {new Date(s.boosted_until).toLocaleDateString()}
                            </Badge>
                          ) : s.featured ? (
                            <Badge variant="secondary" className="text-xs">Featured</Badge>
                          ) : null}
                          {s.status === "rejected" && <Badge variant="destructive" className="text-xs">Rejected</Badge>}
                          {!s.active && s.status !== "rejected" && <Badge variant="outline" className="text-xs">Inactive</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground">{s.categories?.name || "No Category"}</p>
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(s)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => { if (confirm("Delete?")) deleteMutation.mutate(s.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {businesses?.length === 0 && <p className="text-center text-muted-foreground py-8">No businesses yet</p>}
          </div>
        </TabsContent>

        <TabsContent value="promotions" className="space-y-6 mt-4">
          <PackagesConfigCard />

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" />
                Active & Past Business Promotions ({boosts?.length || 0})
              </CardTitle>
              <CardDescription>
                Track which businesses have used &ldquo;Feature My Business&rdquo; promotions with starts, duration, and amounts paid.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {boosts && boosts.length > 0 ? (
                <div className="space-y-3">
                  {boosts.map((b: any) => {
                    const active = b.ends_at && new Date(b.ends_at) > new Date();
                    return (
                      <div key={b.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border bg-card gap-2 text-xs">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-foreground">{b.suppliers?.name || "Business ID: " + b.business_id.slice(0, 8)}</span>
                            <Badge variant={active ? "default" : "secondary"} className={active ? "bg-amber-500 text-white" : ""}>
                              {active ? "Active" : "Expired"}
                            </Badge>
                          </div>
                          <p className="text-muted-foreground">
                            Package: <span className="font-semibold text-foreground">{b.package_key}</span> · {b.duration_days} days
                          </p>
                        </div>
                        <div className="text-right sm:text-right space-y-0.5">
                          <div className="font-bold text-primary text-sm">₦{Number(b.amount || 0).toLocaleString()}</div>
                          <div className="text-muted-foreground text-[11px]">
                            {new Date(b.starts_at || b.created_at).toLocaleDateString()} → {new Date(b.ends_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8 text-sm">No business promotions recorded yet.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); setOpen(v); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit" : "Add"} Business</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate({ ...form, id: editing?.id }); }} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value, slug: editing ? form.slug : generateSlug(e.target.value) })} required /></div>
              <div className="space-y-2"><Label>Slug</Label><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} required /></div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{categories?.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            </div>
            <div className="space-y-2"><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            <div className="space-y-2"><Label>Website</Label><Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://..." /></div>
            <div className="space-y-2"><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div className="space-y-2">
              <Label>Logo</Label>
              <Input type="file" accept="image/*" onChange={handleLogoUpload} />
              {form.logo_url && <img src={form.logo_url} alt="" className="h-16 rounded object-cover" />}
            </div>

            {editing?.id && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><ImagePlus className="h-4 w-4" /> Product Gallery</Label>
                <Input type="file" accept="image/*" multiple onChange={handleGalleryUpload} disabled={galleryUploading} />
                {galleryImages && galleryImages.length > 0 && (
                  <div className="grid grid-cols-4 gap-2 mt-2">
                    {galleryImages.map((img: any) => (
                      <div key={img.id} className="relative group">
                        <img src={img.image_url} alt={img.caption || ""} className="h-20 w-full rounded object-cover" />
                        <button type="button" onClick={() => deleteGalleryImage(img.id)} className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2"><Label>Social Links (JSON)</Label><Textarea value={form.social_links} onChange={(e) => setForm({ ...form, social_links: e.target.value })} placeholder='{"facebook": "...", "instagram": "..."}' /></div>
            <div className="flex gap-6">
              <div className="flex items-center gap-2"><Switch checked={form.featured} onCheckedChange={(v) => setForm({ ...form, featured: v })} /><Label>Featured</Label></div>
              <div className="flex items-center gap-2"><Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} /><Label>Active</Label></div>
            </div>
            <Button type="submit" className="w-full" disabled={saveMutation.isPending}>{editing ? "Update" : "Add"} Business</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PackagesConfigCard() {
  const [pkgs, setPkgs] = useState<any[]>(DEFAULT_BOOST_PACKAGES);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("site_settings").select("value").eq("key", "boost_packages").maybeSingle();
      if (data?.value) {
        try {
          const parsed = JSON.parse(data.value);
          if (Array.isArray(parsed) && parsed.length > 0) setPkgs(parsed);
        } catch {}
      }
    })();
  }, []);

  const updatePkg = (index: number, field: string, value: any) => {
    const next = [...pkgs];
    next[index] = { ...next[index], [field]: value };
    setPkgs(next);
  };

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("site_settings").upsert({
      key: "boost_packages",
      value: JSON.stringify(pkgs),
    }, { onConflict: "key" });
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Feature My Business packages saved!");
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-primary" /> Feature My Business Pricing & Duration Packages
        </CardTitle>
        <CardDescription>
          Configure the duration (days) and price (₦) for users when purchasing &ldquo;Feature My Business&rdquo; promotions.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {pkgs.map((p, i) => (
            <div key={i} className="p-3 border rounded-xl bg-muted/20 space-y-2">
              <Label className="text-xs font-bold">Package {i + 1} Label</Label>
              <Input
                value={p.label}
                onChange={(e) => updatePkg(i, "label", e.target.value)}
                className="h-8 text-xs"
              />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[11px]">Days</Label>
                  <Input
                    type="number"
                    value={p.days}
                    onChange={(e) => updatePkg(i, "days", Number(e.target.value))}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-[11px]">Price (₦)</Label>
                  <Input
                    type="number"
                    value={p.price}
                    onChange={(e) => updatePkg(i, "price", Number(e.target.value))}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
        <Button onClick={save} disabled={saving} size="sm" className="rounded-xl font-bold">
          {saving ? "Saving..." : "Save Pricing Packages"}
        </Button>
      </CardContent>
    </Card>
  );
}

function AutoApproveCard() {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("site_settings").select("value").eq("key", "feature_business_auto_approve").maybeSingle();
      setEnabled(["on", "true", "1"].includes(data?.value || ""));
      setLoading(false);
    })();
  }, []);

  const toggle = async (next: boolean) => {
    setSaving(true);
    setEnabled(next);
    const { error } = await supabase.from("site_settings").upsert(
      { key: "feature_business_auto_approve", value: next ? "on" : "off" },
      { onConflict: "key" }
    );
    setSaving(false);
    if (error) { toast.error(error.message); setEnabled(!next); }
    else toast.success(next ? "Auto-approval ON — new businesses go live instantly" : "Auto-approval OFF — submissions need manual review");
  };

  if (loading) return null;
  return (
    <Card className="mb-4 border-primary/40 bg-primary/5">
      <CardContent className="py-3 px-4 flex items-center justify-between gap-3">
        <div className="flex items-start gap-2 min-w-0">
          <Zap className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-semibold">Auto-approve new business listings</p>
            <p className="text-xs text-muted-foreground">When ON, every new submission is published instantly without review.</p>
          </div>
        </div>
        <Switch checked={enabled} disabled={saving} onCheckedChange={toggle} />
      </CardContent>
    </Card>
  );
}
