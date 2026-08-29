import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Building2, Plus, Trash2, ImagePlus, Crown } from "lucide-react";
import PhoneInput from "@/components/PhoneInput";
import {
  getQueenServiceSettings,
  runQueenServiceAIAutomation,
} from "@/lib/queenBusinessServiceAIEngine";
import { resolveSafeCategoryUuid } from "@/lib/businessCategories";

type Service = { title: string; description?: string; image_url?: string; link_url?: string };

const COVER_TEMPLATES = [
  { key: "purple", className: "bg-gradient-to-br from-fuchsia-600 via-purple-600 to-indigo-600" },
  { key: "emerald", className: "bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600" },
  { key: "sunset", className: "bg-gradient-to-br from-orange-500 via-pink-500 to-rose-600" },
  { key: "ocean", className: "bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-700" },
  { key: "noir", className: "bg-gradient-to-br from-zinc-800 via-zinc-900 to-black" },
  { key: "gold", className: "bg-gradient-to-br from-amber-400 via-yellow-500 to-orange-600" },
];

const generateSlug = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-" + Math.random().toString(36).slice(2, 7);

export default function ListBusiness() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "", category_id: "", description: "", phone: "", address: "", website: "",
    logo_url: "", cover_url: "", cover_template: "purple",
  });
  const [socials, setSocials] = useState<Record<string, string>>({});
  const [services, setServices] = useState<Service[]>([]);

  useEffect(() => {
    if (!authLoading && !user) navigate("/login?redirect=/businesses/list");
  }, [user, authLoading, navigate]);

  const { data: categories } = useQuery({
    queryKey: ["business-categories"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("*").eq("type", "business").order("name");
      return data ?? [];
    },
  });

  const { data: mySubmissions, refetch } = useQuery({
    queryKey: ["my-business-submissions", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("suppliers").select("*, categories(name)")
        .eq("submitted_by", user!.id).order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const uploadFile = async (file: File, prefix: string): Promise<string | null> => {
    if (!user) return null;
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `${prefix}/${user.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("supplier-logos").upload(path, file, { upsert: false, contentType: file.type });
    if (error) {
      console.error("upload error", error);
      toast.error(`Upload failed: ${error.message}`);
      return null;
    }
    const { data } = supabase.storage.from("supplier-logos").getPublicUrl(path);
    return data.publicUrl;
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading("logo");
    const url = await uploadFile(file, "submissions");
    setUploading(null);
    if (url) { setForm((f) => ({ ...f, logo_url: url })); toast.success("Logo uploaded"); }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading("cover");
    const url = await uploadFile(file, "covers");
    setUploading(null);
    if (url) { setForm((f) => ({ ...f, cover_url: url, cover_template: "" })); toast.success("Cover uploaded"); }
  };

  const onServiceImage = async (idx: number, file: File) => {
    setUploading(`svc-${idx}`);
    const url = await uploadFile(file, "services");
    setUploading(null);
    if (url) setServices((s) => s.map((sv, i) => i === idx ? { ...sv, image_url: url } : sv));
  };

  const addService = () => setServices((s) => [...s, { title: "", description: "", image_url: "" }]);
  const removeService = (idx: number) => setServices((s) => s.filter((_, i) => i !== idx));
  const updateService = (idx: number, patch: Partial<Service>) =>
    setServices((s) => s.map((sv, i) => i === idx ? { ...sv, ...patch } : sv));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!form.name.trim()) { toast.error("Business name is required"); return; }
    setSubmitting(true);
    const cleanedServices = services.filter((s) => s.title.trim());
    const cleanedSocials = Object.fromEntries(Object.entries(socials).filter(([, v]) => v && v.trim()));
    const safeCatId = resolveSafeCategoryUuid(form.category_id, categories || []);

    const { data: insertedData, error } = await supabase
      .from("suppliers")
      .insert({
        name: form.name.trim(),
        slug: generateSlug(form.name),
        category_id: safeCatId,
        description: form.description || null,
        phone: form.phone || null,
        address: form.address || null,
        website: form.website || null,
        logo_url: form.logo_url || null,
        cover_url: form.cover_url || null,
        cover_template: form.cover_url ? null : (form.cover_template || null),
        submitted_by: user.id,
        status: "pending",
        active: false,
        featured: false,
        social_links: {
          ...cleanedSocials,
          is_early_access: true,
        },
        services: cleanedServices,
      })
      .select("*")
      .single();

    if (error) {
      setSubmitting(false);
      toast.error(error.message);
      return;
    }

    // Check if auto-run Queen setup is active
    try {
      const qSettings = await getQueenServiceSettings();
      if (qSettings.autoRunOnNewBusinessRegistration && insertedData) {
        toast.info("👑 Queen AI Agent is creating your graphic banners, AI catalog, and VIP verification...");
        // Run full Queen setup
        await runQueenServiceAIAutomation(insertedData, {
          featuredDurationDays: qSettings.defaultFeaturedDays,
          verificationDays: qSettings.defaultVerificationDays,
          advertPlacement: qSettings.defaultAdPlacement,
          advertDurationDays: qSettings.defaultAdDays,
          createBannerAdvert: true,
          generateServicesCatalog: true,
          sendOwnerNotification: true,
          isEarlyAccessOnly: false,
        });
        toast.success("👑 Queen Service VIP Setup Complete! Your listing, graphic banner, and live advert are now active.");
      } else {
        toast.success("Listing submitted! An admin will review it shortly.");
      }
    } catch (autoErr: any) {
      console.warn("Auto Queen service notice:", autoErr);
      toast.success("Listing submitted successfully!");
    }

    setSubmitting(false);
    setForm({ name: "", category_id: "", description: "", phone: "", address: "", website: "", logo_url: "", cover_url: "", cover_template: "purple" });
    setSocials({}); setServices([]);
    refetch();
  };

  if (authLoading) return <div className="container mx-auto py-12 text-center">Loading…</div>;

  return (
    <>
      <Helmet>
        <title>List Your Business | Lagos Business Directory</title>
        <meta name="description" content="List your Lagos business in our business directory. Free submission, reviewed by our team." />
        <link rel="canonical" href="/businesses/list" />
      </Helmet>
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="mb-6 flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">List Your Service Business</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Add everything customers should know — logo, services, contact channels. You can edit anytime later.
            </p>
            <p className="text-xs mt-1">
              Selling a physical product instead?{" "}
              <Link to="/products/list" className="text-primary underline">List it on the marketplace</Link>
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Business details</CardTitle>
            <CardDescription>Fill in the form below. Fields marked * are required.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Business Name *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required maxLength={120} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {categories?.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <PhoneInput value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} placeholder="8012345678" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} maxLength={200} />
              </div>
              <div className="space-y-2">
                <Label>Website</Label>
                <Input type="url" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://..." />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={1000} rows={4} />
              </div>

              <div className="space-y-2">
                <Label>Logo</Label>
                <Input type="file" accept="image/*" onChange={handleLogoUpload} disabled={uploading === "logo"} />
                {uploading === "logo" && <p className="text-xs text-muted-foreground">Uploading…</p>}
                {form.logo_url && (
                  <div className="mt-2 flex items-center gap-3 p-2 rounded-xl border bg-muted/30 w-fit">
                    <div className="h-16 w-16 rounded-lg bg-card border overflow-hidden flex items-center justify-center p-1">
                      <img src={form.logo_url} alt="Logo preview" className="h-full w-full object-contain" />
                    </div>
                    <div className="text-xs">
                      <p className="font-semibold text-foreground">Logo Uploaded</p>
                      <button
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, logo_url: "" }))}
                        className="text-destructive hover:underline font-medium mt-0.5"
                      >
                        Remove logo
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Cover photo (optional)</Label>
                <Input type="file" accept="image/*" onChange={handleCoverUpload} disabled={uploading === "cover"} />
                {uploading === "cover" && <p className="text-xs text-muted-foreground">Uploading…</p>}
                {form.cover_url && <img src={form.cover_url} className="h-24 w-full object-cover rounded mt-2 border" alt="" />}
                <p className="text-xs text-muted-foreground mt-2">Or pick a branded background:</p>
                <div className="grid grid-cols-3 gap-2">
                  {COVER_TEMPLATES.map((t) => (
                    <button type="button" key={t.key}
                      onClick={() => setForm({ ...form, cover_template: t.key, cover_url: "" })}
                      className={`h-12 rounded-md ${t.className} ${form.cover_template === t.key && !form.cover_url ? "ring-2 ring-primary ring-offset-2" : ""}`}
                      aria-label={`Use ${t.key} background`}
                    />
                  ))}
                </div>
              </div>

              {/* SERVICES */}
              <div className="space-y-3 pt-2 border-t">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Services / Products</Label>
                  <Button type="button" size="sm" variant="outline" onClick={addService}>
                    <Plus className="h-3.5 w-3.5 mr-1" />Add
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Each service shows on your profile so customers can browse what you offer.</p>
                {services.map((svc, idx) => (
                  <Card key={idx} className="p-3 space-y-2 bg-muted/30">
                    <div className="flex gap-2">
                      <Input placeholder="Service title (e.g. Wedding cake)" value={svc.title}
                        onChange={(e) => updateService(idx, { title: e.target.value })} />
                      <Button type="button" size="icon" variant="ghost" onClick={() => removeService(idx)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                    <Textarea rows={2} placeholder="Short description (optional)"
                      value={svc.description || ""} onChange={(e) => updateService(idx, { description: e.target.value })} />
                    <Input placeholder="Action link (optional) — e.g. https://wa.me/234..."
                      value={svc.link_url || ""} onChange={(e) => updateService(idx, { link_url: e.target.value })} />
                    <div className="flex items-center gap-3">
                      {svc.image_url && <img src={svc.image_url} alt="" className="h-14 w-14 rounded object-cover" />}
                      <label className="text-xs text-primary cursor-pointer flex items-center gap-1">
                        <ImagePlus className="h-3.5 w-3.5" />
                        {uploading === `svc-${idx}` ? "Uploading…" : svc.image_url ? "Replace image" : "Upload image"}
                        <input type="file" accept="image/*" className="hidden"
                          onChange={(e) => { const f = e.target.files?.[0]; if (f) onServiceImage(idx, f); }} />
                      </label>
                    </div>
                  </Card>
                ))}
              </div>

              {/* CONTACT / SOCIAL */}
              <div className="grid sm:grid-cols-2 gap-3 pt-2 border-t">
                <div className="space-y-2"><Label>Direct WhatsApp Number</Label>
                  <PhoneInput value={socials.whatsapp || ""} onChange={(v) => setSocials({ ...socials, whatsapp: v })} placeholder="8012345678" /></div>
                <div className="space-y-2"><Label>WhatsApp Community / Group Link</Label>
                  <Input value={socials.whatsapp_group || ""} onChange={(e) => setSocials({ ...socials, whatsapp_group: e.target.value, whatsapp_group_url: e.target.value })} placeholder="https://chat.whatsapp.com/..." /></div>
                <div className="space-y-2 sm:col-span-2"><Label>YouTube Video / Showcase Link</Label>
                  <Input value={socials.youtube || ""} onChange={(e) => setSocials({ ...socials, youtube: e.target.value, youtube_url: e.target.value })} placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..." /></div>
                <div className="space-y-2"><Label>Email</Label>
                  <Input value={socials.email || ""} onChange={(e) => setSocials({ ...socials, email: e.target.value })} /></div>
                <div className="space-y-2"><Label>Instagram</Label>
                  <Input value={socials.instagram || ""} onChange={(e) => setSocials({ ...socials, instagram: e.target.value })} placeholder="@handle" /></div>
                <div className="space-y-2"><Label>Facebook</Label>
                  <Input value={socials.facebook || ""} onChange={(e) => setSocials({ ...socials, facebook: e.target.value })} /></div>
                <div className="space-y-2"><Label>TikTok</Label>
                  <Input value={socials.tiktok || ""} onChange={(e) => setSocials({ ...socials, tiktok: e.target.value })} /></div>
                <div className="space-y-2"><Label>Twitter / X</Label>
                  <Input value={socials.twitter || ""} onChange={(e) => setSocials({ ...socials, twitter: e.target.value })} /></div>
              </div>

              <Button type="submit" disabled={submitting || !!uploading} className="w-full">
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Submit for Review
              </Button>
            </form>
          </CardContent>
        </Card>

        {mySubmissions && mySubmissions.length > 0 && (
          <div className="mt-10">
            <h2 className="text-xl font-semibold mb-3">My Submissions</h2>
            <div className="space-y-2">
              {mySubmissions.map((s: any) => (
                <Card key={s.id}>
                  <CardContent className="flex items-center gap-3 py-3">
                    {s.logo_url && <img src={s.logo_url} alt="" className="h-10 w-10 rounded object-cover" />}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{s.name}</p>
                      <p className="text-xs text-muted-foreground">{s.categories?.name || "Uncategorized"}</p>
                      {s.status === "rejected" && s.rejection_reason && (
                        <p className="text-xs text-destructive mt-1">Reason: {s.rejection_reason}</p>
                      )}
                    </div>
                    <Badge variant={s.status === "approved" ? "default" : s.status === "rejected" ? "destructive" : "secondary"}>
                      {s.status}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              Approved listings appear in the public <Link to="/businesses" className="underline">business directory</Link>.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
