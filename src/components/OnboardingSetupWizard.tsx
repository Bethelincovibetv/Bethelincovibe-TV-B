import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import PhoneInput from "@/components/PhoneInput";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { playNotificationAudio } from "@/lib/notificationSound";
import { PRESET_BUSINESS_CATEGORIES } from "@/lib/businessCategories";
import { syncCanonicalBusinessAndProfile } from "@/lib/businessSync";
import {
  Sparkles, CheckCircle2, User, Building2, Briefcase, ArrowRight, ArrowLeft,
  Rocket, MessageSquare, ExternalLink, ShieldCheck, Upload, Compass, Store, Lightbulb,
  Share2, Globe, Video, Phone, ChevronDown, ChevronUp, Trophy
} from "lucide-react";

interface OnboardingSetupWizardProps {
  open: boolean;
  onClose: () => void;
  user: any;
  profile: any;
  onProfileUpdated?: () => void;
}

export default function OnboardingSetupWizard({
  open,
  onClose,
  user,
  profile,
  onProfileUpdated,
}: OnboardingSetupWizardProps) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showSocials, setShowSocials] = useState(false);

  // Profile Step Form State
  const [displayName, setDisplayName] = useState(profile?.display_name || "");
  const [username, setUsername] = useState(profile?.username || "");
  const [bio, setBio] = useState(profile?.bio || "");
  const [whatsapp, setWhatsapp] = useState(profile?.whatsapp || "");
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || "");

  // Social Links State
  const [socialLinks, setSocialLinks] = useState<Record<string, string>>({
    instagram: "",
    tiktok: "",
    facebook: "",
    twitter: "",
    youtube: "",
    linkedin: "",
    website: "",
  });

  // Business Step Form State
  const [bizName, setBizName] = useState("");
  const [bizCategory, setBizCategory] = useState("Technology & Software");
  const [bizLocation, setBizLocation] = useState(
    profile?.city ? `${profile.city}${profile?.state ? `, ${profile.state}` : ""}` : (profile?.address || "Ikeja, Lagos")
  );
  const [bizService, setBizService] = useState("");

  // KYC Verification State
  const [showKyc, setShowKyc] = useState(false);
  const [ninNumber, setNinNumber] = useState(profile?.metadata?.kyc?.nin || "");
  const [idType, setIdType] = useState(profile?.metadata?.kyc?.id_type || "nin");
  const [residentialAddress, setResidentialAddress] = useState(
    profile?.metadata?.kyc?.address || profile?.address || ""
  );

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || "");
      setUsername(profile.username || "");
      setBio(profile.bio || "");
      setWhatsapp(profile.whatsapp || "");
      setAvatarUrl(profile.avatar_url || "");
      if (profile.social_links && typeof profile.social_links === "object") {
        setSocialLinks((prev) => ({
          ...prev,
          ...profile.social_links,
        }));
      }
      if (profile.metadata?.kyc) {
        setNinNumber(profile.metadata.kyc.nin || "");
        setIdType(profile.metadata.kyc.id_type || "nin");
        setResidentialAddress(profile.metadata.kyc.address || profile.address || "");
      }
    }
  }, [profile]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/wizard-avatar-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("guest-submissions").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("guest-submissions").getPublicUrl(path);
      setAvatarUrl(data.publicUrl);
      toast.success("Profile photo uploaded!");
    } catch (err: any) {
      toast.error(err.message || "Failed to upload photo");
    } finally {
      setUploading(false);
    }
  };

  const updateSocial = (key: string, val: string) => {
    setSocialLinks((prev) => ({ ...prev, [key]: val }));
  };

  const saveProfileStep = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
      const cleanSocials = { ...socialLinks };
      if (whatsapp) cleanSocials.whatsapp = whatsapp;

      const existingMetadata = (profile?.metadata && typeof profile.metadata === "object") ? profile.metadata : {};
      const updatedMetadata = {
        ...existingMetadata,
        kyc: {
          nin: ninNumber.trim(),
          id_type: idType,
          address: residentialAddress.trim(),
          submitted_at: new Date().toISOString(),
          status: ninNumber.trim() ? "submitted" : "unverified",
        },
      };

      const payload: any = {
        user_id: user.id,
        email: user.email,
        display_name: displayName,
        username: cleanUsername || null,
        bio: bio,
        whatsapp: whatsapp,
        avatar_url: avatarUrl,
        social_links: cleanSocials,
        address: residentialAddress.trim() || profile?.address || null,
        metadata: updatedMetadata,
        is_public: true,
      };
      const { error } = await supabase.from("profiles").upsert(payload, { onConflict: "user_id" });
      if (error) throw error;
      localStorage.setItem(`wizard_completed_${user.id}`, "true");
      toast.success("Profile, social handles & identity saved!");
      if (onProfileUpdated) onProfileUpdated();
      setStep(3);
    } catch (err: any) {
      toast.error(err.message || "Could not save profile");
    } finally {
      setSaving(false);
    }
  };

  const triggerCelebration = () => {
    try {
      // Trigger rich falling confetti animation across the screen
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.5 },
        colors: ["#3b82f6", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6"],
      });
      // Play uplifting celebration sound
      playNotificationAudio("bethel_vibe");
    } catch {
      // fallback
    }
  };

  const saveBusinessStep = async () => {
    if (!user) return;
    setSaving(true);
    try {
      if (bizName.trim()) {
        // Find category ID if exists
        const matchedCategory = PRESET_BUSINESS_CATEGORIES.find(
          (c) => c.name.toLowerCase() === bizCategory.toLowerCase() || c.slug.toLowerCase() === bizCategory.toLowerCase()
        );

        // Sync canonical business and profile
        const syncResult = await syncCanonicalBusinessAndProfile({
          userId: user.id,
          name: bizName.trim(),
          bioOrDescription: bio || `${bizName} business in ${bizLocation}`,
          phoneOrWhatsapp: whatsapp || profile?.whatsapp || undefined,
          logoOrAvatarUrl: avatarUrl || profile?.avatar_url || undefined,
          coverTemplate: "tech",
          categoryId: matchedCategory?.id || null,
          location: {
            address: bizLocation,
          },
          services: bizService.trim()
            ? [{ title: bizService.trim(), description: `${bizName || displayName} service offering` }]
            : undefined,
          isPublic: true,
        });

        if (!syncResult.error) {
          toast.success("Business profile synchronized & live on the directory!");
        }
      }

      // If user typed a service, add to profile services
      if (bizService.trim()) {
        const currentServices = Array.isArray(profile?.services) ? profile.services : [];
        const updatedServices = [...currentServices, { title: bizService.trim(), description: `${bizName || displayName} service offering` }];
        await supabase.from("profiles").update({ services: updatedServices }).eq("user_id", user.id);
      }

      // Also persist KYC info if supplied
      if (ninNumber.trim() || residentialAddress.trim()) {
        const existingMetadata = (profile?.metadata && typeof profile.metadata === "object") ? profile.metadata : {};
        const updatedMetadata = {
          ...existingMetadata,
          kyc: {
            nin: ninNumber.trim(),
            id_type: idType,
            address: residentialAddress.trim() || bizLocation,
            submitted_at: new Date().toISOString(),
            status: ninNumber.trim() ? "submitted" : "unverified",
          },
        };
        await supabase.from("profiles").update({ metadata: updatedMetadata }).eq("user_id", user.id);
      }

      // Record congratulations notification in system
      try {
        const uName = displayName.trim() || profile?.display_name || profile?.username || "Entrepreneur";
        await supabase.from("user_notifications").insert({
          user_id: user.id,
          title: `🎉 Congratulations ${uName}, Your Business Profile is Complete!`,
          body: `Hi ${uName}, your business "${bizName || displayName}" is now active, verified, and featured on the Lagos Business Directory.`,
          type: "system",
          url: profile?.username ? `/u/${profile.username}` : "/dashboard",
        });
      } catch (notifErr) {
        console.warn("Secondary notification notice:", notifErr);
      }

      localStorage.setItem(`wizard_completed_${user.id}`, "true");
      if (onProfileUpdated) onProfileUpdated();
      
      // Trigger celebration sound & confetti
      triggerCelebration();
      setStep(4);
    } catch (err: any) {
      toast.error(err.message || "Could not save business info");
    } finally {
      setSaving(false);
    }
  };

  const handleDismiss = () => {
    if (user?.id) {
      localStorage.setItem(`wizard_completed_${user.id}`, "true");
    }
    onClose();
  };

  const completeWizard = () => {
    if (user?.id) {
      localStorage.setItem(`wizard_completed_${user.id}`, "true");
    }
    triggerCelebration();
    toast.success("Setup complete! Welcome to Bethelincovibe TV.");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleDismiss(); }}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden rounded-3xl border-0 shadow-2xl">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-primary via-purple-600 to-pink-600 p-6 text-white relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                <Sparkles className="h-5 w-5 text-amber-300" />
              </span>
              <div>
                <DialogTitle className="text-xl font-bold text-white">Platform Setup & Onboarding</DialogTitle>
                <DialogDescription className="text-xs text-white/80">Step {step} of 4 — {
                  step === 1 ? "Explore Platform Features" :
                  step === 2 ? "Set Up Public Profile & Socials" :
                  step === 3 ? "List Your Business Profile" :
                  "Recommended Growth Programs"
                }</DialogDescription>
              </div>
            </div>
            <Badge className="bg-white/20 hover:bg-white/30 text-white border-0 text-xs">
              {step * 25}% Completed
            </Badge>
          </div>
          <Progress value={step * 25} className="h-1.5 mt-4 bg-white/20" />
        </div>

        <div className="p-6 max-h-[75vh] overflow-y-auto space-y-6">
          {/* STEP 1: TOUR PLATFORM FEATURES */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="text-center space-y-1">
                <h3 className="text-lg font-bold">Welcome to Bethelincovibe TV!</h3>
                <p className="text-sm text-muted-foreground">Here is a quick tour of what you can do on our platform:</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <FeatureCard
                  icon={User}
                  title="Your Public Profile"
                  desc="A dedicated shareable URL (/u/username) displaying your bio, services, social handles, and WhatsApp contact."
                  badge="Live Instantly"
                  color="from-purple-500 to-indigo-600"
                />
                <FeatureCard
                  icon={Store}
                  title="Lagos Business Directory"
                  desc="List your enterprise to reach thousands of buyers across Lagos & Nigeria."
                  badge="Directory"
                  color="from-emerald-500 to-teal-600"
                />
                <FeatureCard
                  icon={Rocket}
                  title="Instant Sales Pages"
                  desc="Build high-converting landing pages to sell digital products & services with Paystack."
                  badge="Monetize"
                  color="from-fuchsia-500 to-rose-500"
                />
                <FeatureCard
                  icon={Lightbulb}
                  title="AI Coach & Inventory"
                  desc="Get instant 24/7 AI business consulting and manage your product stock seamlessly."
                  badge="AI Powered"
                  color="from-amber-500 to-orange-600"
                />
              </div>

              <div className="bg-secondary/60 p-4 rounded-2xl border border-border/80 flex items-start gap-3">
                <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Completing your profile increases your brand visibility by <strong>300%</strong> in search results, business recommendations, and buyer inquiries.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="ghost" onClick={handleDismiss} className="text-xs">Skip Tour</Button>
                <Button onClick={() => setStep(2)} className="font-semibold gap-1.5">
                  Start Profile Setup <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2: PROFILE & SOCIAL HANDLES SETUP */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-base font-bold flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" /> Step 2: Personal & Social Identity
                </h3>
                <p className="text-xs text-muted-foreground">Configure your public handle, photo, WhatsApp, and social media links.</p>
              </div>

              {/* Avatar Upload */}
              <div className="flex items-center gap-4 bg-muted/30 p-3.5 rounded-2xl border">
                <div className="h-16 w-16 rounded-2xl bg-muted overflow-hidden flex items-center justify-center text-xl font-bold text-primary ring-2 ring-primary/20 shrink-0">
                  {avatarUrl ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" /> : (displayName?.[0] || "U").toUpperCase()}
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold">Profile Photo / Business Logo</p>
                  <label className="inline-flex items-center gap-1.5 text-xs text-primary bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-xl font-medium cursor-pointer transition">
                    <Upload className="h-3.5 w-3.5" />
                    {uploading ? "Uploading..." : "Upload Photo"}
                    <input type="file" accept="image/*" hidden onChange={handleAvatarUpload} disabled={uploading} />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Display Name / Brand Name</Label>
                  <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Jane Doe / Apex Studios" className="h-9 text-xs" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Public Handle / Username</Label>
                  <div className="relative flex items-center">
                    <span className="absolute left-2.5 text-muted-foreground text-xs font-bold">@</span>
                    <Input value={username} onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))} placeholder="janedoe" className="pl-7 h-9 text-xs" />
                  </div>
                  {username && <p className="text-[10px] text-muted-foreground">Live link: <code>/u/{username}</code></p>}
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Professional Title / Short Bio</Label>
                <Textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="e.g. Founder at Apex Digital. Helping Lagos businesses scale through technology and branding." rows={2} className="text-xs" />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">WhatsApp Number (Direct customer lead inquiries)</Label>
                <PhoneInput value={whatsapp} onChange={setWhatsapp} placeholder="8012345678" />
              </div>

              {/* Social Handles Section */}
              <div className="rounded-2xl border border-border/80 bg-muted/20 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowSocials(!showSocials)}
                  className="w-full p-3.5 flex items-center justify-between hover:bg-muted/40 transition text-left"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                      <Share2 className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground">Social Media Handles & Links</p>
                      <p className="text-[11px] text-muted-foreground">Add Instagram, TikTok, X, Facebook, LinkedIn & Website</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-[10px] font-bold">
                      {Object.values(socialLinks).filter(Boolean).length} Added
                    </Badge>
                    {showSocials ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </button>

                {showSocials && (
                  <div className="p-4 pt-1 space-y-3 border-t border-border/60">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-[11px] font-semibold flex items-center gap-1.5 text-pink-600 dark:text-pink-400">
                          <span className="h-2 w-2 rounded-full bg-pink-500" /> Instagram (@handle or URL)
                        </Label>
                        <Input
                          value={socialLinks.instagram || ""}
                          onChange={(e) => updateSocial("instagram", e.target.value)}
                          placeholder="@your_instagram or URL"
                          className="h-8 text-xs"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[11px] font-semibold flex items-center gap-1.5 text-zinc-800 dark:text-zinc-200">
                          <span className="h-2 w-2 rounded-full bg-black dark:bg-white" /> TikTok (@handle or URL)
                        </Label>
                        <Input
                          value={socialLinks.tiktok || ""}
                          onChange={(e) => updateSocial("tiktok", e.target.value)}
                          placeholder="@your_tiktok or URL"
                          className="h-8 text-xs"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[11px] font-semibold flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                          <span className="h-2 w-2 rounded-full bg-blue-600" /> Facebook (Page or Profile URL)
                        </Label>
                        <Input
                          value={socialLinks.facebook || ""}
                          onChange={(e) => updateSocial("facebook", e.target.value)}
                          placeholder="https://facebook.com/yourpage"
                          className="h-8 text-xs"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[11px] font-semibold flex items-center gap-1.5 text-sky-500">
                          <span className="h-2 w-2 rounded-full bg-sky-500" /> X / Twitter (@handle or URL)
                        </Label>
                        <Input
                          value={socialLinks.twitter || ""}
                          onChange={(e) => updateSocial("twitter", e.target.value)}
                          placeholder="@your_x_handle"
                          className="h-8 text-xs"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[11px] font-semibold flex items-center gap-1.5 text-red-600 dark:text-red-400">
                          <span className="h-2 w-2 rounded-full bg-red-600" /> YouTube (Channel URL)
                        </Label>
                        <Input
                          value={socialLinks.youtube || ""}
                          onChange={(e) => updateSocial("youtube", e.target.value)}
                          placeholder="https://youtube.com/@channel"
                          className="h-8 text-xs"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[11px] font-semibold flex items-center gap-1.5 text-blue-700 dark:text-blue-300">
                          <span className="h-2 w-2 rounded-full bg-blue-700" /> LinkedIn (Profile or Page URL)
                        </Label>
                        <Input
                          value={socialLinks.linkedin || ""}
                          onChange={(e) => updateSocial("linkedin", e.target.value)}
                          placeholder="https://linkedin.com/in/username"
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>

                    <div className="space-y-1 pt-1">
                      <Label className="text-[11px] font-semibold flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                        <Globe className="h-3 w-3" /> External Website / Portfolio URL
                      </Label>
                      <Input
                        value={socialLinks.website || ""}
                        onChange={(e) => updateSocial("website", e.target.value)}
                        placeholder="https://mybusiness.com"
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* KYC & Identity Verification (Optional for Verified Badge) */}
              <div className="rounded-2xl border border-border/80 bg-muted/20 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowKyc(!showKyc)}
                  className="w-full p-3.5 flex items-center justify-between hover:bg-muted/40 transition text-left"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="h-7 w-7 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                      <ShieldCheck className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-bold text-foreground">Identity &amp; Address Verification (KYC)</p>
                        <Badge className="bg-emerald-600 text-white text-[9px] px-1.5 py-0">Verified Badge</Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground">Add NIN, CAC, or Government ID to unlock trusted merchant status</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={ninNumber ? "default" : "secondary"} className="text-[10px] font-bold">
                      {ninNumber ? "KYC Filled" : "Optional"}
                    </Badge>
                    {showKyc ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </button>

                {showKyc && (
                  <div className="p-4 pt-1 space-y-3 border-t border-border/60">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-[11px] font-semibold">Verification Document Type</Label>
                        <select
                          value={idType}
                          onChange={(e) => setIdType(e.target.value)}
                          className="w-full h-8 rounded-md border bg-background px-3 text-xs"
                        >
                          <option value="nin">National Identity Number (NIN)</option>
                          <option value="cac">Corporate Affairs Commission (CAC / RC Number)</option>
                          <option value="voters_card">Voter's Card (VIN)</option>
                          <option value="drivers_license">Driver's License</option>
                          <option value="passport">International Passport</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[11px] font-semibold">ID / Registration Number</Label>
                        <Input
                          value={ninNumber}
                          onChange={(e) => setNinNumber(e.target.value)}
                          placeholder="e.g. 11-digit NIN or RC Number"
                          className="h-8 text-xs font-mono"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold">Residential / Business Physical Address</Label>
                      <Input
                        value={residentialAddress}
                        onChange={(e) => {
                          setResidentialAddress(e.target.value);
                          if (!bizLocation || bizLocation === "Ikeja, Lagos") {
                            setBizLocation(e.target.value);
                          }
                        }}
                        placeholder="e.g. 14 Victoria Island Boulevard, Lagos"
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center pt-2">
                <Button variant="outline" size="sm" onClick={() => setStep(1)}><ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back</Button>
                <Button onClick={saveProfileStep} disabled={saving} size="sm" className="font-semibold gap-1.5">
                  {saving ? "Saving..." : "Save & Continue to Business"} <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3: BUSINESS LISTING */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-base font-bold flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" /> Step 3: Business Listing & Offerings
                </h3>
                <p className="text-xs text-muted-foreground">List your company on the Bethelincovibe Lagos Directory to get buyer leads.</p>
              </div>

              <div className="space-y-3 bg-muted/20 p-4 rounded-2xl border border-border/80">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Company / Business Name</Label>
                  <Input value={bizName} onChange={(e) => setBizName(e.target.value)} placeholder="e.g. Lagos Tech Hub" className="h-9 text-xs" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Category</Label>
                    <select
                      value={bizCategory}
                      onChange={(e) => setBizCategory(e.target.value)}
                      className="w-full h-9 rounded-md border bg-background px-3 text-xs"
                    >
                      <option>Technology & Software</option>
                      <option>Fashion & Apparel</option>
                      <option>Food & Catering</option>
                      <option>Real Estate & Housing</option>
                      <option>Beauty & Wellness</option>
                      <option>Logistics & Transport</option>
                      <option>Professional Services</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Location / City</Label>
                    <Input value={bizLocation} onChange={(e) => setBizLocation(e.target.value)} placeholder="e.g. Lekki Phase 1, Lagos" className="h-9 text-xs" />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Primary Service / Product You Offer</Label>
                  <Input value={bizService} onChange={(e) => setBizService(e.target.value)} placeholder="e.g. Website Design, Catering Services, Custom Tailoring" className="h-9 text-xs" />
                </div>
              </div>

              <div className="flex justify-between items-center pt-2">
                <Button variant="outline" size="sm" onClick={() => setStep(2)}><ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back</Button>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setStep(4)} className="text-xs">Skip Step</Button>
                  <Button onClick={saveBusinessStep} disabled={saving} size="sm" className="font-semibold gap-1.5">
                    {saving ? "Saving..." : "Save Business & Next"} <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: RECOMMENDED PROGRAMS & GROWTH */}
          {step === 4 && (
            <div className="space-y-5">
              <div className="text-center space-y-1">
                <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto mb-2">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold">You are all set!</h3>
                <p className="text-xs text-muted-foreground">Here are custom recommendations tailored to accelerate your growth on Bethelincovibe TV:</p>
              </div>

              <div className="space-y-3">
                <Link to="/dashboard/sales-pages" onClick={completeWizard} className="block group">
                  <div className="p-3.5 rounded-2xl border bg-card hover:border-primary/40 hover:shadow-md transition flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 text-white flex items-center justify-center font-bold shrink-0">
                        <Rocket className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold group-hover:text-primary transition-colors">Create a Sales Page</p>
                        <p className="text-xs text-muted-foreground">Accept online payments & turn visitors into paying customers.</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs shrink-0">Launch →</Badge>
                  </div>
                </Link>

                <Link to="/dashboard/submit-blog" onClick={completeWizard} className="block group">
                  <div className="p-3.5 rounded-2xl border bg-card hover:border-primary/40 hover:shadow-md transition flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center font-bold shrink-0">
                        <Sparkles className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold group-hover:text-primary transition-colors">Submit Business for AI Blog Feature</p>
                        <p className="text-xs text-muted-foreground">Our AI Blogger writes a promotional article about your company.</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs shrink-0">Submit →</Badge>
                  </div>
                </Link>

                <Link to="/dashboard/coach" onClick={completeWizard} className="block group">
                  <div className="p-3.5 rounded-2xl border bg-card hover:border-primary/40 hover:shadow-md transition flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-500 text-white flex items-center justify-center font-bold shrink-0">
                        <MessageSquare className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold group-hover:text-primary transition-colors">Consult AI Business Coach</p>
                        <p className="text-xs text-muted-foreground">Get instant pricing, marketing, and expansion advice in Nigeria.</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs shrink-0">Ask Coach →</Badge>
                  </div>
                </Link>
              </div>

              <div className="flex justify-center pt-2">
                <Button onClick={completeWizard} size="lg" className="w-full sm:w-auto px-8 font-bold shadow-lg">
                  Finish Setup & Go to Dashboard
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FeatureCard({ icon: Icon, title, desc, badge, color }: any) {
  return (
    <div className="p-3.5 rounded-2xl border bg-card/80 flex flex-col justify-between gap-2 shadow-xs">
      <div className="flex items-center justify-between">
        <div className={`h-9 w-9 rounded-xl bg-gradient-to-br ${color} text-white flex items-center justify-center shadow-xs`}>
          <Icon className="h-4 w-4" />
        </div>
        <Badge variant="secondary" className="text-[10px]">{badge}</Badge>
      </div>
      <div>
        <p className="text-xs font-bold text-foreground">{title}</p>
        <p className="text-[11px] text-muted-foreground leading-tight mt-1">{desc}</p>
      </div>
    </div>
  );
}

