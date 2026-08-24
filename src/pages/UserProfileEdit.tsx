import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea as TA } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Save, Upload, Plus, Trash2, Briefcase, User, Globe2, ImagePlus, Palette, Check } from "lucide-react";
import { toast } from "sonner";
import PhoneInput from "@/components/PhoneInput";

export const PRESET_BACKGROUNDS = [
  {
    id: "tech",
    label: "Tech & Innovation 3D",
    category: "Technology",
    url: "/src/assets/images/bg_tech_innovation_1787551368560.jpg",
    gradient: "from-blue-600 via-indigo-600 to-cyan-700"
  },
  {
    id: "fashion",
    label: "Fashion & Luxury Gold",
    category: "Fashion",
    url: "/src/assets/images/bg_fashion_luxury_1787551382249.jpg",
    gradient: "from-amber-500 via-yellow-600 to-orange-600"
  },
  {
    id: "creative",
    label: "Creative & Design Magenta",
    category: "Arts & Media",
    url: "/src/assets/images/bg_creative_design_1787551396312.jpg",
    gradient: "from-purple-600 via-fuchsia-600 to-pink-600"
  },
  {
    id: "emerald",
    label: "Finance & Enterprise Emerald",
    category: "Finance",
    gradient: "from-emerald-600 via-teal-600 to-cyan-700"
  },
  {
    id: "sunset",
    label: "Food & Events Sunset",
    category: "Food",
    gradient: "from-orange-500 via-rose-500 to-pink-600"
  },
  {
    id: "ocean",
    label: "Retail & E-Commerce",
    category: "Commerce",
    gradient: "from-blue-600 via-indigo-600 to-sky-700"
  },
  {
    id: "noir",
    label: "Executive Noir",
    category: "Corporate",
    gradient: "from-zinc-800 via-zinc-900 to-black"
  }
];

