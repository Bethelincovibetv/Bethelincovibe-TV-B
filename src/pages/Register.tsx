import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, EyeOff, Building2, MapPin, Sparkles, Compass, ShieldCheck, Image as ImageIcon, Upload, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { PRESET_BUSINESS_CATEGORIES } from "@/lib/businessCategories";
import { syncCanonicalBusinessAndProfile } from "@/lib/businessSync";
import { NIGERIAN_STATES, getStateByName, getStateCoordinates } from "@/lib/nigerianStates";
import VoiceGuideHelper from "@/components/common/VoiceGuideHelper";
import { toast } from "sonner";
import SEO from "@/components/SEO";
import { PAGE_OG_IMAGES, SITE_NAME } from "@/lib/seo";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [isUsernameCustom, setIsUsernameCustom] = useState(false);
  const [categorySlug, setCategorySlug] = useState("tech");
  const [logoUrl, setLogoUrl] = useState("");
  const [showLogoInput, setShowLogoInput] = useState(false);
  
  // 36 Nigerian States + FCT State Selection
  const [selectedStateName, setSelectedStateName] = useState<string>("Lagos");
  const [selectedCityName, setSelectedCityName] = useState<string>("Ikeja");

  const [loading, setLoading] = useState(false);
  const [dbCategories, setDbCategories] = useState<any[]>([]);

  const { signUp, signIn } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [refCode, setRefCode] = useState("");

  const currentStateObj = getStateByName(selectedStateName) || NIGERIAN_STATES.find(s => s.name === "Lagos") || NIGERIAN_STATES[0];

  useEffect(() => {
    // Load categories from database
    supabase
      .from("categories")
      .select("id, name, slug")
      .eq("type", "business")
      .order("name")
      .then(({ data }) => {
        if (data && data.length > 0) {
          setDbCategories(data);
        }
      });
  }, []);

  useEffect(() => {
    const fromUrl = params.get("ref");
    const stored = localStorage.getItem("referral_code");
    const code = (fromUrl || stored || "").trim().toLowerCase();
    if (fromUrl) localStorage.setItem("referral_code", fromUrl);
    if (code) setRefCode(code);
  }, [params]);

  // When state changes, default city to capital or first major city in that Nigerian state
  const handleStateChange = (stateName: string) => {
    setSelectedStateName(stateName);
    const found = getStateByName(stateName);
    if (found && found.cities.length > 0) {
      setSelectedCityName(found.cities[0]);
    }
  };

  const handleNameChange = (val: string) => {
    setDisplayName(val);
    if (!isUsernameCustom) {
      const suggested = val.toLowerCase().replace(/[^a-z0-9]/g, "");
      setUsername(suggested);
    }
  };

  const handleUsernameChange = (val: string) => {
    setIsUsernameCustom(true);
    setUsername(val.toLowerCase().replace(/[^a-z0-9_-]/g, ""));
  };

  const cleanUsername = username.trim() || displayName.toLowerCase().replace(/[^a-z0-9]/g, "") || "username";

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      toast.error("Logo image size should be under 3MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const result = uploadEvent.target?.result as string;
      if (result) {
        setLogoUrl(result);
        toast.success("Brand logo attached! It will be set on your profile.");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const finalUsername = username.trim() || displayName.toLowerCase().replace(/[^a-z0-9]/g, "");

    const { error: signUpError } = await signUp(email, password, displayName, finalUsername, refCode || undefined);
    if (signUpError) {
      setLoading(false);
      toast.error(signUpError.message);
      return;
    }

    // Auto-login immediately after signup
    const { error: signInError } = await signIn(email, password);
    setLoading(false);
    localStorage.removeItem("referral_code");

    // Sync business category, logo & Nigerian State location
    try {
      const { data: { user: signedInUser } } = await supabase.auth.getUser();
      if (signedInUser) {
        const coords = getStateCoordinates(selectedStateName);
        const matchedDbCat = dbCategories.find((c) => c.slug === categorySlug);
        const catName = matchedDbCat?.name || PRESET_BUSINESS_CATEGORIES.find((c) => c.slug === categorySlug)?.name || "Professional Services";

        // Save state and logo permanently to user profile
        await supabase.from("profiles").update({
          background_template: categorySlug,
          avatar_url: logoUrl || undefined,
          social_links: {
            category_slug: categorySlug,
            category_name: catName,
            category_id: matchedDbCat?.id || null,
            state: selectedStateName,
            city: selectedCityName,
            logo_url: logoUrl || null,
            location: {
              country: "Nigeria",
              state: selectedStateName,
              city: selectedCityName,
              latitude: coords.lat,
              longitude: coords.lng,
            },
          },
        }).eq("user_id", signedInUser.id);

        // Initialize canonical directory presence and profile with selected Nigerian State & Category & Logo
        await syncCanonicalBusinessAndProfile({
          userId: signedInUser.id,
          name: displayName || "My Business",
          username: finalUsername,
          coverTemplate: categorySlug,
          categoryId: matchedDbCat?.id || null,
          logoUrl: logoUrl || undefined,
          location: {
            country: "Nigeria",
            state: selectedStateName,
            city: selectedCityName,
            address: `${selectedCityName}, ${selectedStateName} State, Nigeria`,
            latitude: coords.lat,
            longitude: coords.lng,
          },
          socialLinks: {
            category_slug: categorySlug,
            category_name: catName,
            category_id: matchedDbCat?.id || null,
            logo_url: logoUrl || null,
          },
          isPublic: true,
          categoriesList: dbCategories,
        });

        toast.success(`Welcome ${displayName}! Your store is registered in ${selectedStateName} State.`);
        navigate(`/u/${finalUsername}`);
        return;
      }
    } catch (profileErr) {
      console.warn("Profile location sync notice:", profileErr);
    }

    navigate(`/u/${finalUsername}`);
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-3 sm:p-4 my-4 sm:my-8">
      <SEO
        title={`Create Free Account — Join Bethelincovibe Ecosystem | ${SITE_NAME}`}
        description="Join thousands of Nigerian businesses and entrepreneurs. List your services, showcase products, create AI sales funnels, and grow your revenue."
        url="/register"
        type="website"
        image={PAGE_OG_IMAGES.home()}
      />
      <Card className="w-full max-w-lg border-2 shadow-2xl rounded-3xl overflow-hidden bg-card">
        {/* Header with audio helper and Platform Logo under Head */}
        <CardHeader className="text-center space-y-2 bg-gradient-to-b from-muted/60 via-muted/30 to-card p-5 sm:p-6 border-b relative">
          {/* Logo prominently placed under registration head */}
          <div className="flex justify-center mb-1">
            <Link to="/" className="inline-flex items-center gap-2 group transition-transform hover:scale-105 active:scale-95" title="Go to Homepage">
              <div className="relative p-2 rounded-2xl bg-gradient-to-tr from-primary/20 via-background to-amber-500/20 shadow-md border border-border/80 group-hover:border-primary/50 transition-colors">
                <img
                  src="/logo.png"
                  alt="Bethelincovibe TV"
                  className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl object-contain drop-shadow-sm"
                />
                <span className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-background animate-pulse" />
              </div>
            </Link>
          </div>

          <div className="flex items-center justify-center gap-2 mb-0.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-extrabold text-primary tracking-wider uppercase">Bethelincovibe Ecosystem</span>
          </div>
          <CardTitle className="text-xl sm:text-2xl font-black tracking-tight text-foreground">Create Your Account</CardTitle>
          <CardDescription className="text-xs text-muted-foreground max-w-sm mx-auto">
            Join verified merchants across all 36 Nigerian States & global markets.
          </CardDescription>

          <div className="pt-2 flex justify-center">
            <VoiceGuideHelper
              title="Registration Guide"
              explanation="Hello! To join, simply enter your business name, pick your Nigerian State from the list, type your email, and pick a 6-digit password. Everything is automatically set up for you!"
              simpleTip="Select your home State so nearby customers can find your shop easily."
              variant="card"
              className="text-left w-full mt-1"
            />
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Display / Business Name */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="name" className="font-bold text-xs">Display Name / Business Name *</Label>
                <VoiceGuideHelper
                  explanation="Type the name of your business or your personal full name here."
                  variant="icon"
                />
              </div>
              <Input
                id="name"
                required
                value={displayName}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Jane Doe or Apex Solar & Tech"
                className="rounded-xl h-11 text-xs sm:text-sm font-medium"
              />
            </div>

            {/* Optional Brand Logo under the name header */}
            <div className="p-3 rounded-2xl bg-muted/40 border border-border/60 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <ImageIcon className="h-3.5 w-3.5 text-primary" />
                  <span>Business Logo / Avatar (Optional)</span>
                </Label>
                <button
                  type="button"
                  onClick={() => setShowLogoInput(!showLogoInput)}
                  className="text-[11px] font-bold text-primary hover:underline"
                >
                  {showLogoInput || logoUrl ? "Hide" : "+ Add Logo Now"}
                </button>
              </div>

              {(showLogoInput || logoUrl) && (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center gap-3">
                    {logoUrl ? (
                      <div className="relative h-12 w-12 rounded-xl overflow-hidden border-2 border-primary shadow-xs shrink-0 bg-background flex items-center justify-center">
                        <img src={logoUrl} alt="Logo Preview" className="h-full w-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setLogoUrl("")}
                          className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full p-0.5 shadow-sm hover:bg-red-700"
                          title="Remove logo"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="h-12 w-12 rounded-xl border border-dashed border-border flex items-center justify-center text-muted-foreground shrink-0 bg-muted/50">
                        <Building2 className="h-5 w-5" />
                      </div>
                    )}

                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-background border border-border hover:bg-muted text-xs font-bold text-foreground shadow-xs transition-colors">
                          <Upload className="h-3 w-3 text-primary" />
                          <span>Upload File</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleLogoFileChange}
                          />
                        </label>
                        <span className="text-[10px] text-muted-foreground">or enter URL</span>
                      </div>
                      <Input
                        type="url"
                        placeholder="https://example.com/logo.png"
                        value={logoUrl.startsWith("data:") ? "(Uploaded local file)" : logoUrl}
                        onChange={(e) => setLogoUrl(e.target.value)}
                        disabled={logoUrl.startsWith("data:")}
                        className="h-8 text-xs rounded-lg"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    You can also generate high-converting 3D vector branding anytime from your AI Studio.
                  </p>
                </div>
              )}
            </div>

            {/* Username / Handle */}
            <div className="space-y-1.5">
              <Label htmlFor="username" className="font-bold text-xs flex items-center justify-between">
                <span>Public Profile Handle / Username *</span>
                <span className="text-[10px] text-primary font-normal">Active immediately</span>
              </Label>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-muted-foreground font-bold text-sm">@</span>
                <Input
                  id="username"
                  required
                  value={username}
                  onChange={(e) => handleUsernameChange(e.target.value)}
                  placeholder="apextech"
                  className="pl-8 text-xs sm:text-sm font-mono rounded-xl h-11"
                  maxLength={40}
                />
              </div>
              <p className="text-[11px] text-muted-foreground bg-muted/50 p-2 rounded-xl border border-border/50 flex items-center gap-1.5">
                <span>Your public profile URL:</span>
                <code className="text-primary font-bold">/u/{cleanUsername}</code>
              </p>
            </div>

            {/* Category & Nigerian State Selection (36 States + FCT) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="space-y-1.5">
                <Label className="font-bold text-xs flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5 text-primary" /> Business Category *
                </Label>
                <Select value={categorySlug} onValueChange={setCategorySlug}>
                  <SelectTrigger className="h-11 rounded-xl text-xs font-semibold">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    {(dbCategories.length > 0 ? dbCategories : PRESET_BUSINESS_CATEGORIES).map((cat) => (
                      <SelectItem key={cat.id || cat.slug} value={cat.slug} className="text-xs">
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 36 Nigerian States Selector */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="font-bold text-xs flex items-center gap-1">
                    <Compass className="h-3.5 w-3.5 text-emerald-600" /> Nigerian State *
                  </Label>
                  <VoiceGuideHelper
                    explanation="Pick your Nigerian state from the list of 36 states. You will not need to re-enter this when editing your profile later."
                    variant="icon"
                  />
                </div>
                <Select value={selectedStateName} onValueChange={handleStateChange}>
                  <SelectTrigger className="h-11 rounded-xl text-xs font-semibold">
                    <SelectValue placeholder="Select your State" />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    {NIGERIAN_STATES.map((st) => (
                      <SelectItem key={st.code} value={st.name} className="text-xs">
                        {st.name} State {st.name === "Federal Capital Territory" ? "(Abuja)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Major City / LGA Selection within Chosen State */}
            <div className="space-y-1.5">
              <Label className="font-bold text-xs flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-primary" /> City / Commercial Area in {selectedStateName} *
              </Label>
              <Select value={selectedCityName} onValueChange={setSelectedCityName}>
                <SelectTrigger className="h-11 rounded-xl text-xs font-semibold">
                  <SelectValue placeholder="Select City/Area" />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {currentStateObj.cities.map((city) => (
                    <SelectItem key={city} value={city} className="text-xs">
                      {city} ({selectedStateName})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Email Address */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="email" className="font-bold text-xs">Email Address *</Label>
                <VoiceGuideHelper
                  explanation="Enter your active email address. We use this so you can log into your account securely."
                  variant="icon"
                />
              </div>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="rounded-xl h-11 text-xs sm:text-sm"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="font-bold text-xs">Password *</Label>
                <VoiceGuideHelper
                  explanation="Type a secret password with at least 6 characters that only you know."
                  variant="icon"
                />
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="rounded-xl h-11 pr-10 text-xs sm:text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground">Choose any secure password with 6+ characters.</p>
            </div>

            {refCode && (
              <div className="rounded-xl bg-primary/10 px-3 py-2 text-xs text-primary font-bold flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                Invited by referral code: <strong>{refCode}</strong>
              </div>
            )}

            <Button type="submit" className="w-full h-12 rounded-2xl font-black text-sm shadow-md" disabled={loading}>
              {loading ? "Creating account..." : "Register & Launch Profile"}
            </Button>
          </form>
          <p className="text-sm text-center mt-5 text-muted-foreground">
            Already have an account? <Link to="/login" className="text-primary font-bold hover:underline">Sign In</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
