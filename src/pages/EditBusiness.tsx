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
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  ChevronLeft, Loader2, Plus, Trash2, ImagePlus, Wand2, Sparkles,
  MapPin, CheckCircle2, MessageCircle, Image as ImageIcon
} from "lucide-react";
import AIServiceDesignerDialog from "@/components/AIServiceDesignerDialog";
import ServiceGraphicPickerModal from "@/components/ServiceGraphicPickerModal";
import BusinessLocationPicker, { LocationData } from "@/components/maps/BusinessLocationPicker";
import GoogleMapsProvider from "@/components/maps/GoogleMapsProvider";
import { PRESET_BUSINESS_CATEGORIES, resolveSafeCategoryUuid } from "@/lib/businessCategories";

type Service = {
  title: string;
  description?: string;
  image_url?: string;
  link_url?: string;
  price?: string;
  benefits?: string[];
  cta_text?: string;
  keywords?: string[];
};

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

  // Dialog states
  const [aiDesignerOpen, setAiDesignerOpen] = useState(false);
  const [graphicPickerOpen, setGraphicPickerOpen] = useState(false);
  const [activeGraphicServiceIndex, setActiveGraphicServiceIndex] = useState<number | null>(null);

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
      setCats(c && c.length > 0 ? c : PRESET_BUSINESS_CATEGORIES);
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

  const addService = () => setServices((s) => [...s, { title: "", description: "", image_url: "" }]);
  const removeService = (idx: number) => setServices((s) => s.filter((_, i) => i !== idx));
  const updateService = (idx: number, patch: Partial<Service>) =>
    setServices((s) => s.map((sv, i) => i === idx ? { ...sv, ...patch } : sv));

  const handleApplyAIServices = (newServices: any[]) => {
    setServices((prev) => [...prev, ...newServices]);
    toast.success("AI Services added to your list! Click 'Save Changes' to commit.");
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const cleaned = services.filter((s) => s.title.trim());
    const safeCatId = resolveSafeCategoryUuid(form.category_id, cats);

    const { error } = await supabase.from("suppliers").update({
      name: form.name,
      description: form.description,
      phone: form.phone,
      address: form.address,
      country: form.country || "Nigeria",
      state: form.state || "Lagos State",
      city: form.city || "Lagos",
      latitude: typeof form.latitude === "number" ? form.latitude : (form.latitude ? parseFloat(form.latitude) : null),
      longitude: typeof form.longitude === "number" ? form.longitude : (form.longitude ? parseFloat(form.longitude) : null),
      website: form.website,
      logo_url: form.logo_url,
      cover_url: form.cover_url || null,
      cover_template: form.cover_template || null,
      category_id: safeCatId,
      social_links: socials,
      services: cleaned,
    }).eq("id", form.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else { toast.success("Business details saved!"); navigate("/dashboard/businesses"); }
  };

  const currentLocationData: LocationData = {
    country: form.country || "Nigeria",
    state: form.state || "Lagos State",
    city: form.city || "Lagos",
    address: form.address || "",
    latitude: form.latitude ? parseFloat(form.latitude) : 6.5244,
    longitude: form.longitude ? parseFloat(form.longitude) : 3.3792,
  };

  const handleLocationChange = (loc: LocationData) => {
    setForm((f: any) => ({
      ...f,
      country: loc.country,
      state: loc.state,
      city: loc.city,
      address: loc.address,
      latitude: loc.latitude,
      longitude: loc.longitude,
    }));
  };

  return (
    <>
      <Helmet><title>Edit Business | Bethelincovibe TV</title></Helmet>
      <div className="container mx-auto max-w-3xl px-4 py-6">
        <Button asChild variant="ghost" size="sm" className="mb-3"><Link to="/dashboard/businesses"><ChevronLeft className="h-4 w-4 mr-1" />Back</Link></Button>
        <Card className="rounded-3xl border shadow-sm">
          <CardHeader className="border-b pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-xl sm:text-2xl font-black tracking-tight">Edit Business Listing</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Update business profile, Google Maps location, category taxonomy, and services.
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={save} className="space-y-6">
              {/* Core Info */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold">Business Name *</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="rounded-xl" />
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold">Business Category *</Label>
                    <Select
                      value={form.category_id || (cats[0]?.id || "tech-it")}
                      onValueChange={(v) => setForm({ ...form, category_id: v })}
                    >
                      <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select Category" /></SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {cats.map((c) => (
                          <SelectItem key={c.id} value={c.id} className="rounded-lg text-xs">
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold">Official Phone / Hotline</Label>
                    <Input value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="rounded-xl" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold">Website URL (Optional)</Label>
                  <Input value={form.website || ""} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://..." className="rounded-xl" />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold">Business Overview &amp; About Story</Label>
                  <Textarea rows={4} value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} className="rounded-xl" />
                </div>
              </div>

              {/* Location & Google Maps Picker */}
              <div className="pt-4 border-t">
                <GoogleMapsProvider>
                  <BusinessLocationPicker
                    value={currentLocationData}
                    onChange={handleLocationChange}
                  />
                </GoogleMapsProvider>
              </div>

              {/* Brand Assets */}
              <div className="space-y-4 pt-4 border-t">
                <Label className="text-sm font-bold block">Brand Assets (Logo &amp; Cover)</Label>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2 p-3.5 rounded-2xl bg-muted/20 border">
                    <Label className="text-xs font-semibold">Business Logo</Label>
                    <Input type="file" accept="image/*" onChange={onLogo} className="rounded-xl text-xs" />
                    {form.logo_url && (
                      <div className="mt-2 flex items-center gap-3 p-2 rounded-xl border bg-card w-fit">
                        <div className="h-12 w-12 rounded-lg bg-muted/50 border overflow-hidden flex items-center justify-center p-1">
                          <img src={form.logo_url} alt="Logo" className="h-full w-full object-contain" />
                        </div>
                        <div className="text-xs">
                          <p className="font-semibold text-foreground">Active Logo</p>
                          <button
                            type="button"
                            onClick={() => setForm((f: any) => ({ ...f, logo_url: null }))}
                            className="text-destructive hover:underline font-medium text-[11px]"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 p-3.5 rounded-2xl bg-muted/20 border">
                    <Label className="text-xs font-semibold">Cover Banner Photo</Label>
                    <Input type="file" accept="image/*" onChange={onCover} className="rounded-xl text-xs" />
                    {form.cover_url && (
                      <img src={form.cover_url} className="h-16 w-full object-cover rounded-xl mt-2 border" alt="" />
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground font-medium">Or pick a studio gradient cover:</p>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {COVER_TEMPLATES.map((t) => (
                      <button
                        type="button"
                        key={t.key}
                        onClick={() => setForm({ ...form, cover_template: t.key, cover_url: null })}
                        className={`h-9 rounded-xl ${t.className} ${
                          form.cover_template === t.key ? "ring-2 ring-primary ring-offset-2 scale-95" : ""
                        }`}
                        aria-label={`Use ${t.key} background`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* SERVICES & AI SERVICE DESIGNER */}
              <div className="space-y-4 pt-4 border-t">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <Label className="text-base font-black text-foreground flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-amber-500" />
                      Business Services &amp; Offerings ({services.length})
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Structured services help potential clients understand your exact deliverables.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setAiDesignerOpen(true)}
                      className="rounded-xl text-xs font-black gap-1.5 bg-gradient-to-r from-primary via-indigo-600 to-purple-600 text-white shadow-md hover:opacity-95"
                    >
                      <Wand2 className="h-3.5 w-3.5" /> AI Service Designer
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={addService} className="rounded-xl text-xs font-bold">
                      <Plus className="h-3.5 w-3.5 mr-1" /> Add Manual
                    </Button>
                  </div>
                </div>

                {services.length === 0 ? (
                  <div className="p-8 border-2 border-dashed rounded-3xl text-center space-y-3 bg-muted/20">
                    <Wand2 className="h-10 w-10 text-primary mx-auto opacity-70" />
                    <div>
                      <h4 className="text-sm font-bold">No Services Listed Yet</h4>
                      <p className="text-xs text-muted-foreground mt-0.5 max-w-sm mx-auto">
                        Use the AI Service Designer to create professional services with persuasive benefits and stock graphics in seconds.
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setAiDesignerOpen(true)}
                      className="rounded-xl font-bold text-xs gap-1.5 shadow-sm"
                    >
                      <Wand2 className="h-3.5 w-3.5" /> Launch AI Service Designer
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {services.map((svc, idx) => (
                      <Card key={idx} className="p-4 space-y-3 rounded-2xl bg-card border shadow-xs">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge className="bg-primary/10 text-primary text-[10px] font-bold">
                                #{idx + 1}
                              </Badge>
                              <Input
                                placeholder="Service title (e.g. Custom Web Design)"
                                value={svc.title}
                                onChange={(e) => updateService(idx, { title: e.target.value })}
                                className="font-bold text-sm h-9 rounded-xl flex-1"
                              />
                            </div>

                            <Textarea
                              rows={2}
                              placeholder="Persuasive description explaining client transformation..."
                              value={svc.description || ""}
                              onChange={(e) => updateService(idx, { description: e.target.value })}
                              className="text-xs rounded-xl"
                            />
                          </div>

                          {/* Service visual box */}
                          <div
                            onClick={() => {
                              setActiveGraphicServiceIndex(idx);
                              setGraphicPickerOpen(true);
                            }}
                            className="h-20 w-24 rounded-xl border bg-muted shrink-0 overflow-hidden cursor-pointer relative group flex items-center justify-center shadow-xs"
                          >
                            {svc.image_url ? (
                              <img src={svc.image_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="text-center p-1">
                                <ImageIcon className="h-5 w-5 mx-auto text-muted-foreground" />
                                <span className="text-[9px] text-muted-foreground font-bold block mt-0.5">Add Visual</span>
                              </div>
                            )}
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-[10px] font-bold">
                              Change
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t text-xs">
                          <div>
                            <Label className="text-[10px] text-muted-foreground font-bold">Price Guidance</Label>
                            <Input
                              placeholder="e.g. From ₦75,000 / Project"
                              value={svc.price || ""}
                              onChange={(e) => updateService(idx, { price: e.target.value })}
                              className="h-7 text-xs rounded-lg mt-0.5"
                            />
                          </div>
                          <div>
                            <Label className="text-[10px] text-muted-foreground font-bold">Action Hook / Link</Label>
                            <Input
                              placeholder="e.g. Inquire on WhatsApp or URL"
                              value={svc.cta_text || svc.link_url || ""}
                              onChange={(e) => updateService(idx, { cta_text: e.target.value, link_url: e.target.value })}
                              className="h-7 text-xs rounded-lg mt-0.5"
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t text-xs">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setActiveGraphicServiceIndex(idx);
                              setGraphicPickerOpen(true);
                            }}
                            className="h-7 text-xs text-primary font-semibold px-2"
                          >
                            <Sparkles className="h-3 w-3 mr-1" /> Sourcing HD Graphics
                          </Button>

                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => removeService(idx)}
                            className="text-destructive h-7 text-xs px-2 hover:bg-destructive/10"
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1" /> Remove
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              {/* Contact & Social Links */}
              <div className="grid sm:grid-cols-2 gap-3 pt-4 border-t">
                <div className="space-y-2">
                  <Label className="text-xs font-bold">Direct WhatsApp Number</Label>
                  <Input value={socials.whatsapp || ""} onChange={(e) => setSocials({ ...socials, whatsapp: e.target.value })} placeholder="+2348000000000" className="rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold">WhatsApp Community / Group Link</Label>
                  <Input value={socials.whatsapp_group || socials.whatsapp_group_url || ""} onChange={(e) => setSocials({ ...socials, whatsapp_group: e.target.value, whatsapp_group_url: e.target.value })} placeholder="https://chat.whatsapp.com/..." className="rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold">YouTube Showcase Video Link</Label>
                  <Input value={socials.youtube || socials.youtube_url || ""} onChange={(e) => setSocials({ ...socials, youtube: e.target.value, youtube_url: e.target.value })} placeholder="https://www.youtube.com/watch?v=..." className="rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold">Support Email</Label>
                  <Input value={socials.email || ""} onChange={(e) => setSocials({ ...socials, email: e.target.value })} className="rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold">Instagram Handle / Link</Label>
                  <Input value={socials.instagram || ""} onChange={(e) => setSocials({ ...socials, instagram: e.target.value })} placeholder="@handle" className="rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold">Facebook Page / Link</Label>
                  <Input value={socials.facebook || ""} onChange={(e) => setSocials({ ...socials, facebook: e.target.value })} className="rounded-xl" />
                </div>
              </div>

              <Button
                type="submit"
                disabled={saving}
                className="w-full font-bold rounded-2xl py-6 text-base shadow-lg bg-gradient-to-r from-primary via-indigo-600 to-purple-600 text-white"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving Changes...
                  </>
                ) : (
                  "Save & Publish Changes"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* AI Service Designer Dialog */}
      <AIServiceDesignerDialog
        open={aiDesignerOpen}
        onOpenChange={setAiDesignerOpen}
        businessName={form.name}
        category={form.category_id || "Professional Services"}
        cityOrRegion={form.city || form.address || "Nigeria"}
        onApplyServices={handleApplyAIServices}
      />

      {/* Service Graphic Picker Modal */}
      {activeGraphicServiceIndex !== null && (
        <ServiceGraphicPickerModal
          open={graphicPickerOpen}
          onOpenChange={setGraphicPickerOpen}
          serviceTitle={services[activeGraphicServiceIndex]?.title || form.name}
          categoryHint={form.category_id}
          currentImageUrl={services[activeGraphicServiceIndex]?.image_url}
          onSelectImage={(url) => {
            updateService(activeGraphicServiceIndex, { image_url: url });
          }}
        />
      )}
    </>
  );
}

