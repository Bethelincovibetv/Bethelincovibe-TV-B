import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  CheckCircle2,
  Lock,
  Wallet,
  ArrowRight,
  TrendingUp,
  Award,
  Crown,
  FileCheck,
  Upload,
  Clock,
  Zap,
  Building2,
  ExternalLink,
  ChevronLeft,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import Breadcrumbs from "@/components/Breadcrumbs";
import VerifiedBadge from "@/components/VerifiedBadge";
import VerificationModal, {
  DEFAULT_VERIFICATION_PACKAGES,
  VerificationPackage,
} from "@/components/VerificationModal";

export default function UserVerification() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [wallet, setWallet] = useState<any>(null);
  const [userBusinesses, setUserBusinesses] = useState<any[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [submittingKyc, setSubmittingKyc] = useState(false);

  // KYC Form State
  const [cacNumber, setCacNumber] = useState("");
  const [idType, setIdType] = useState("nin");
  const [idNumber, setIdNumber] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [docNotes, setDocNotes] = useState("");

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [{ data: prof }, { data: w }, { data: biz }] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("wallets").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("suppliers").select("*").eq("submitted_by", user.id),
      ]);

      setProfile(prof);
      setWallet(w);
      setUserBusinesses(biz || []);
      if (prof?.metadata?.kyc) {
        setCacNumber(prof.metadata.kyc.cacNumber || "");
        setIdType(prof.metadata.kyc.idType || "nin");
        setIdNumber(prof.metadata.kyc.idNumber || "");
        setBusinessAddress(prof.metadata.kyc.businessAddress || "");
        setDocNotes(prof.metadata.kyc.docNotes || "");
      }
    } catch (e) {
      console.error("Error loading verification data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const verifiedUntil = profile?.verified_until;
  const isVerified =
    profile?.is_verified && verifiedUntil
      ? new Date(verifiedUntil).getTime() > Date.now()
      : Boolean(profile?.is_verified);

  const handleKycSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmittingKyc(true);
    try {
      const currentMeta = profile?.metadata || {};
      const updatedMeta = {
        ...currentMeta,
        kyc: {
          cacNumber,
          idType,
          idNumber,
          businessAddress,
          docNotes,
          submittedAt: new Date().toISOString(),
          status: "under_review",
        },
      };

      const { error } = await supabase
        .from("profiles")
        .update({ metadata: updatedMeta })
        .eq("user_id", user.id);

      if (error) throw error;
      toast.success("KYC documentation submitted successfully! Our compliance team is reviewing it.");
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to submit KYC data");
    } finally {
      setSubmittingKyc(false);
    }
  };

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8 space-y-8 animate-fade-in">
      <Helmet>
        <title>Seller KYC &amp; Blue Tick Verification | Bethelincovibe TV</title>
      </Helmet>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Breadcrumbs
            items={[
              { label: "Dashboard", href: "/dashboard" },
              { label: "Verification" },
            ]}
          />
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-foreground flex items-center gap-2.5 mt-2">
            <ShieldCheck className="h-8 w-8 text-primary" />
            Seller KYC &amp; Blue Tick Verification
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Build unshakeable buyer trust with the official Lagos verified checkmark, priority search placement, and Queen AI concierge.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setModalOpen(true)}
            size="lg"
            className="rounded-2xl font-black gap-2 shadow-lg bg-gradient-to-r from-primary via-emerald-600 to-teal-600 text-primary-foreground hover:opacity-95"
          >
            <Sparkles className="h-5 w-5" />
            {isVerified ? "Renew Verification" : "Get Verified Now"}
          </Button>
        </div>
      </div>

      {/* Current Status Banner */}
      <Card className="rounded-3xl border-2 overflow-hidden shadow-xl">
        <div
          className={`p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 ${
            isVerified
              ? "bg-gradient-to-br from-emerald-500/15 via-teal-500/10 to-background border-emerald-500/30"
              : "bg-gradient-to-br from-primary/10 via-accent/5 to-background border-primary/20"
          }`}
        >
          <div className="flex items-start gap-4">
            <div
              className={`p-4 rounded-2xl shrink-0 shadow-md ${
                isVerified
                  ? "bg-emerald-500 text-white shadow-emerald-500/30"
                  : "bg-primary/20 text-primary"
              }`}
            >
              {isVerified ? (
                <ShieldCheck className="h-8 w-8" />
              ) : (
                <ShieldAlert className="h-8 w-8" />
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-black text-foreground">
                  {isVerified ? "Account Verified & Active" : "Account Not Yet Verified"}
                </h2>
                <Badge
                  className={`px-3 py-1 text-xs font-black rounded-xl ${
                    isVerified
                      ? "bg-emerald-500 text-white"
                      : "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30"
                  }`}
                >
                  {isVerified ? "Blue Tick Active" : "Unverified Seller"}
                </Badge>
              </div>

              <p className="text-sm text-muted-foreground max-w-xl">
                {isVerified
                  ? `Your business listings and products enjoy top search rankings and verified badge trust. Active until: ${new Date(
                      verifiedUntil
                    ).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}`
                  : "Get your official verified checkmark badge to stand out from competitors, increase WhatsApp conversion by 4.8x, and unlock VIP directory promotions."}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
            <Button
              onClick={() => setModalOpen(true)}
              size="lg"
              className="w-full sm:w-auto rounded-2xl font-black shadow-md bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Award className="mr-2 h-5 w-5" />
              {isVerified ? "Extend Duration" : "Upgrade to Verified"}
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="w-full sm:w-auto rounded-2xl font-bold border-border/80 bg-background/80"
            >
              <Link to="/dashboard/wallet">
                <Wallet className="mr-2 h-5 w-5 text-primary" />
                Wallet: ₦{Number(wallet?.balance || 0).toLocaleString()}
              </Link>
            </Button>
          </div>
        </div>
      </Card>

      {/* Verification Packages Grid */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-foreground flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            Verification Tiers &amp; Pricing
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Select a plan to instantly activate verified badge status across your profile, businesses, and products.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {DEFAULT_VERIFICATION_PACKAGES.map((pkg) => (
            <Card
              key={pkg.id}
              className={`relative rounded-3xl border-2 transition-all hover:shadow-xl flex flex-col justify-between overflow-hidden ${
                pkg.popular
                  ? "border-primary bg-primary/5 shadow-md"
                  : "border-border/80 bg-card hover:border-primary/50"
              }`}
            >
              {pkg.popular && (
                <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] font-black uppercase px-3 py-1 rounded-bl-xl shadow-xs">
                  Most Popular
                </div>
              )}

              <CardHeader className="p-5 pb-2">
                <Badge variant="outline" className="w-fit text-[11px] font-black rounded-lg mb-2">
                  {pkg.durationDays} Days Active
                </Badge>
                <CardTitle className="text-lg font-black text-foreground">{pkg.label}</CardTitle>
                <CardDescription className="text-xs font-medium text-muted-foreground mt-1">
                  {pkg.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="p-5 pt-3 space-y-4">
                <div className="text-2xl sm:text-3xl font-black text-foreground">
                  ₦{pkg.price.toLocaleString()}
                  <span className="text-xs font-medium text-muted-foreground ml-1">one-time</span>
                </div>

                <ul className="space-y-2 text-xs font-medium text-foreground/80">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    Verified Blue Tick Badge
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    5x Higher Search Multiplier
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    Direct WhatsApp Buyer Inquiries
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    Featured on Directory Home
                  </li>
                </ul>

                <Button
                  onClick={() => setModalOpen(true)}
                  className="w-full rounded-2xl font-black text-xs h-11 bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
                >
                  Activate Plan
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* KYC Document Submission Form */}
      <Card className="rounded-3xl border-2 border-border/80 shadow-md bg-card">
        <CardHeader className="p-6 sm:p-8 border-b border-border/60">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <FileCheck className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-lg sm:text-xl font-black text-foreground">
                Official Business Credentials &amp; KYC (Optional but Recommended)
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm text-muted-foreground">
                Providing verified CAC registration or Government ID grants permanent priority indexing and enterprise validation.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 sm:p-8">
          <form onSubmit={handleKycSubmit} className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                  CAC Registration Number (RC / BN)
                </Label>
                <Input
                  value={cacNumber}
                  onChange={(e) => setCacNumber(e.target.value)}
                  placeholder="e.g. RC-1849204 or BN-394820"
                  className="rounded-2xl h-11 border-2 font-medium"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                  Government ID Number (NIN / Driver's License / Voter's Card)
                </Label>
                <Input
                  value={idNumber}
                  onChange={(e) => setIdNumber(e.target.value)}
                  placeholder="e.g. 11-digit NIN or License No."
                  className="rounded-2xl h-11 border-2 font-medium"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                Physical Office / Store Address in Lagos
              </Label>
              <Input
                value={businessAddress}
                onChange={(e) => setBusinessAddress(e.target.value)}
                placeholder="e.g. Suite 12, Computer Village, Ikeja, Lagos"
                className="rounded-2xl h-11 border-2 font-medium"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                Supporting Verification Notes / Website / Social Handles
              </Label>
              <Textarea
                value={docNotes}
                onChange={(e) => setDocNotes(e.target.value)}
                placeholder="Add any extra links, Instagram page, Google Business URL or notes..."
                className="rounded-2xl border-2 font-medium min-h-[90px]"
              />
            </div>

            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                disabled={submittingKyc}
                className="rounded-2xl font-black px-6 h-11 bg-primary text-primary-foreground shadow-md hover:bg-primary/90"
              >
                {submittingKyc ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting KYC...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Save &amp; Submit KYC Credentials
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Verification Modal for Wallet Payment */}
      <VerificationModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        currentVerifiedUntil={profile?.verified_until}
        onSuccess={() => {
          loadData();
          setModalOpen(false);
        }}
      />
    </div>
  );
}
