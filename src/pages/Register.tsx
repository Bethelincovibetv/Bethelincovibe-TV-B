import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, EyeOff, Building2, MapPin, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { PRESET_BUSINESS_CATEGORIES, MAJOR_CITIES_LOCATIONS } from "@/lib/businessCategories";
import { toast } from "sonner";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [isUsernameCustom, setIsUsernameCustom] = useState(false);
  const [categorySlug, setCategorySlug] = useState("tech");
  const [selectedCity, setSelectedCity] = useState("Lagos");
  const [loading, setLoading] = useState(false);
  const [dbCategories, setDbCategories] = useState<any[]>([]);

  const { signUp, signIn } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [refCode, setRefCode] = useState("");

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

    // Sync business category & location
    try {
      const { data: { user: signedInUser } } = await supabase.auth.getUser();
      if (signedInUser) {
        const foundLoc = MAJOR_CITIES_LOCATIONS.find((c) => c.city === selectedCity) || MAJOR_CITIES_LOCATIONS[0];
        const matchedDbCat = dbCategories.find((c) => c.slug === categorySlug);
        const catName = matchedDbCat?.name || PRESET_BUSINESS_CATEGORIES.find((c) => c.slug === categorySlug)?.name || "Professional Services";

        // Save to profile
        await supabase.from("profiles").update({
          background_template: categorySlug,
          social_links: {
            category_slug: categorySlug,
            category_name: catName,
            category_id: matchedDbCat?.id || null,
            location: {
              country: foundLoc.country,
              state: foundLoc.state,
              city: foundLoc.city,
              latitude: foundLoc.lat,
              longitude: foundLoc.lng,
            },
          },
        }).eq("user_id", signedInUser.id);

        // Initialize directory presence
        const bizSlug = finalUsername || displayName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        await supabase.from("suppliers").upsert({
          name: displayName || "My Business",
          slug: bizSlug,
          category_id: matchedDbCat?.id || null,
          cover_template: categorySlug,
          country: foundLoc.country,
          state: foundLoc.state,
          city: foundLoc.city,
          latitude: foundLoc.lat,
          longitude: foundLoc.lng,
          submitted_by: signedInUser.id,
          active: true,
          status: "approved",
        }, { onConflict: "slug" }).catch(() => {});
      }
    } catch (syncErr) {
      console.warn("Initial business registration sync notice:", syncErr);
    }

    if (signInError) {
      toast.success("Account created! Please sign in.");
      navigate("/login");
    } else {
      toast.success("Account created! Welcome to Bethelincovibe.");
      navigate("/dashboard?wizard=1");
    }
  };

  return (
    <div className="container mx-auto px-4 py-10 sm:py-14 flex justify-center">
      <Card className="w-full max-w-lg shadow-xl border-border/80 rounded-3xl">
        <CardHeader className="text-center pb-4">
          <img src="/logo.png" alt="Bethelincovibe TV" className="h-12 w-12 mx-auto mb-2 rounded-xl shadow-md" />
          <CardTitle className="text-2xl font-black tracking-tight">Create Business Account</CardTitle>
          <CardDescription>Join Bethelincovibe TV community & launch your verified public presence</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="font-bold text-xs">Display Name / Business Name *</Label>
              <Input
                id="name"
                required
                value={displayName}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Jane Doe or Apex Solar & Tech"
                className="rounded-xl h-11"
              />
            </div>

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
                  className="pl-8 text-sm rounded-xl h-11"
                  maxLength={40}
                />
              </div>
              <p className="text-[11px] text-muted-foreground bg-muted/50 p-2 rounded-xl border border-border/50 flex items-center gap-1.5">
                <span>Your public profile URL:</span>
                <code className="text-primary font-bold">/u/{cleanUsername}</code>
              </p>
            </div>

            {/* Category and Location Grid */}
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

              <div className="space-y-1.5">
                <Label className="font-bold text-xs flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-primary" /> City / Region *
                </Label>
                <Select value={selectedCity} onValueChange={setSelectedCity}>
                  <SelectTrigger className="h-11 rounded-xl text-xs font-semibold">
                    <SelectValue placeholder="Select City" />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    {MAJOR_CITIES_LOCATIONS.map((loc) => (
                      <SelectItem key={loc.city} value={loc.city} className="text-xs">
                        {loc.city}, {loc.state}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="font-bold text-xs">Email Address *</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="rounded-xl h-11"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="font-bold text-xs">Password *</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="rounded-xl h-11 pr-10"
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
