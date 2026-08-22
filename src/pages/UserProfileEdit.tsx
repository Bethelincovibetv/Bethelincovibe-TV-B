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
import { ArrowLeft, Save, Upload, Plus, Trash2, Briefcase, User, Globe2, ImagePlus } from "lucide-react";
import { toast } from "sonner";
import PhoneInput from "@/components/PhoneInput";

export default function UserProfileEdit() {
  const { user, loading } = useAuth();
  const [profile, setProfile] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  // services stored as objects: { title, description?, image_url?, link_url? }

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      if (data) {
        const raw = Array.isArray((data as any).services) ? (data as any).services : [];
        // migrate legacy string entries to object shape
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
      toast.success("Photo uploaded");
    } catch (err: any) { toast.error(err.message); }
    finally { setUploading(false); }
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
      toast.success("Profile saved");
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="container mx-auto max-w-2xl px-4 py-6 space-y-6">
      <Helmet><title>Edit Profile | Bethelincovibe TV</title></Helmet>
      <Button asChild variant="ghost" size="sm"><Link to="/dashboard"><ArrowLeft className="h-4 w-4 mr-1" />Back</Link></Button>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><User className="h-5 w-5 text-primary" />Business Profile</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 rounded-full bg-muted overflow-hidden flex items-center justify-center text-2xl font-bold text-primary ring-2 ring-primary/20">
              {profile.avatar_url ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" /> : (profile.display_name?.[0] || user.email?.[0])?.toUpperCase()}
            </div>
            <div>
              <input type="file" accept="image/*" id="avatar" hidden onChange={uploadAvatar} />
              <Button size="sm" variant="outline" disabled={uploading} onClick={() => document.getElementById("avatar")?.click()}>
                <Upload className="h-4 w-4 mr-1" />{uploading ? "Uploading..." : "Upload photo"}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Display Name</Label>
            <Input value={profile.display_name || ""} onChange={(e) => updateField("display_name", e.target.value)} maxLength={100} />
          </div>
          <div className="space-y-2">
            <Label>Username (for your public profile URL)</Label>
            <Input value={profile.username || ""} onChange={(e) => updateField("username", e.target.value)} placeholder="janedoe" maxLength={50} />
            {profile.username && <p className="text-xs text-muted-foreground">Your public page: <code>/u/{profile.username}</code></p>}
          </div>
          <div className="space-y-2">
            <Label>About / Bio</Label>
            <Textarea value={profile.bio || ""} onChange={(e) => updateField("bio", e.target.value)} rows={3} maxLength={500} />
          </div>

          <div className="space-y-2 border-t pt-4">
            <Label className="flex items-center gap-2"><Briefcase className="h-4 w-4 text-primary" />My Services / What I Offer</Label>
            <p className="text-xs text-muted-foreground">Each service shows on your public profile with a full-image preview and optional action link.</p>
            {(profile.services || []).map((svc: any, i: number) => (
              <Card key={i} className="p-3 space-y-2 bg-muted/30">
                <div className="flex gap-2">
                  <Input placeholder="Service title (e.g. Wedding cake)" value={svc.title || ""} onChange={(e) => updateService(i, { title: e.target.value })} />
                  <Button type="button" size="icon" variant="ghost" onClick={() => removeService(i)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                <TA rows={2} placeholder="Short description (optional)" value={svc.description || ""} onChange={(e) => updateService(i, { description: e.target.value })} />
                <Input placeholder="Action link (optional) — wa.me link, product page, etc." value={svc.link_url || ""} onChange={(e) => updateService(i, { link_url: e.target.value })} />
                <div className="flex items-center gap-3">
                  {svc.image_url && <img src={svc.image_url} alt="" className="h-14 w-14 rounded object-cover" />}
                  <label className="text-xs text-primary cursor-pointer flex items-center gap-1">
                    <ImagePlus className="h-3.5 w-3.5" />
                    {svc.image_url ? "Replace image" : "Upload image"}
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onServiceImage(i, f); }} />
                  </label>
                </div>
              </Card>
            ))}
            <Button type="button" size="sm" variant="outline" onClick={addService} className="w-full">
              <Plus className="h-4 w-4 mr-1" />Add service
            </Button>
          </div>

          <div className="space-y-2 border-t pt-4">
            <Label>WhatsApp number</Label>
            <PhoneInput value={profile.whatsapp || ""} onChange={(v) => updateField("whatsapp", v)} placeholder="8012345678" />
            <p className="text-[11px] text-muted-foreground">Pick your country and enter the number without the leading 0 — visitors will be able to chat you on WhatsApp.</p>
          </div>

          <div className="space-y-2 border-t pt-4">
            <Label className="flex items-center gap-2 text-sm font-semibold"><Globe2 className="h-4 w-4" />Social Links</Label>
            <Input placeholder="Instagram URL" value={profile.social_links?.instagram || ""} onChange={(e) => updateSocial("instagram", e.target.value)} />
            <Input placeholder="Twitter / X URL" value={profile.social_links?.twitter || ""} onChange={(e) => updateSocial("twitter", e.target.value)} />
            <Input placeholder="Facebook URL" value={profile.social_links?.facebook || ""} onChange={(e) => updateSocial("facebook", e.target.value)} />
            <Input placeholder="LinkedIn URL" value={profile.social_links?.linkedin || ""} onChange={(e) => updateSocial("linkedin", e.target.value)} />
            <Input placeholder="Website" value={profile.social_links?.website || ""} onChange={(e) => updateSocial("website", e.target.value)} />
          </div>

          <div className="flex items-center gap-2 border-t pt-4">
            <Switch checked={profile.is_public !== false} onCheckedChange={(v) => updateField("is_public", v)} />
            <Label className="text-sm">Make my profile public (visible to Google & others)</Label>
          </div>

          <Button onClick={save} disabled={saving} className="w-full" size="lg"><Save className="h-4 w-4 mr-1" />{saving ? "Saving..." : "Save Profile"}</Button>
        </CardContent>
      </Card>
    </div>
  );
}
