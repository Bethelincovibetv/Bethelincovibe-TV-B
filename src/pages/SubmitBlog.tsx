import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Upload, X, Sparkles, Wallet, Image as ImageIcon, CheckCircle2, Globe, Phone, Mail, MessageSquare, Loader2, Info } from "lucide-react";
import { toast } from "sonner";

const DEFAULT_COST = 1000;

export default function SubmitBlog() {
  const { user, loading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [wallet, setWallet] = useState<any>(null);
  const [feeFromSettings, setFeeFromSettings] = useState<number>(DEFAULT_COST);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [photos, setPhotos] = useState<{ file: File; preview: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [categoryId, setCategoryId] = useState<string>("");
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [form, setForm] = useState({
    business_name: "",
    description: "",
    website: "",
    contact_email: "",
    contact_phone: "",
    contact_whatsapp: "",
  });

  useEffect(() => {
    if (!user) return;
    supabase.from("wallets").select("*").eq("user_id", user.id).maybeSingle().then(({ data }) => setWallet(data));
    supabase.from("site_settings").select("value").eq("key", "business_blog_fee").maybeSingle().then(({ data }) => {
      const n = Number(data?.value);
      if (!Number.isNaN(n) && n >= 0) setFeeFromSettings(n);
    });
    supabase.from("categories").select("id,name").eq("type", "blog").order("name").then(({ data }) => setCategories(data || []));
  }, [user]);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      if (bannerPreview) URL.revokeObjectURL(bannerPreview);
      photos.forEach((p) => URL.revokeObjectURL(p.preview));
    };
  }, [bannerPreview, photos]);

  if (loading) return <div className="min-h-[50vh] flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  if (!user) return <Navigate to="/login" replace />;

  const COST_CREDITS = isAdmin ? 0 : feeFromSettings;
  const balance = wallet?.balance ?? 0;
  const canAfford = isAdmin || balance >= COST_CREDITS;

  const handleBannerChange = (file: File | null) => {
    if (bannerPreview) URL.revokeObjectURL(bannerPreview);
    if (!file) {
      setBannerFile(null);
      setBannerPreview(null);
      return;
    }
    setBannerFile(file);
    setBannerPreview(URL.createObjectURL(file));
  };

  const handleAddPhotos = (newFiles: FileList | null) => {
    if (!newFiles) return;
    const added = Array.from(newFiles).slice(0, 8 - photos.length).map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    setPhotos((prev) => [...prev, ...added]);
  };

  const handleRemovePhoto = (index: number) => {
    const target = photos[index];
    if (target?.preview) URL.revokeObjectURL(target.preview);
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadFile = async (file: File, prefix: string): Promise<string> => {
    const ext = file.name.split(".").pop();
    const path = `${user.id}/${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
    const { error } = await supabase.storage.from("guest-submissions").upload(path, file);
    if (error) throw error;
    const { data } = supabase.storage.from("guest-submissions").getPublicUrl(path);
    return data.publicUrl;
  };

  const submit = async () => {
    if (!form.business_name.trim() || !form.description.trim()) {
      return toast.error("Business name and description are required");
    }
    if (!canAfford) {
      return toast.error(`Insufficient wallet balance. Need ₦${COST_CREDITS.toLocaleString()}`);
    }
    setSubmitting(true);
    try {
      // Upload banner
      let bannerUrl: string | null = null;
      if (bannerFile) bannerUrl = await uploadFile(bannerFile, "banner");

      // Create submission
      const { data: sub, error: insErr } = await supabase.from("guest_blog_submissions").insert({
        user_id: user.id,
        business_name: form.business_name.trim(),
        description: form.description.trim(),
        website: form.website.trim() || null,
        contact_email: form.contact_email.trim() || null,
        contact_phone: form.contact_phone.trim() || null,
        contact_whatsapp: form.contact_whatsapp.trim() || null,
        banner_url: bannerUrl,
        category_id: categoryId || null,
        cost_credits: COST_CREDITS,
        status: "pending_payment",
      }).select().single();
      if (insErr) throw insErr;

      // Upload photos
      for (let i = 0; i < photos.length; i++) {
        const url = await uploadFile(photos[i].file, "photo");
        await supabase.from("guest_submission_photos").insert({
          submission_id: sub.id,
          image_url: url,
          display_order: i,
        });
      }

      // Deduct wallet via edge function (skip for admin/free)
      if (COST_CREDITS > 0) {
        const { data: payRes, error: payErr } = await supabase.functions.invoke("submit-business-blog", {
          body: { submissionId: sub.id },
        });
        if (payErr || payRes?.error) throw new Error(payRes?.error || payErr?.message);
      } else {
        // Mark as paid directly (free for admin)
        await supabase.from("guest_blog_submissions").update({ status: "paid" }).eq("id", sub.id);
      }

      // Auto-trigger AI blog generation immediately
      toast.success("Submitted! AI is crafting your high-converting business blog now…");
      supabase.functions.invoke("ai-blogger", {
        body: { guestSubmissionId: sub.id, autoPublish: true, authorId: user.id },
      }).then(async ({ data, error }) => {
        if (error || data?.error) {
          toast.error("AI generation queued — our system will finalize it shortly");
        } else {
          toast.success("Your business blog has been published live! 🎉");
          // Insert immediate in-app notification for the user
          try {
            const postSlug = data?.title ? data.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") : null;
            await supabase.from("user_notifications").insert({
              user_id: user.id,
              title: "Your Business Blog is Live! 🎉",
              body: `Your business feature for "${form.business_name}" is published and live on Bethelincovibe TV. Tap to read and share.`,
              url: postSlug ? `/blog/${postSlug}` : "/blog",
              is_read: false,
            });
          } catch (e) {
            console.warn("Notification insert error:", e);
          }
        }
      });

      navigate(isAdmin ? "/admin/guest-blogs" : "/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30 pb-16">
      <Helmet><title>Submit Business Blog | Bethelincovibe TV</title></Helmet>

      <div className="container mx-auto max-w-3xl px-4 py-8 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <Button asChild variant="ghost" size="sm" className="rounded-xl font-bold">
            <Link to="/dashboard"><ArrowLeft className="h-4 w-4 mr-1.5" />Dashboard</Link>
          </Button>
          <Badge variant="outline" className="px-3 py-1 font-semibold text-xs rounded-full">
            AI Automated Publishing
          </Badge>
        </div>

        {/* Hero Card */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/90 via-primary to-indigo-950 text-white p-6 sm:p-8 shadow-xl">
          <div className="relative z-10 space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-extrabold ring-1 ring-white/20">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              Executive Business Feature
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Publish an AI-Powered Feature on Your Business
            </h1>
            <p className="text-sm sm:text-base text-white/80 max-w-xl leading-relaxed">
              Our intelligent SEO system writes an authoritative long-form article featuring your brand, photo gallery, products, and direct WhatsApp contact channels.
            </p>
          </div>
        </div>

        {/* Pricing / Wallet status card */}
        {isAdmin ? (
          <div className="rounded-2xl p-4 border border-primary/20 bg-primary/5 text-sm flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-primary/20 text-primary flex items-center justify-center font-bold">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <p className="font-bold text-foreground">Administrator Privileges Active</p>
                <p className="text-xs text-muted-foreground">Free instant submission with automated live publication.</p>
              </div>
            </div>
            <Badge className="bg-primary text-white font-bold">Free</Badge>
          </div>
        ) : (
          <div className={`rounded-2xl p-4 border flex items-center justify-between gap-3 shadow-xs transition-all ${
            canAfford ? "border-emerald-500/30 bg-emerald-500/5" : "border-amber-500/30 bg-amber-500/5"
          }`}>
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-2xl flex items-center justify-center ${
                canAfford ? "bg-emerald-500/20 text-emerald-600" : "bg-amber-500/20 text-amber-600"
              }`}>
                <Wallet className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-semibold">Wallet Balance</p>
                <p className="text-base font-extrabold text-foreground">₦{balance.toLocaleString()}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground font-medium">Publishing Fee</p>
              <p className="text-sm font-bold text-primary">₦{COST_CREDITS.toLocaleString()}</p>
              {!canAfford && (
                <Button asChild size="sm" variant="outline" className="mt-1.5 h-7 text-xs font-bold border-amber-500/40 text-amber-600 hover:bg-amber-500/10">
                  <Link to="/dashboard/wallet">Top Up Wallet</Link>
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Main Submission Form */}
        <Card className="border-border/80 shadow-lg rounded-3xl overflow-hidden">
          <CardHeader className="bg-muted/20 border-b pb-4">
            <CardTitle className="text-lg font-bold">Business Information & Highlights</CardTitle>
            <CardDescription>Fill out the profile details you want the AI to write about.</CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-2">
              <Label className="text-sm font-bold">Business Name *</Label>
              <Input
                placeholder="e.g. Lagos Luxury Hair & Spa Boutique"
                value={form.business_name}
                onChange={(e) => setForm({ ...form, business_name: e.target.value })}
                maxLength={150}
                className="h-11 rounded-xl text-sm font-medium"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-bold">Business Story & What You Offer *</Label>
                <span className="text-xs text-muted-foreground">{form.description.length}/2000</span>
              </div>
              <Textarea
                placeholder="Explain what your business does, your flagship products or services, key benefits, pricing tiers, physical address, and what makes your brand stand out..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={6}
                maxLength={2000}
                className="rounded-2xl text-sm leading-relaxed p-3.5"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-bold">Industry / Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder="Choose the closest category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Banner Upload Box */}
            <div className="space-y-3 pt-2">
              <Label className="text-sm font-bold flex items-center justify-between">
                <span>Featured Banner / Storefront Photo</span>
                <span className="text-xs font-normal text-muted-foreground">Recommended: 16:9 ratio</span>
              </Label>
              {bannerPreview ? (
                <div className="relative rounded-2xl overflow-hidden border border-border/80 group">
                  <img src={bannerPreview} alt="Banner Preview" className="w-full h-48 sm:h-56 object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      onClick={() => handleBannerChange(null)}
                      className="rounded-xl font-bold text-xs"
                    >
                      <X className="h-4 w-4 mr-1" /> Remove
                    </Button>
                  </div>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-border/80 hover:border-primary/60 rounded-2xl p-6 cursor-pointer bg-muted/20 hover:bg-muted/40 transition-all text-center group">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleBannerChange(e.target.files?.[0] || null)}
                  />
                  <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                    <ImageIcon className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-bold text-foreground">Click to upload your main business banner</p>
                  <p className="text-xs text-muted-foreground mt-1">PNG, JPG, or WEBP up to 10MB</p>
                </label>
              )}
            </div>

            {/* Gallery Photos Upload */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-bold">Business & Product Gallery</Label>
                <span className="text-xs text-muted-foreground">{photos.length}/8 uploaded</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Our AI will intelligently distribute these photos across different sections of your published article so they look neat and well-structured.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {photos.map((item, idx) => (
                  <div key={idx} className="relative rounded-2xl overflow-hidden border border-border/80 aspect-square group shadow-xs">
                    <img src={item.preview} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(idx)}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-rose-600 transition-colors"
                      title="Remove image"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                    <span className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded-md bg-black/60 text-[10px] text-white font-medium">
                      Photo {idx + 1}
                    </span>
                  </div>
                ))}

                {photos.length < 8 && (
                  <label className="flex flex-col items-center justify-center border-2 border-dashed border-border/80 hover:border-primary/60 rounded-2xl aspect-square cursor-pointer bg-muted/20 hover:bg-muted/40 transition-all text-center p-3 group">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => handleAddPhotos(e.target.files)}
                    />
                    <Upload className="h-5 w-5 text-muted-foreground group-hover:text-primary mb-1 transition-colors" />
                    <span className="text-xs font-bold text-foreground">Add Photo</span>
                    <span className="text-[10px] text-muted-foreground">Max 8</span>
                  </label>
                )}
              </div>
            </div>

            {/* Direct Contact Channels */}
            <div className="space-y-4 pt-4 border-t border-border/80">
              <Label className="text-sm font-bold">Contact Channels & Lead Generation</Label>
              <div className="grid sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                    <Globe className="h-3.5 w-3.5" /> Website
                  </span>
                  <Input
                    value={form.website}
                    onChange={(e) => setForm({ ...form, website: e.target.value })}
                    placeholder="https://yourbusiness.com"
                    className="h-10 rounded-xl text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" /> Business Email
                  </span>
                  <Input
                    type="email"
                    value={form.contact_email}
                    onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
                    placeholder="contact@yourbusiness.com"
                    className="h-10 rounded-xl text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5" /> Phone Call
                  </span>
                  <Input
                    value={form.contact_phone}
                    onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
                    placeholder="+234 800 000 0000"
                    className="h-10 rounded-xl text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                    <MessageSquare className="h-3.5 w-3.5 text-emerald-600" /> WhatsApp (Instant Chat)
                  </span>
                  <Input
                    value={form.contact_whatsapp}
                    onChange={(e) => setForm({ ...form, contact_whatsapp: e.target.value })}
                    placeholder="+234..."
                    className="h-10 rounded-xl text-xs"
                  />
                </div>
              </div>
            </div>

            <Button
              onClick={submit}
              disabled={submitting || !canAfford}
              className="w-full h-12 rounded-2xl text-base font-extrabold shadow-lg transition-all active:scale-[0.99]"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Generating & Publishing Article...
                </>
              ) : COST_CREDITS > 0 ? (
                <>
                  <Sparkles className="h-5 w-5 mr-2" />
                  Submit & Deduct ₦{COST_CREDITS.toLocaleString()}
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5 mr-2" />
                  Publish Free (Admin Instant Feature)
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
