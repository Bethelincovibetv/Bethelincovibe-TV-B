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
import {
  Sparkles, CheckCircle2, User, Building2, Briefcase, ArrowRight, ArrowLeft,
  Rocket, MessageSquare, ExternalLink, ShieldCheck, Upload, Compass, Store, Lightbulb
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

  // Profile Step Form State
  const [displayName, setDisplayName] = useState(profile?.display_name || "");
  const [username, setUsername] = useState(profile?.username || "");
  const [bio, setBio] = useState(profile?.bio || "");
  const [whatsapp, setWhatsapp] = useState(profile?.whatsapp || "");
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || "");

  // Business Step Form State
  const [bizName, setBizName] = useState("");
  const [bizCategory, setBizCategory] = useState("Technology & Software");
  const [bizLocation, setBizLocation] = useState("Ikeja, Lagos");
  const [bizService, setBizService] = useState("");

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || "");
      setUsername(profile.username || "");
      setBio(profile.bio || "");
      setWhatsapp(profile.whatsapp || "");
      setAvatarUrl(profile.avatar_url || "");
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

  const saveProfileStep = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
      const payload: any = {
        user_id: user.id,
        email: user.email,
        display_name: displayName,
        username: cleanUsername || null,
        bio: bio,
        whatsapp: whatsapp,
        avatar_url: avatarUrl,
        is_public: true,
      };
      const { error } = await supabase.from("profiles").upsert(payload, { onConflict: "user_id" });
      if (error) throw error;
      toast.success("Profile details saved!");
      if (onProfileUpdated) onProfileUpdated();
      setStep(3);
    } catch (err: any) {
      toast.error(err.message || "Could not save profile");
    } finally {
      setSaving(false);
    }
  };

  const saveBusinessStep = async () => {
    if (!user) return;
    setSaving(true);
    try {
      if (bizName.trim()) {
        const slug = bizName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") + "-" + Math.floor(Math.random() * 1000);
        await supabase.from("suppliers").insert({
          name: bizName,
          slug,
          description: bio || `${bizName} business in ${bizLocation}`,
          phone: whatsapp,
          whatsapp_number: whatsapp,
          address: bizLocation,
          submitted_by: user.id,
          status: "pending",
          active: true,
        });
        toast.success("Business submitted for directory listing!");
      }

      // If user typed a service, add to profile services
      if (bizService.trim()) {
        const currentServices = Array.isArray(profile?.services) ? profile.services : [];
        const updatedServices = [...currentServices, { title: bizService, description: `${bizName || displayName} service offering` }];
        await supabase.from("profiles").update({ services: updatedServices }).eq("user_id", user.id);
      }

      if (onProfileUpdated) onProfileUpdated();
      setStep(4);
    } catch (err: any) {
      toast.error(err.message || "Could not save business info");
    } finally {
      setSaving(false);
    }
  };

  const completeWizard = () => {
    localStorage.setItem(`wizard_completed_${user?.id}`, "true");
    toast.success("Setup complete! Welcome to Bethelincovibe TV.");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
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
                  step === 2 ? "Set Up Public Profile" :
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
                  desc="A dedicated shareable URL (/u/username) displaying your bio, services, and WhatsApp contact link."
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
                  Completing your profile increases your brand visibility by <strong>300%</strong> in search results and business recommendations.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="ghost" onClick={onClose} className="text-xs">Skip Tour</Button>
                <Button onClick={() => setStep(2)} className="font-semibold gap-1.5">
                  Start Profile Setup <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2: PROFILE SETUP */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-base font-bold flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" /> Step 2: Personal & Professional Identity
                </h3>
                <p className="text-xs text-muted-foreground">Configure your public handle, photo, and WhatsApp contact.</p>
              </div>

              {/* Avatar Upload */}
              <div className="flex items-center gap-4 bg-muted/30 p-3.5 rounded-2xl border">
                <div className="h-16 w-16 rounded-2xl bg-muted overflow-hidden flex items-center justify-center text-xl font-bold text-primary ring-2 ring-primary/20 shrink-0">
                  {avatarUrl ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" /> : (displayName?.[0] || "U").toUpperCase()}
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold">Profile Photo / Logo</p>
                  <label className="inline-flex items-center gap-1.5 text-xs text-primary bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-xl font-medium cursor-pointer transition">
                    <Upload className="h-3.5 w-3.5" />
                    {uploading ? "Uploading..." : "Upload Photo"}
                    <input type="file" accept="image/*" hidden onChange={handleAvatarUpload} disabled={uploading} />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Display Name</Label>
                  <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Jane Doe" className="h-9 text-xs" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Public Handle / Username</Label>
                  <div className="relative flex items-center">
                    <span className="absolute left-2.5 text-muted-foreground text-xs font-bold">@</span>
                    <Input value={username} onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))} placeholder="janedoe" className="pl-7 h-9 text-xs" />
                  </div>
                  {username && <p className="text-[10px] text-muted-foreground">URL: <code>/u/{username}</code></p>}
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Professional Title / Short Bio</Label>
                <Textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="e.g. Founder at Apex Digital. Helping Lagos businesses scale through tech." rows={2} className="text-xs" />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">WhatsApp Number (for direct customer inquiries)</Label>
                <PhoneInput value={whatsapp} onChange={setWhatsapp} placeholder="8012345678" />
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