export default function UserProfileEdit() {
  const { user, loading } = useAuth();
  const [profile, setProfile] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      if (data) {
        const raw = Array.isArray((data as any).services) ? (data as any).services : [];
        const services = raw.map((s: any) => typeof s === "string" ? { title: s } : s);
        setProfile({ ...data, social_links: data.social_links || {}, services });
      }
    });
  }, [user]);

  if (loading) return <div className="min-h-[50vh] flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  if (!user) return <Navigate to="/login" replace />;

  const updateField = (field: string, value: any) => setProfile((p: any) => ({ ...p, [field]: value }));
  const updateSocial = (key: string, value: string) => setProfile((p: any) => ({ ...p, social_links: { ...(p.social_links || {}), [key]: value } }));

  const addService = () => {
    const list = [...(profile.services || []), { title: "", description: "", image_url: "", link_url: "" }].slice(0, 20);
    setProfile((p: any) => ({ ...p, services: list }));
  };
  const removeService = (i: number) => {
    setProfile((p: any) => ({ ...p, services: (p.services || []).filter((_: any, j: number) => j !== i) }));
  };
  const updateService = (i: number, patch: any) => {
    setProfile((p: any) => ({ ...p, services: (p.services || []).map((s: any, j: number) => j === i ? { ...s, ...patch } : s) }));
  };
  const onServiceImage = async (i: number, file: File) => {
    if (!user) return;
    const ext = file.name.split(".").pop();
    const path = `${user.id}/service-${Date.now()}-${i}.${ext}`;
    const { error } = await supabase.storage.from("guest-submissions").upload(path, file, { upsert: true });
    if (error) { toast.error(error.message); return; }
    const { data } = supabase.storage.from("guest-submissions").getPublicUrl(path);
    updateService(i, { image_url: data.publicUrl });
  };

  const uploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("guest-submissions").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("guest-submissions").getPublicUrl(path);
      updateField("avatar_url", data.publicUrl);
      toast.success("Profile photo uploaded!");
    } catch (err: any) { toast.error(err.message); }
    finally { setUploading(false); }
  };

  const uploadCover = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingCover(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/cover-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("guest-submissions").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("guest-submissions").getPublicUrl(path);
      updateField("background_url", data.publicUrl);
      toast.success("Custom website cover uploaded!");
    } catch (err: any) { toast.error(err.message); }
    finally { setUploadingCover(false); }
  };

  const save = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const username = profile.username?.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
      const services = (profile.services || []).filter((s: any) => s.title?.trim());
      const payload: any = {
        user_id: user.id,
        email: user.email,
        display_name: profile.display_name,
        bio: profile.bio,
        avatar_url: profile.avatar_url,
        background_url: profile.background_url || null,
        background_template: profile.background_template || "tech",
        username: username || null,
        whatsapp: profile.whatsapp,
        social_links: profile.social_links,
        services,
        is_public: profile.is_public !== false,
      };
      const { error } = await supabase
        .from("profiles")
        .upsert(payload, { onConflict: "user_id" });
      if (error) throw error;
      toast.success("Profile website saved successfully!");
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="container mx-auto max-w-2xl px-4 py-6 space-y-6">
      <Helmet><title>Edit Profile Website | Bethelincovibe TV</title></Helmet>
      <Button asChild variant="ghost" size="sm"><Link to="/dashboard"><ArrowLeft className="h-4 w-4 mr-1" />Back to Dashboard</Link></Button>

      <Card className="border-border/80 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" /> Edit Your Public Website Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar / Profile Logo */}
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 rounded-2xl bg-muted overflow-hidden flex items-center justify-center text-2xl font-bold text-primary ring-4 ring-primary/20 shrink-0 shadow-sm">
              {profile.avatar_url ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" /> : (profile.display_name?.[0] || user.email?.[0])?.toUpperCase()}
            </div>
            <div>
              <Label className="text-xs font-bold block mb-1">Profile Photo / Logo</Label>
              <input type="file" accept="image/*" id="avatar" hidden onChange={uploadAvatar} />
              <Button size="sm" variant="outline" disabled={uploading} onClick={() => document.getElementById("avatar")?.click()} className="rounded-xl font-bold text-xs">
                <Upload className="h-3.5 w-3.5 mr-1" />{uploading ? "Uploading..." : "Upload Logo/Photo"}
              </Button>
            </div>
          </div>

          {/* AI Category Website Background Selector */}
          <div className="space-y-3 border-t pt-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-bold flex items-center gap-1.5">
                  <Palette className="h-4 w-4 text-primary" /> AI Category Cover Backgrounds
                </Label>
                <p className="text-xs text-muted-foreground">Select an AI-generated category background or upload your custom banner.</p>
              </div>
              <div>
                <input type="file" accept="image/*" id="cover" hidden onChange={uploadCover} />
                <Button size="sm" variant="outline" disabled={uploadingCover} onClick={() => document.getElementById("cover")?.click()} className="rounded-xl text-xs font-bold">
                  <ImagePlus className="h-3.5 w-3.5 mr-1" /> Custom Banner
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
              {PRESET_BACKGROUNDS.map((bg) => {
                const isSelected = profile.background_template === bg.id || (bg.url && profile.background_url === bg.url);
                return (
                  <button
                    key={bg.id}
                    type="button"
                    onClick={() => {
                      if (bg.url) {
                        updateField("background_url", bg.url);
                      } else {
                        updateField("background_url", null);
                      }
                      updateField("background_template", bg.id);
                    }}
                    className={`relative rounded-2xl overflow-hidden h-20 text-left border-2 transition-all p-2 flex flex-col justify-between ${
                      isSelected ? "border-primary ring-2 ring-primary/40 scale-[1.02] shadow-md" : "border-border/60 opacity-80 hover:opacity-100"
                    }`}
                  >
                    {bg.url ? (
                      <img src={bg.url} alt={bg.label} className="absolute inset-0 w-full h-full object-cover" />
                    ) : (
                      <div className={`absolute inset-0 bg-gradient-to-br ${bg.gradient}`} />
                    )}
                    <div className="absolute inset-0 bg-black/40" />
                    <div className="relative z-10 flex items-center justify-between">
                      <Badge className="bg-black/60 text-white font-extrabold text-[9px] px-1.5 py-0 border-0">
                        {bg.category}
                      </Badge>
                      {isSelected && (
                        <span className="p-1 rounded-full bg-primary text-white">
                          <Check className="h-3 w-3" />
                        </span>
                      )}
                    </div>
                    <span className="relative z-10 text-[11px] font-bold text-white drop-shadow-md truncate">
                      {bg.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2 border-t pt-4">
            <Label className="text-xs font-bold">Display Name</Label>
            <Input value={profile.display_name || ""} onChange={(e) => updateField("display_name", e.target.value)} maxLength={100} className="rounded-xl text-xs h-10" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-bold">Username (for your public profile URL)</Label>
            <Input value={profile.username || ""} onChange={(e) => updateField("username", e.target.value)} placeholder="janedoe" maxLength={50} className="rounded-xl text-xs h-10" />
            {profile.username && <p className="text-xs text-muted-foreground">Your public website URL: <code>/u/{profile.username}</code></p>}
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-bold">About / Bio Statement</Label>
            <Textarea value={profile.bio || ""} onChange={(e) => updateField("bio", e.target.value)} rows={3} maxLength={500} className="rounded-xl text-xs leading-relaxed" />
          </div>

          <div className="space-y-2 border-t pt-4">
            <Label className="flex items-center gap-2 text-xs font-bold"><Briefcase className="h-4 w-4 text-primary" />My Services / What I Offer</Label>
            <p className="text-xs text-muted-foreground">Each service shows on your public profile with a full-image preview and optional action link.</p>
            {(profile.services || []).map((svc: any, i: number) => (
              <Card key={i} className="p-3 space-y-2 bg-muted/30 border-border/60 rounded-2xl">
                <div className="flex gap-2">
                  <Input placeholder="Service title (e.g. Web Development)" value={svc.title || ""} onChange={(e) => updateService(i, { title: e.target.value })} className="rounded-xl text-xs h-9" />
                  <Button type="button" size="icon" variant="ghost" onClick={() => removeService(i)} className="shrink-0">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                <TA rows={2} placeholder="Short description (optional)" value={svc.description || ""} onChange={(e) => updateService(i, { description: e.target.value })} className="rounded-xl text-xs" />
                <Input placeholder="Action link (optional) — wa.me link, product page, etc." value={svc.link_url || ""} onChange={(e) => updateService(i, { link_url: e.target.value })} className="rounded-xl text-xs h-9" />
                <div className="flex items-center gap-3">
                  {svc.image_url && <img src={svc.image_url} alt="" className="h-12 w-12 rounded-xl object-cover" />}
                  <label className="text-xs text-primary font-bold cursor-pointer flex items-center gap-1">
                    <ImagePlus className="h-3.5 w-3.5" />
                    {svc.image_url ? "Replace image" : "Upload image"}
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onServiceImage(i, f); }} />
                  </label>
                </div>
              </Card>
            ))}
            <Button type="button" size="sm" variant="outline" onClick={addService} className="w-full rounded-2xl text-xs font-bold">
              <Plus className="h-4 w-4 mr-1" />Add Service
            </Button>
          </div>

          <div className="space-y-2 border-t pt-4">
            <Label className="text-xs font-bold">WhatsApp Number</Label>
            <PhoneInput value={profile.whatsapp || ""} onChange={(v) => updateField("whatsapp", v)} placeholder="8012345678" />
            <p className="text-[11px] text-muted-foreground">Pick your country and enter the number without the leading 0 — visitors will be able to chat you on WhatsApp.</p>
          </div>

          <div className="space-y-2 border-t pt-4">
            <Label className="flex items-center gap-2 text-xs font-bold"><Globe2 className="h-4 w-4" />Social Links</Label>
            <Input placeholder="Instagram URL" value={profile.social_links?.instagram || ""} onChange={(e) => updateSocial("instagram", e.target.value)} className="rounded-xl text-xs h-9" />
            <Input placeholder="Twitter / X URL" value={profile.social_links?.twitter || ""} onChange={(e) => updateSocial("twitter", e.target.value)} className="rounded-xl text-xs h-9" />
            <Input placeholder="Facebook URL" value={profile.social_links?.facebook || ""} onChange={(e) => updateSocial("facebook", e.target.value)} className="rounded-xl text-xs h-9" />
            <Input placeholder="LinkedIn URL" value={profile.social_links?.linkedin || ""} onChange={(e) => updateSocial("linkedin", e.target.value)} className="rounded-xl text-xs h-9" />
            <Input placeholder="Website URL" value={profile.social_links?.website || ""} onChange={(e) => updateSocial("website", e.target.value)} className="rounded-xl text-xs h-9" />
          </div>

          <div className="flex items-center gap-2 border-t pt-4">
            <Switch checked={profile.is_public !== false} onCheckedChange={(v) => updateField("is_public", v)} />
            <Label className="text-xs font-bold">Make my profile public (visible to search engines & directory visitors)</Label>
          </div>

          <Button onClick={save} disabled={saving} className="w-full rounded-2xl font-extrabold h-11 shadow-md" size="lg">
            <Save className="h-4 w-4 mr-1" />{saving ? "Saving Website..." : "Save Website Profile"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
