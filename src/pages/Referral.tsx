import React, { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import SEO from "@/components/SEO";
import { PAGE_OG_IMAGES } from "@/lib/seo";
import { copyToClipboard } from "@/lib/clipboard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Gift,
  Share2,
  Copy,
  Check,
  Sparkles,
  Download,
  QrCode,
  Users,
  Wallet,
  ArrowRight,
  TrendingUp,
  Award,
  CheckCircle2,
  HelpCircle,
  ExternalLink,
  MessageCircle,
  Smartphone,
  Layers,
  Palette,
  DollarSign
} from "lucide-react";
import { toast } from "sonner";
import QRCode from "qrcode";
import ReferralFlyerModal from "@/components/ReferralFlyerModal";

// Creative Flyer Themes
type FlyerTheme = "royal" | "gold" | "neon" | "emerald";

interface ThemeConfig {
  name: string;
  badge: string;
  bgGrad: [string, string, string, string];
  accent: string;
  textColor: string;
  boxBg: string;
  boxBorder: string;
}

const FLYER_THEMES: Record<FlyerTheme, ThemeConfig> = {
  royal: {
    name: "Royal Purple 3D",
    badge: "Most Popular",
    bgGrad: ["#2e0854", "#4c1d95", "#1e1b4b", "#09090b"],
    accent: "#fbbf24",
    textColor: "#e9d5ff",
    boxBg: "rgba(15, 23, 42, 0.85)",
    boxBorder: "rgba(168, 85, 247, 0.4)",
  },
  gold: {
    name: "Lagos Gold Luxury",
    badge: "High Class",
    bgGrad: ["#451a03", "#78350f", "#1c1917", "#0c0a09"],
    accent: "#f59e0b",
    textColor: "#fef3c7",
    boxBg: "rgba(28, 25, 23, 0.9)",
    boxBorder: "rgba(245, 158, 11, 0.45)",
  },
  neon: {
    name: "Cyber Neon Tech",
    badge: "Modern Tech",
    bgGrad: ["#082f49", "#0369a1", "#0f172a", "#020617"],
    accent: "#38bdf8",
    textColor: "#bae6fd",
    boxBg: "rgba(15, 23, 42, 0.9)",
    boxBorder: "rgba(56, 189, 248, 0.45)",
  },
  emerald: {
    name: "Emerald Wealth",
    badge: "Growth Engine",
    bgGrad: ["#022c22", "#065f46", "#064e3b", "#020617"],
    accent: "#34d399",
    textColor: "#d1fae5",
    boxBg: "rgba(6, 78, 59, 0.85)",
    boxBorder: "rgba(52, 211, 153, 0.4)",
  },
};

