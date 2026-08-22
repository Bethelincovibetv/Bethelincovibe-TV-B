import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Wand2, Upload, ImageIcon, Loader2, Save, Sparkles, Trash2, GripVertical, PlayCircle, LayoutTemplate, UserPlus } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { TEMPLATE_LIST } from "@/components/sales-templates/SalesPageTemplate";
import PhoneInput from "@/components/PhoneInput";

const BUCKET = "sales-pages";

function extractYouTubeEmbedUrl(url: string) {
  if (!url.trim()) return "";
  try {
    const parsed = new URL(url.trim());
    if (parsed.hostname.includes("youtu.be")) {
      const id = parsed.pathname.replace(/^\//, "");
      return id ? `https://www.youtube.com/embed/${id}` : "";
    }
    if (parsed.hostname.includes("youtube.com")) {
      const id = parsed.searchParams.get("v");
      if (id) return `https://www.youtube.com/embed/${id}`;
      const shortsMatch = parsed.pathname.match(/^\/shorts\/([^/]+)/);
      if (shortsMatch?.[1]) return `https://www.youtube.com/embed/${shortsMatch[1]}`;
      const embedMatch = parsed.pathname.match(/^\/embed\/([^/]+)/);
      if (embedMatch?.[1]) return `https://www.youtube.com/embed/${embedMatch[1]}`;
    }
    return "";
  } catch {
    return "";
  }
}

export default function SalesPageEditor() {
  const { user, loading } = useAuth();
  const { id } = useParams();
  const editing = !!id;
  const navigate = useNavigate();

  const [form, setForm] = useState<any>({
    product_name: "",
    product_description: "",
    price: "",
    contact_whatsapp: "",
    contact_phone: "",
    contact_email: "",
    product_image_url: "",
    gallery_image_urls: [],
    image_source: "upload",
    countdown_ends_at: "",
    youtube_video_url: "",
    template_key: "classic",
    lead_capture_enabled: true,
    active: true,
  });
  const [templates, setTemplates] = useState<any[]>([]);
  const [copy, setCopy] = useState<any | null>(null);
  const [pexels, setPexels] = useState<any[]>([]);
  const [generating, setGenerating] = useState(false);
  const [searchingImages, setSearchingImages] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [wallet, setWallet] = useState<number>(0);
  const [pricing, setPricing] = useState<{ first_free: boolean; price: number; existing: number }>({ first_free: true, price: 500, existing: 0 });

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: w }, { data: settings }, { count }, { data: tpl }] = await Promise.all([
        supabase.from("wallets").select("balance").eq("user_id", user.id).maybeSingle(),
        supabase.from("site_settings").select("key,value").in("key", ["sales_page_first_free", "sales_page_price"]),
        supabase.from("sales_pages").select("*", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("sales_page_templates").select("*").eq("enabled", true).order("display_order"),
      ]);
      setWallet(Number(w?.balance || 0));
      const map: any = {};
      settings?.forEach((s: any) => map[s.key] = s.value);
      setPricing({
        first_free: ["true", "on", "1"].includes(String(map.sales_page_first_free || "").toLowerCase()),
        price: Number(map.sales_page_price || 0),
        existing: count || 0,
      });
      setTemplates(tpl || []);
      const def = (tpl || []).find((t: any) => t.is_default) || (tpl || [])[0];
      if (!editing && def) setForm((p: any) => ({ ...p, template_key: def.key }));

      if (editing && id) {
        const { data } = await supabase.from("sales_pages").select("*").eq("id", id).maybeSingle();
        if (data) {
          setForm({
            product_name: data.product_name || "",
            product_description: data.product_description || "",
            price: String(data.price || ""),
            contact_whatsapp: data.contact_whatsapp || "",
            contact_phone: data.contact_phone || "",
            contact_email: data.contact_email || "",
            product_image_url: data.product_image_url || "",
            gallery_image_urls: Array.isArray(data.gallery_image_urls) ? data.gallery_image_urls : [],
            image_source: data.image_source || "upload",
            countdown_ends_at: data.countdown_ends_at ? new Date(data.countdown_ends_at).toISOString().slice(0, 16) : "",
            youtube_video_url: data.youtube_video_url || "",
            template_key: (data as any).template_key || "classic",
            lead_capture_enabled: (data as any).lead_capture_enabled !== false,
            active: (data as any).active !== false,
          });
          setCopy({
            headline: data.headline, subheadline: data.subheadline,
            problem: data.problem, solution: data.solution,
            benefits: data.benefits, social_proof: data.social_proof,
            urgency: data.urgency, cta_text: data.cta_text,
            seo_title: data.seo_title, seo_description: data.seo_description,
          });
        }
      }
    })();
  }, [user, editing, id]);

  if (loading) return <div className="min-h-[50vh] flex items-center justify-center"><Loader2 className="animate-spin" /></div>;
  if (!user) return <Navigate to="/login" replace />;

  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  const addGalleryImages = (urls: string[]) => {
    setForm((prev: any) => {
      const merged = [prev.product_image_url, ...(prev.gallery_image_urls || []), ...urls]
        .filter(Boolean)
        .filter((url: string, index: number, arr: string[]) => arr.indexOf(url) === index);

      return {
        ...prev,
        product_image_url: merged[0] || "",
        gallery_image_urls: merged,
      };
    });
  };

  const removeGalleryImage = (url: string) => {
    setForm((prev: any) => {
      const next = (prev.gallery_image_urls || []).filter((item: string) => item !== url);
      return {
        ...prev,
        gallery_image_urls: next,
        product_image_url: prev.product_image_url === url ? next[0] || "" : prev.product_image_url,
      };
    });
  };

  const moveGalleryImage = (index: number, direction: -1 | 1) => {
    setForm((prev: any) => {
      const images = [...(prev.gallery_image_urls || [])];
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= images.length) return prev;
      const [item] = images.splice(index, 1);
      images.splice(targetIndex, 0, item);
      return {
        ...prev,
        gallery_image_urls: images,
        product_image_url: images[0] || "",
      };
    });
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      addGalleryImages([data.publicUrl]);
      set("image_source", "upload");
      toast.success("Image uploaded");
    } catch (e: any) { toast.error(e.message); }
    finally { setUploading(false); }
  };

  const searchPexels = async () => {
    if (!form.product_name) { toast.error("Enter product name first"); return; }
    setSearchingImages(true);
    try {
      const { data, error } = await supabase.functions.invoke("sales-page-pexels", { body: { query: form.product_name } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error === "pexels_key_missing" ? "Pexels not configured. Use upload instead." : data.error);
      setPexels(data.photos || []);
    } catch (e: any) { toast.error(e.message); }
    finally { setSearchingImages(false); }
  };

  const generateCopy = async () => {
    if (!form.product_name) { toast.error("Enter product name first"); return; }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("sales-page-generate", {
        body: {
          product_name: form.product_name,
          product_description: form.product_description,
          price: form.price,
          contact_whatsapp: form.contact_whatsapp,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setCopy(data.copy);
      toast.success("Copy generated! Scroll down to review.");
    } catch (e: any) { toast.error(e.message); }
    finally { setGenerating(false); }
  };

  const willCharge = !(pricing.first_free && pricing.existing === 0 && !editing) && pricing.price > 0 && !editing;
  const canAfford = !willCharge || wallet >= pricing.price;

  const handleSave = async () => {
    if (!form.product_name) { toast.error("Product name is required"); return; }
    if (!copy) { toast.error("Generate AI copy first"); return; }
    if (!form.contact_whatsapp && !form.contact_phone && !form.contact_email) { toast.error("Add at least one contact method"); return; }
    if (willCharge && !canAfford) { toast.error("Insufficient wallet balance. Top up first."); return; }

    setSaving(true);
    try {
      const payload = {
        ...form,
        price: Number(form.price || 0),
        countdown_ends_at: form.countdown_ends_at ? new Date(form.countdown_ends_at).toISOString() : null,
        youtube_video_url: form.youtube_video_url?.trim() || null,
        gallery_image_urls: (form.gallery_image_urls || []).filter(Boolean),
        product_image_url: form.product_image_url || form.gallery_image_urls?.[0] || "",
        template_key: form.template_key || "classic",
        lead_capture_enabled: form.lead_capture_enabled !== false,
        active: form.active !== false,
        ...copy,
      };

      if (editing && id) {
        const { error } = await supabase.from("sales_pages").update(payload).eq("id", id);
        if (error) throw error;
        toast.success("Sales page updated");
        navigate("/dashboard/sales-pages");
      } else {
        const { data, error } = await supabase.rpc("create_sales_page", { _payload: payload });
        if (error) throw error;
        const res = data as any;
        if (!res?.success) throw new Error(res?.error === "insufficient_balance" ? `Insufficient balance. Need ₦${res.price}.` : res?.error || "Failed");
        toast.success(res.charged > 0 ? `Sales page created. ₦${res.charged} deducted.` : "First sales page created free!");
        navigate("/dashboard/sales-pages");
      }
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="min-h-screen pb-12 bg-gradient-to-b from-primary/5 to-background">
      <Helmet><title>{editing ? "Edit" : "Create"} Sales Page | Bethelincovibe TV</title></Helmet>

      <div className="container max-w-3xl mx-auto px-4 py-6 space-y-5">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" asChild><Link to="/dashboard/sales-pages"><ArrowLeft className="h-4 w-4 mr-1" />Back</Link></Button>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" />{editing ? "Edit" : "Create"} Sales Page</h1>
        </div>

        {!editing && (
          <Card className="bg-gradient-to-br from-primary/10 to-purple-500/10 border-primary/30">
            <CardContent className="p-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Cost</p>
                <p className="font-bold text-lg">
                  {pricing.first_free && pricing.existing === 0
                    ? <span className="text-green-600">First page FREE 🎁</span>
                    : <>₦{pricing.price.toLocaleString()}</>}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Wallet</p>
                <p className="font-semibold">₦{wallet.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 0: Template */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><LayoutTemplate className="h-4 w-4 text-primary" />0. Choose Template</CardTitle>
            <CardDescription>Pick a design — your copy & images get tailored to its style.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {(templates.length ? templates : TEMPLATE_LIST).map((t: any) => {
                const meta = TEMPLATE_LIST.find((m) => m.key === t.key) || t;
                const active = form.template_key === t.key;
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => set("template_key", t.key)}
                    className={`relative text-left rounded-xl border-2 overflow-hidden transition ${active ? "border-primary ring-2 ring-primary/40" : "border-border hover:border-primary/50"}`}
                  >
                    <div className={`h-20 bg-gradient-to-br ${meta.preview || "from-primary to-purple-600"}`} />
                    <div className="p-2.5">
                      <p className="font-semibold text-xs">{t.name}</p>
                      <p className="text-[10px] text-muted-foreground line-clamp-2">{t.description || meta.description}</p>
                      {t.is_premium && <Badge variant="secondary" className="mt-1 text-[9px]">Premium</Badge>}
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Lead capture toggle */}
        <Card>
          <CardContent className="p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <UserPlus className="h-5 w-5 text-primary" />
              <div>
                <p className="font-semibold text-sm">Enable Lead Capture</p>
                <p className="text-xs text-muted-foreground">Show an "I Am Interested" form to collect visitor details.</p>
              </div>
            </div>
            <Switch checked={form.lead_capture_enabled !== false} onCheckedChange={(v) => set("lead_capture_enabled", v)} />
          </CardContent>
        </Card>

        {editing && (
          <Card>
            <CardContent className="p-4 flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-sm">{form.active ? "Page is ACTIVE" : "Page is DISABLED"}</p>
                <p className="text-xs text-muted-foreground">Switch off to temporarily hide this sales page from visitors.</p>
              </div>
              <Switch checked={form.active !== false} onCheckedChange={(v) => set("active", v)} />
            </CardContent>
          </Card>
        )}

        {/* Step 1: Product details */}
        <Card>
          <CardHeader><CardTitle className="text-base">1. Product Details</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><Label>Product name *</Label><Input value={form.product_name} onChange={(e) => set("product_name", e.target.value)} placeholder="e.g. Premium Hair Growth Oil" /></div>
            <div><Label>Short description</Label><Textarea value={form.product_description} onChange={(e) => set("product_description", e.target.value)} rows={3} placeholder="What is it? Who is it for?" /></div>
            <div><Label>Price (₦)</Label><Input type="number" value={form.price} onChange={(e) => set("price", e.target.value)} placeholder="5000" /></div>
            <div className="grid grid-cols-1 gap-3">
              <div><Label>WhatsApp</Label><PhoneInput value={form.contact_whatsapp} onChange={(v) => set("contact_whatsapp", v)} placeholder="8012345678" /></div>
              <div><Label>Phone (for calls)</Label><PhoneInput value={form.contact_phone} onChange={(v) => set("contact_phone", v)} placeholder="8012345678" /></div>
              <div><Label>Email</Label><Input type="email" value={form.contact_email} onChange={(e) => set("contact_email", e.target.value)} placeholder="you@example.com" /></div>
            </div>
            <div>
              <Label>Countdown ends (optional)</Label>
              <Input type="datetime-local" value={form.countdown_ends_at} onChange={(e) => set("countdown_ends_at", e.target.value)} />
            </div>
          </CardContent>
        </Card>

        {/* Step 2: Image */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">2. Product Image</CardTitle>
            <CardDescription>Upload multiple images or pick multiple Pexels shots. The page will use them intelligently.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {!!form.gallery_image_urls?.length && (
              <div className="space-y-3">
                <div className="rounded-lg overflow-hidden border bg-muted/30">
                  <img src={form.product_image_url || form.gallery_image_urls[0]} alt="Primary product visual" className="w-full max-h-64 object-cover" />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {form.gallery_image_urls.map((url: string, index: number) => (
                    <div key={url} className="rounded-lg border overflow-hidden bg-background">
                      <button type="button" onClick={() => set("product_image_url", url)} className="w-full aspect-square">
                        <img src={url} alt="Product gallery option" className="w-full h-full object-cover" />
                      </button>
                      <div className="flex items-center justify-between px-2 py-1.5 border-t">
                        <button type="button" onClick={() => moveGalleryImage(index, -1)} disabled={index === 0} className="text-muted-foreground disabled:opacity-30">
                          <GripVertical className="h-3.5 w-3.5" />
                        </button>
                        <Badge variant={url === form.product_image_url ? "default" : "secondary"} className="text-[10px]">
                          {url === form.product_image_url ? "Hero" : `Image ${index + 1}`}
                        </Badge>
                        <button type="button" onClick={() => removeGalleryImage(url)} className="text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <label className="cursor-pointer">
                <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => Array.from(e.target.files || []).forEach((file) => handleUpload(file))} />
                <Button asChild variant="secondary" disabled={uploading}><span>{uploading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}Upload</span></Button>
              </label>
              <Button variant="outline" onClick={searchPexels} disabled={searchingImages}>
                {searchingImages ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <ImageIcon className="h-4 w-4 mr-1" />}
                Fetch from Pexels
              </Button>
            </div>
            {pexels.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {pexels.map((p) => (
                  <button key={p.id} onClick={() => { addGalleryImages([p.url]); set("image_source", "pexels"); }}
                    className="aspect-video rounded overflow-hidden border-2 border-transparent hover:border-primary">
                    <img src={p.url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground">Tip: tap any thumbnail to make it the main hero image.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><PlayCircle className="h-4 w-4 text-primary" />2b. YouTube Video</CardTitle>
            <CardDescription>Paste a YouTube link and it will embed automatically on the public sales page.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>YouTube video link</Label>
              <Input value={form.youtube_video_url} onChange={(e) => set("youtube_video_url", e.target.value)} placeholder="https://www.youtube.com/watch?v=..." />
            </div>
            {extractYouTubeEmbedUrl(form.youtube_video_url) && (
              <div className="rounded-lg overflow-hidden border aspect-video">
                <iframe
                  src={extractYouTubeEmbedUrl(form.youtube_video_url)}
                  title="YouTube preview"
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step 3: AI copy */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Wand2 className="h-4 w-4 text-primary" />3. AI Copywriting</CardTitle>
            <CardDescription>Gemini will write conversion-ready copy in a 40-year Nigerian copywriter voice.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button onClick={generateCopy} disabled={generating} className="w-full">
              {generating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Writing your sales copy…</> : <><Wand2 className="h-4 w-4 mr-2" />{copy ? "Regenerate copy" : "Generate AI copy"}</>}
            </Button>

            {copy && (
              <div className="space-y-3 pt-3 border-t">
                <div><Label>Headline</Label><Input value={copy.headline || ""} onChange={(e) => setCopy({ ...copy, headline: e.target.value })} /></div>
                <div><Label>Subheadline</Label><Input value={copy.subheadline || ""} onChange={(e) => setCopy({ ...copy, subheadline: e.target.value })} /></div>
                <div><Label>Problem</Label><Textarea rows={3} value={copy.problem || ""} onChange={(e) => setCopy({ ...copy, problem: e.target.value })} /></div>
                <div><Label>Solution</Label><Textarea rows={3} value={copy.solution || ""} onChange={(e) => setCopy({ ...copy, solution: e.target.value })} /></div>
                <div><Label>Urgency</Label><Input value={copy.urgency || ""} onChange={(e) => setCopy({ ...copy, urgency: e.target.value })} /></div>
                <div><Label>CTA button text</Label><Input value={copy.cta_text || ""} onChange={(e) => setCopy({ ...copy, cta_text: e.target.value })} /></div>
                <div className="text-xs text-muted-foreground">
                  <Badge variant="secondary">{Array.isArray(copy.benefits) ? copy.benefits.length : 0} benefits</Badge>{" "}
                  <Badge variant="secondary">{Array.isArray(copy.social_proof) ? copy.social_proof.length : 0} testimonials</Badge>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-2 sticky bottom-2">
          <Button onClick={handleSave} disabled={saving || !copy} className="flex-1" size="lg">
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            {editing ? "Save changes" : willCharge ? `Pay ₦${pricing.price} & publish` : "Publish for free"}
          </Button>
        </div>
      </div>
    </div>
  );
}