export default function ReferralPage() {
  const { user } = useAuth();
  const [code, setCode] = useState("");
  const [displayName, setDisplayName] = useState("Entrepreneur");
  const [stats, setStats] = useState({ count: 0, earned: 0, pending: 0 });
  const [referralsList, setReferralsList] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);
  const [flyerModalOpen, setFlyerModalOpen] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<FlyerTheme>("royal");
  const [customName, setCustomName] = useState("");
  const [customSlogan, setCustomSlogan] = useState("Lagos Premier Business & Supplier Hub");
  const [generatingFlyer, setGeneratingFlyer] = useState(false);
  const [flyerDataUrl, setFlyerDataUrl] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Load user referral details
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const { data: p } = await supabase
          .from("profiles")
          .select("referral_code, display_name, username")
          .eq("user_id", user.id)
          .maybeSingle();

        let refCode = (p as any)?.referral_code;
        if (!refCode) {
          const base = (p as any)?.username || (p as any)?.display_name || user.email?.split("@")[0] || "BTV";
          refCode = (base.replace(/[^a-zA-Z0-9]/g, "").substring(0, 5) + Math.floor(1000 + Math.random() * 9000)).toUpperCase();
          try {
            await supabase.from("profiles").update({ referral_code: refCode }).eq("user_id", user.id);
          } catch (e) {
            console.warn("Could not persist referral code:", e);
          }
        }

        const name = (p as any)?.display_name || (p as any)?.username || "Entrepreneur";
        setCode(refCode);
        setDisplayName(name);
        setCustomName(name);

        const { data: refs } = await supabase
          .from("referrals")
          .select("*")
          .eq("referrer_id", user.id)
          .order("created_at", { ascending: false });

        const earned = (refs || []).reduce(
          (s: number, r: any) => s + Number(r.signup_bonus_amount || 0) + Number(r.purchase_bonus_total || 0),
          0
        );

        setStats({
          count: refs?.length || 0,
          earned,
          pending: (refs || []).filter((r: any) => r.status === "pending").length,
        });
        setReferralsList(refs || []);
      } catch (err) {
        console.error("Error loading referral data:", err);
      }
    })();
  }, [user]);

  const activeCode = code || (user ? user.id.substring(0, 8).toUpperCase() : "GROW2026");
  const origin = typeof window !== "undefined" ? window.location.origin : "https://bethelincovibetv.com";
  const referralLink = `${origin}/register?ref=${activeCode}`;

  const handleCopy = async () => {
    const success = await copyToClipboard(referralLink);
    if (success) {
      setCopied(true);
      toast.success("Referral invite link copied to clipboard!");
      setTimeout(() => setCopied(false), 2500);
    } else {
      toast.error("Failed to copy link. Please manually copy: " + referralLink);
    }
  };

  const handleShare = async () => {
    const shareText = `🚀 Join Bethelincovibe TV — Nigeria's #1 verified SME supplier directory, AI business coaching, and growth marketplace! Use my invite code ${activeCode} to join free: ${referralLink}`;
    if ((navigator as any).share) {
      try {
        await (navigator as any).share({
          title: "Join Bethelincovibe TV with my VIP Invite",
          text: shareText,
          url: referralLink,
        });
        return;
      } catch {}
    }
    handleCopy();
  };

  const shareToWhatsApp = () => {
    const text = encodeURIComponent(
      `🚀 *Join Bethelincovibe TV — Lagos Premier Business & Supplier Hub!*\n\nGet direct WhatsApp access to 1,000+ verified wholesalers, free AI business coaching, startup tools, and exclusive discounts.\n\nUse my invite code *${activeCode}* or tap here to join:\n${referralLink}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
  };

  const shareToFacebook = () => {
    const url = encodeURIComponent(referralLink);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, "_blank");
  };

  const shareToTwitter = () => {
    const text = encodeURIComponent(
      `Scale your business with @BethelincovibeTV — 1,000+ verified Lagos suppliers & free AI business coaching! Join with my invite code: ${activeCode} ${referralLink}`
    );
    window.open(`https://twitter.com/intent/tweet?text=${text}`, "_blank");
  };

  const shareToTelegram = () => {
    const text = encodeURIComponent(
      `Join Bethelincovibe TV — Lagos Premier Business & Supplier Hub! Use invite code ${activeCode}`
    );
    window.open(`https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${text}`, "_blank");
  };

  // Generate Canvas Flyer preview
  const generateCanvasFlyer = async () => {
    setGeneratingFlyer(true);
    try {
      const qrDataUrl = await QRCode.toDataURL(referralLink, {
        width: 320,
        margin: 1,
        color: {
          dark: "#1e1b4b",
          light: "#ffffff",
        },
      });

      const qrImg = new Image();
      qrImg.src = qrDataUrl;
      await new Promise((res) => {
        qrImg.onload = res;
      });

      const canvas = document.createElement("canvas");
      canvas.width = 1080;
      canvas.height = 1350;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const theme = FLYER_THEMES[selectedTheme];

      // 1. Background Gradient
      const bgGrad = ctx.createLinearGradient(0, 0, 1080, 1350);
      bgGrad.addColorStop(0, theme.bgGrad[0]);
      bgGrad.addColorStop(0.35, theme.bgGrad[1]);
      bgGrad.addColorStop(0.7, theme.bgGrad[2]);
      bgGrad.addColorStop(1, theme.bgGrad[3]);
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, 1080, 1350);

      // 2. Ambient Lighting Orbs
      const orb1 = ctx.createRadialGradient(180, 220, 20, 180, 220, 500);
      orb1.addColorStop(0, "rgba(217, 70, 239, 0.4)");
      orb1.addColorStop(1, "rgba(217, 70, 239, 0)");
      ctx.fillStyle = orb1;
      ctx.fillRect(0, 0, 1080, 1350);

      const orb2 = ctx.createRadialGradient(900, 1100, 30, 900, 1100, 550);
      orb2.addColorStop(0, "rgba(245, 158, 11, 0.35)");
      orb2.addColorStop(1, "rgba(245, 158, 11, 0)");
      ctx.fillStyle = orb2;
      ctx.fillRect(0, 0, 1080, 1350);

      // 3. Elegant Outer Border
      ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
      ctx.lineWidth = 4;
      ctx.roundRect(50, 50, 980, 1250, 36);
      ctx.stroke();

      // 4. Header & Branding
      ctx.fillStyle = "#ffffff";
      ctx.font = "900 50px system-ui, -apple-system, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("BETHELINCOVIBE TV", 540, 145);

      ctx.fillStyle = theme.accent;
      ctx.font = "700 23px system-ui, -apple-system, sans-serif";
      ctx.fillText(customSlogan.toUpperCase(), 540, 190);

      // 5. VIP Invitation Tag
      ctx.fillStyle = "rgba(255, 255, 255, 0.14)";
      ctx.roundRect(220, 235, 640, 60, 30);
      ctx.fill();
      ctx.fillStyle = theme.textColor;
      ctx.font = "800 24px system-ui, -apple-system, sans-serif";
      ctx.fillText(`EXCLUSIVE INVITATION FROM ${(customName || displayName).toUpperCase()}`, 540, 273);

      // 6. Main Headlines
      ctx.fillStyle = "#ffffff";
      ctx.font = "900 60px system-ui, -apple-system, sans-serif";
      ctx.fillText("Scale Your Business Faster", 540, 375);

      ctx.fillStyle = theme.accent;
      ctx.font = "800 40px system-ui, -apple-system, sans-serif";
      ctx.fillText("Connect with 1,000+ Verified Suppliers", 540, 435);

      // 7. Value Bullet Points Card
      ctx.fillStyle = theme.boxBg;
      ctx.strokeStyle = theme.boxBorder;
      ctx.lineWidth = 3;
      ctx.roundRect(110, 485, 860, 290, 24);
      ctx.fill();
      ctx.stroke();

      const bullets = [
        "✓ Free Startup Toolkits & Business Financial Calculators",
        "✓ Direct WhatsApp Chat with Authentic Lagos Wholesalers",
        "✓ Free AI Business Coaching & 24/7 Growth Assistance",
        "✓ Earn Real Cash Referral Rewards in Your Wallet Balance",
      ];

      ctx.textAlign = "left";
      ctx.fillStyle = "#f8fafc";
      ctx.font = "600 26px system-ui, -apple-system, sans-serif";
      bullets.forEach((b, i) => {
        ctx.fillText(b, 150, 545 + i * 56);
      });

      // 8. QR Code Container Card
      const qrBoxY = 810;
      ctx.fillStyle = "#ffffff";
      ctx.roundRect(140, qrBoxY, 800, 340, 28);
      ctx.fill();

      // Draw QR image
      ctx.drawImage(qrImg, 180, qrBoxY + 30, 280, 280);

      // Text block on the right of QR code
      ctx.textAlign = "left";
      ctx.fillStyle = "#1e1b4b";
      ctx.font = "900 28px system-ui, -apple-system, sans-serif";
      ctx.fillText("SCAN OR TAP TO JOIN", 490, qrBoxY + 80);

      ctx.fillStyle = "#6b21a8";
      ctx.font = "700 20px system-ui, -apple-system, sans-serif";
      ctx.fillText("USE VIP INVITE CODE:", 490, qrBoxY + 125);

      // Code Pill
      ctx.fillStyle = "#f3e8ff";
      ctx.roundRect(490, qrBoxY + 145, 410, 70, 16);
      ctx.fill();
      ctx.fillStyle = "#581c87";
      ctx.font = "900 40px monospace";
      ctx.fillText(activeCode, 520, qrBoxY + 195);

      ctx.fillStyle = "#64748b";
      ctx.font = "600 19px system-ui, -apple-system, sans-serif";
      ctx.fillText("bethelincovibetv.com/register", 490, qrBoxY + 250);

      ctx.fillStyle = "#059669";
      ctx.font = "700 18px system-ui, -apple-system, sans-serif";
      ctx.fillText("• Instant ₦500 Welcome Bonus", 490, qrBoxY + 285);

      // 9. Footer
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
      ctx.font = "600 20px system-ui, -apple-system, sans-serif";
      ctx.fillText("Bethelincovibe TV • Building Africa's Smartest SME Network", 540, 1240);

      const dataUrl = canvas.toDataURL("image/png");
      setFlyerDataUrl(dataUrl);
    } catch (err) {
      console.error("Flyer creation error:", err);
    } finally {
      setGeneratingFlyer(false);
    }
  };

  useEffect(() => {
    generateCanvasFlyer();
  }, [selectedTheme, customName, customSlogan, activeCode]);

  const downloadFlyer = () => {
    if (!flyerDataUrl) return;
    const a = document.createElement("a");
    a.href = flyerDataUrl;
    a.download = `bethelincovibe-invite-${activeCode}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success("Flyer downloaded! Share on WhatsApp Status and Instagram stories.");
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <SEO
        title="Refer & Earn Real Cash Rewards | Bethelincovibe TV"
        description="Invite entrepreneurs and business owners to Bethelincovibe TV and earn instant cash bonuses in your wallet with 10% recurring commissions."
        image={PAGE_OG_IMAGES.referral()}
        url={`${origin}/referral`}
      />

      {/* Hero Banner Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-purple-950/40 via-background to-background pt-8 pb-12 border-b border-border/40">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Col: Info & Headline */}
            <div className="lg:col-span-7 space-y-5">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-400 text-xs font-black uppercase tracking-wider">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Bethel VIP Referral Program</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-foreground leading-[1.15]">
                Invite Fellow Entrepreneurs, <br />
                <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-amber-400 bg-clip-text text-transparent">
                  Earn Real Cash Daily
                </span>
              </h1>

              <p className="text-sm sm:text-base text-muted-foreground max-w-xl leading-relaxed">
                Empower Nigerian SME owners and suppliers. Earn direct cash bonuses in your Bethelincovibe TV wallet whenever friends register, list products, or grow with our platform.
              </p>

              {/* Reward Highlights */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                <div className="p-3 rounded-2xl bg-card border border-purple-500/20 shadow-xs">
                  <div className="text-xs font-medium text-muted-foreground">Signup Reward</div>
                  <div className="text-lg sm:text-xl font-black text-purple-400">₦500 Bonus</div>
                  <div className="text-[11px] text-muted-foreground">Per verified registrant</div>
                </div>
                <div className="p-3 rounded-2xl bg-card border border-amber-500/20 shadow-xs">
                  <div className="text-xs font-medium text-muted-foreground">Commission</div>
                  <div className="text-lg sm:text-xl font-black text-amber-400">10% Lifetime</div>
                  <div className="text-[11px] text-muted-foreground">On ads & digital tools</div>
                </div>
                <div className="p-3 rounded-2xl bg-card border border-emerald-500/20 shadow-xs col-span-2 sm:col-span-1">
                  <div className="text-xs font-medium text-muted-foreground">Payouts</div>
                  <div className="text-lg sm:text-xl font-black text-emerald-400">Direct Wallet</div>
                  <div className="text-[11px] text-muted-foreground">Instant withdrawal</div>
                </div>
              </div>

              {/* Action Buttons if user not logged in */}
              {!user && (
                <div className="flex flex-wrap gap-3 pt-3">
                  <Button asChild size="lg" className="bg-purple-600 hover:bg-purple-700 text-white font-bold gap-2 shadow-lg">
                    <Link to="/register">
                      Create Free Account to Get Link <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="lg" className="font-semibold">
                    <Link to="/login">Sign In</Link>
                  </Button>
                </div>
              )}
            </div>

            {/* Right Col: 3D Creative Flyer Image Banner */}
            <div className="lg:col-span-5">
              <div className="relative rounded-3xl overflow-hidden border-2 border-purple-500/30 shadow-2xl group">
                <img
                  src="/src/assets/images/referral_creative_flyer_1787723566004.jpg"
                  alt="Bethelincovibe TV Referral Creative Flyer Design"
                  className="w-full h-auto object-cover transform group-hover:scale-105 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-5 text-white">
                  <Badge className="w-fit bg-amber-500 text-black font-black text-xs mb-1">
                    Official Creative Flyer
                  </Badge>
                  <p className="text-xs font-semibold text-purple-200">
                    Auto-generated with your custom invite code & QR code below!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <div className="container mx-auto max-w-6xl px-4 py-10 space-y-10">
        {/* User Referral Link & Stats Section */}
        {user ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Link & Fast Share */}
            <div className="lg:col-span-7 space-y-6">
              <Card className="border-purple-500/30 shadow-md bg-card">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-purple-600 text-white">
                        <Gift className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-lg font-bold">Your Unique Referral Link</CardTitle>
                        <CardDescription className="text-xs">
                          Share this link across social media and WhatsApp groups
                        </CardDescription>
                      </div>
                    </div>
                    <Badge className="bg-purple-600/20 text-purple-400 border border-purple-500/30 font-mono font-bold text-xs">
                      Code: {activeCode}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Link Box */}
                  <div className="flex items-center gap-2 bg-secondary/50 border border-border rounded-xl p-2 sm:p-2.5">
                    <code className="text-xs font-mono flex-1 truncate text-foreground select-all px-2">
                      {referralLink}
                    </code>
                    <Button
                      onClick={handleCopy}
                      size="sm"
                      className="gap-1.5 font-bold shrink-0 bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      {copied ? <Check className="h-4 w-4 text-white" /> : <Copy className="h-4 w-4" />}
                      {copied ? "Copied!" : "Copy Link"}
                    </Button>
                  </div>

                  {/* 1-Click Social Share Row */}
                  <div className="space-y-2">
                    <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Quick Share to Network
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <Button
                        onClick={shareToWhatsApp}
                        variant="outline"
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white border-transparent font-bold text-xs gap-1.5 justify-center shadow-xs"
                      >
                        <MessageCircle className="h-4 w-4" />
                        WhatsApp
                      </Button>

                      <Button
                        onClick={shareToFacebook}
                        variant="outline"
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 text-white border-transparent font-bold text-xs gap-1.5 justify-center shadow-xs"
                      >
                        <Share2 className="h-4 w-4" />
                        Facebook
                      </Button>

                      <Button
                        onClick={shareToTwitter}
                        variant="outline"
                        size="sm"
                        className="bg-slate-900 hover:bg-black text-white border-transparent font-bold text-xs gap-1.5 justify-center shadow-xs dark:bg-slate-800"
                      >
                        <Share2 className="h-4 w-4" />
                        X / Twitter
                      </Button>

                      <Button
                        onClick={shareToTelegram}
                        variant="outline"
                        size="sm"
                        className="bg-sky-500 hover:bg-sky-600 text-white border-transparent font-bold text-xs gap-1.5 justify-center shadow-xs"
                      >
                        <Share2 className="h-4 w-4" />
                        Telegram
                      </Button>
                    </div>
                  </div>

                  {/* Native Share & Modal Trigger */}
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-border/60">
                    <Button
                      onClick={handleShare}
                      variant="outline"
                      size="sm"
                      className="font-bold text-xs gap-1.5"
                    >
                      <Share2 className="h-3.5 w-3.5" />
                      More Share Options
                    </Button>
                    <Button
                      onClick={() => setFlyerModalOpen(true)}
                      size="sm"
                      variant="secondary"
                      className="font-bold text-xs gap-1.5 text-purple-600 dark:text-purple-300"
                    >
                      <Smartphone className="h-3.5 w-3.5" />
                      Open Fullscreen Flyer Modal
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Referred Members History List */}
              <Card className="border-border shadow-xs">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-purple-500" />
                      <CardTitle className="text-base font-bold">Your Invited Network ({referralsList.length})</CardTitle>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      Live Status
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {referralsList.length === 0 ? (
                    <div className="py-8 text-center space-y-3">
                      <div className="w-12 h-12 rounded-full bg-purple-500/10 text-purple-500 mx-auto flex items-center justify-center">
                        <Users className="h-6 w-6" />
                      </div>
                      <div className="text-sm font-semibold text-foreground">No referrals yet</div>
                      <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                        Share your invite link or download the flyer below to start inviting entrepreneurs.
                      </p>
                      <Button onClick={shareToWhatsApp} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1">
                        <MessageCircle className="h-3.5 w-3.5" /> Invite on WhatsApp
                      </Button>
                    </div>
                  ) : (
                    <div className="divide-y divide-border/60">
                      {referralsList.map((ref, idx) => (
                        <div key={ref.id || idx} className="py-3 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-purple-600/10 text-purple-500 flex items-center justify-center font-bold">
                              #{idx + 1}
                            </div>
                            <div>
                              <div className="font-bold text-foreground">
                                {ref.referee_name || `Member ${ref.referee_id?.substring(0, 6) || "ID"}`}
                              </div>
                              <div className="text-[11px] text-muted-foreground">
                                Joined {new Date(ref.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge
                              className={`text-[10px] uppercase font-bold ${
                                ref.status === "completed"
                                  ? "bg-emerald-500/20 text-emerald-600 border-emerald-500/30"
                                  : "bg-amber-500/20 text-amber-600 border-amber-500/30"
                              }`}
                            >
                              {ref.status || "Registered"}
                            </Badge>
                            <div className="font-black text-emerald-600 text-xs mt-0.5">
                              +₦{(Number(ref.signup_bonus_amount || 500)).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right: Wallet & Live Stats */}
            <div className="lg:col-span-5 space-y-6">
              <Card className="bg-gradient-to-br from-purple-900 to-indigo-950 text-white border-purple-500/40 shadow-xl overflow-hidden relative">
                <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
                  <Wallet className="h-32 w-32" />
                </div>
                <CardContent className="p-6 space-y-6 relative z-10">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-purple-200">
                      Referral Earnings
                    </span>
                    <Badge className="bg-emerald-500 text-black font-black text-xs">
                      Active
                    </Badge>
                  </div>

                  <div>
                    <div className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                      ₦{stats.earned.toLocaleString()}
                    </div>
                    <div className="text-xs text-purple-200 mt-1">
                      Total earned from referrals to date
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/10 text-xs">
                    <div>
                      <div className="text-purple-300">Total Invited</div>
                      <div className="text-xl font-bold text-white mt-0.5">{stats.count} entrepreneurs</div>
                    </div>
                    <div>
                      <div className="text-purple-300">Pending Actions</div>
                      <div className="text-xl font-bold text-white mt-0.5">{stats.pending}</div>
                    </div>
                  </div>

                  <Button asChild className="w-full bg-white text-slate-950 hover:bg-slate-100 font-black shadow-lg">
                    <Link to="/dashboard/wallet" className="flex items-center justify-center gap-2">
                      <Wallet className="h-4 w-4" />
                      Manage Wallet & Withdraw
                    </Link>
                  </Button>
                </CardContent>
              </Card>

              {/* Commission Rule Box */}
              <Card className="border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-emerald-500" />
                    How Payouts Work
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-xs text-muted-foreground">
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-foreground">Instant Wallet Credit:</strong> When your invited friend completes their business profile, bonus rewards credit straight to your wallet.
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-foreground">10% Lifetime Purchases:</strong> Whenever someone you referred buys courses, digital templates, or runs featured ads, you receive 10% commission.
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-foreground">Direct Bank Withdrawals:</strong> Withdraw your wallet funds directly to any Nigerian commercial bank account with 0 hassle.
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          /* Guest Banner to register */
          <Card className="border-purple-500/40 bg-gradient-to-r from-purple-950/40 via-card to-card p-6 sm:p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-purple-600/20 text-purple-400 mx-auto flex items-center justify-center">
              <Gift className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-black text-foreground">
              Sign In to Access Your Personalized Referral Link & Flyer
            </h2>
            <p className="text-sm text-muted-foreground max-w-lg mx-auto">
              Join thousands of Nigerian creators, entrepreneurs, and suppliers earning passive income through the Bethelincovibe TV network.
            </p>
            <div className="flex justify-center gap-3 pt-2">
              <Button asChild size="lg" className="bg-purple-600 hover:bg-purple-700 text-white font-bold">
                <Link to="/register">Register Free Account</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="font-semibold">
                <Link to="/login">Log In</Link>
              </Button>
            </div>
          </Card>
        )}

        {/* Interactive Creative Flyer Studio */}
        <section className="space-y-6 pt-6 border-t border-border">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-500 text-xs font-bold mb-1">
                <Palette className="h-3.5 w-3.5" />
                Custom Flyer Generator Studio
              </div>
              <h2 className="text-2xl font-black tracking-tight text-foreground">
                Generate Your Customized Creative Flyer
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Personalize your flyer theme, customize headline copy, and download ready-to-post graphics for WhatsApp Status and Instagram!
              </p>
            </div>
            <Button
              onClick={downloadFlyer}
              disabled={generatingFlyer || !flyerDataUrl}
              size="lg"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 shrink-0 shadow-lg"
            >
              <Download className="h-4 w-4" />
              Download Flyer (PNG)
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Customizer Controls */}
            <div className="lg:col-span-5 space-y-5">
              {/* Theme Picker */}
              <Card className="border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Layers className="h-4 w-4 text-purple-500" />
                    1. Select Design Theme
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-2.5">
                  {(Object.keys(FLYER_THEMES) as FlyerTheme[]).map((themeKey) => {
                    const t = FLYER_THEMES[themeKey];
                    const isSelected = selectedTheme === themeKey;
                    return (
                      <button
                        key={themeKey}
                        onClick={() => setSelectedTheme(themeKey)}
                        className={`p-3 rounded-2xl border text-left transition-all ${
                          isSelected
                            ? "border-purple-600 ring-2 ring-purple-600/30 bg-purple-500/10"
                            : "border-border hover:border-border/80 bg-card"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-xs text-foreground">{t.name}</span>
                          {isSelected && <Check className="h-3.5 w-3.5 text-purple-500" />}
                        </div>
                        <span className="text-[10px] text-muted-foreground block">{t.badge}</span>
                      </button>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Text Customizer */}
              <Card className="border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-amber-500" />
                    2. Customize Text & Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Your Display Name on Flyer</Label>
                    <Input
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      placeholder="e.g. Adeola Johnson"
                      className="text-xs h-9"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Subtitle / Slogan</Label>
                    <Input
                      value={customSlogan}
                      onChange={(e) => setCustomSlogan(e.target.value)}
                      placeholder="e.g. Lagos Premier Business & Supplier Hub"
                      className="text-xs h-9"
                    />
                  </div>

                  <div className="p-3 rounded-xl bg-secondary/50 text-[11px] text-muted-foreground flex items-center gap-2">
                    <QrCode className="h-4 w-4 text-purple-500 shrink-0" />
                    <span>Your unique invite code <strong className="text-foreground">{activeCode}</strong> and scannable QR code are automatically embedded.</span>
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-2">
                <Button
                  onClick={downloadFlyer}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold gap-2"
                >
                  <Download className="h-4 w-4" /> Download High-Res
                </Button>
                <Button
                  onClick={shareToWhatsApp}
                  variant="outline"
                  className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white border-transparent font-bold"
                >
                  <MessageCircle className="h-4 w-4" /> Share on WA
                </Button>
              </div>
            </div>

            {/* Live Canvas Flyer Preview */}
            <div className="lg:col-span-7 flex flex-col items-center">
              <div className="w-full max-w-md bg-slate-900 rounded-3xl p-3 sm:p-4 border-2 border-purple-500/30 shadow-2xl">
                <div className="relative rounded-2xl overflow-hidden aspect-[4/5] bg-black flex items-center justify-center">
                  {flyerDataUrl ? (
                    <img
                      src={flyerDataUrl}
                      alt="Generated Referral Flyer"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="text-center text-xs text-muted-foreground animate-pulse">
                      Generating high-resolution flyer...
                    </div>
                  )}
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-slate-400 px-1">
                  <span>Aspect: 4:5 Portrait (Stories & WhatsApp)</span>
                  <span className="text-purple-400 font-semibold">1080 × 1350 px</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Step-by-Step Guide */}
        <section className="space-y-6 pt-8 border-t border-border">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-2xl font-black tracking-tight text-foreground">
              How the Referral Program Works
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Three simple steps to start earning daily bonuses from your business network.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-border relative overflow-hidden">
              <div className="p-1.5 bg-purple-600 text-white text-[10px] font-black text-center uppercase tracking-wider">
                Step 01
              </div>
              <CardContent className="p-5 space-y-2.5">
                <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-500 flex items-center justify-center font-black">
                  <Share2 className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-base text-foreground">Share Your Invite Link</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Post your customized creative flyer on WhatsApp Status, Facebook groups, Instagram, or share your invite link directly with fellow entrepreneurs.
                </p>
              </CardContent>
            </Card>

            <Card className="border-border relative overflow-hidden">
              <div className="p-1.5 bg-pink-600 text-white text-[10px] font-black text-center uppercase tracking-wider">
                Step 02
              </div>
              <CardContent className="p-5 space-y-2.5">
                <div className="w-10 h-10 rounded-2xl bg-pink-500/10 text-pink-500 flex items-center justify-center font-black">
                  <Users className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-base text-foreground">Friends Join & Grow</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  They register free, discover 1,000+ verified suppliers, download startup business plans, and use our AI business coach to expand their ventures.
                </p>
              </CardContent>
            </Card>

            <Card className="border-border relative overflow-hidden">
              <div className="p-1.5 bg-emerald-600 text-white text-[10px] font-black text-center uppercase tracking-wider">
                Step 03
              </div>
              <CardContent className="p-5 space-y-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-black">
                  <Wallet className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-base text-foreground">Collect Cash Bonuses</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Receive cash bonuses and recurring 10% commissions directly in your Bethelincovibe wallet, withdrawable directly to your Nigerian bank.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="space-y-6 pt-6 border-t border-border">
          <div className="text-center max-w-xl mx-auto space-y-1.5">
            <h2 className="text-xl sm:text-2xl font-black text-foreground">
              Frequently Asked Questions
            </h2>
            <p className="text-xs text-muted-foreground">
              Everything you need to know about rewards, payouts, and referral limits.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
            <Card className="border-border">
              <CardContent className="p-4 space-y-1.5">
                <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                  <HelpCircle className="h-4 w-4 text-purple-500 shrink-0" />
                  How much can I earn per referral?
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  You earn ₦500 welcome bonus for every verified business registrant plus a lifetime 10% commission on any digital products, featured ads, or masterclasses they purchase.
                </p>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardContent className="p-4 space-y-1.5">
                <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                  <HelpCircle className="h-4 w-4 text-purple-500 shrink-0" />
                  Is there any limit to how many people I can invite?
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  No! There are zero limits. You can invite as many entrepreneurs, artisans, wholesalers, and startup owners as you want and accumulate unlimited earnings.
                </p>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardContent className="p-4 space-y-1.5">
                <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                  <HelpCircle className="h-4 w-4 text-purple-500 shrink-0" />
                  How do I withdraw my referral earnings?
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Go to your User Wallet at any time, click Withdraw, and enter your Nigerian bank account number. Payouts are processed securely.
                </p>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardContent className="p-4 space-y-1.5">
                <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                  <HelpCircle className="h-4 w-4 text-purple-500 shrink-0" />
                  Can I share the flyer on WhatsApp Status?
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Yes! The creative flyer is designed specifically in 4:5 high-resolution format with your QR code, perfect for WhatsApp Status, Facebook, and Instagram stories.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>

      {/* Modal dialog for flyer */}
      <ReferralFlyerModal
        open={flyerModalOpen}
        onOpenChange={setFlyerModalOpen}
        referralCode={activeCode}
        userName={displayName}
      />
    </div>
  );
}
