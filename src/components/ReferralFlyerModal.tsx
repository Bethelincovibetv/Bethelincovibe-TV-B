import React, { useRef, useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Share2, Copy, Check, Sparkles, QrCode, Gift, Smartphone, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import QRCode from "qrcode";

interface ReferralFlyerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  referralCode: string;
  userName?: string;
}

export default function ReferralFlyerModal({
  open,
  onOpenChange,
  referralCode,
  userName = "Entrepreneur",
}: ReferralFlyerModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [flyerDataUrl, setFlyerDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);

  const referralLink = `${typeof window !== "undefined" ? window.location.origin : "https://bethelincovibetv.com"}/register?ref=${referralCode}`;

  // Generate the Canvas flyer
  useEffect(() => {
    if (!open || !referralCode) return;
    generateFlyer();
  }, [open, referralCode]);

  const generateFlyer = async () => {
    setGenerating(true);
    try {
      // 1. Generate QR code data url
      const qrDataUrl = await QRCode.toDataURL(referralLink, {
        width: 260,
        margin: 1,
        color: {
          dark: "#4c1d95", // deep purple
          light: "#ffffff",
        },
      });

      const qrImg = new Image();
      qrImg.src = qrDataUrl;
      await new Promise((res) => {
        qrImg.onload = res;
      });

      // 2. Draw on Canvas (1080 x 1350 Instagram / WhatsApp Portrait Size)
      const canvas = document.createElement("canvas");
      canvas.width = 1080;
      canvas.height = 1350;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Background gradient
      const bgGrad = ctx.createLinearGradient(0, 0, 1080, 1350);
      bgGrad.addColorStop(0, "#2e0854");
      bgGrad.addColorStop(0.35, "#4c1d95");
      bgGrad.addColorStop(0.7, "#1e1b4b");
      bgGrad.addColorStop(1, "#09090b");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, 1080, 1350);

      // Decorative lighting orbs
      const orb1 = ctx.createRadialGradient(150, 200, 20, 150, 200, 450);
      orb1.addColorStop(0, "rgba(217, 70, 239, 0.35)");
      orb1.addColorStop(1, "rgba(217, 70, 239, 0)");
      ctx.fillStyle = orb1;
      ctx.fillRect(0, 0, 1080, 1350);

      const orb2 = ctx.createRadialGradient(900, 1100, 30, 900, 1100, 500);
      orb2.addColorStop(0, "rgba(245, 158, 11, 0.3)");
      orb2.addColorStop(1, "rgba(245, 158, 11, 0)");
      ctx.fillStyle = orb2;
      ctx.fillRect(0, 0, 1080, 1350);

      // Card container outline
      ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
      ctx.lineWidth = 4;
      ctx.roundRect(60, 60, 960, 1230, 36);
      ctx.stroke();

      // Top Brand Header
      ctx.fillStyle = "#ffffff";
      ctx.font = "900 48px system-ui, -apple-system, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("BETHELINCOVIBE TV", 540, 150);

      ctx.fillStyle = "#fbbf24"; // Amber-400
      ctx.font = "700 24px system-ui, -apple-system, sans-serif";
      ctx.letterSpacing = "4px";
      ctx.fillText("LAGOS PREMIER BUSINESS & SUPPLIER HUB", 540, 195);

      // Exclusive Invitation Badge
      ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
      ctx.roundRect(240, 240, 600, 64, 32);
      ctx.fill();
      ctx.fillStyle = "#e9d5ff";
      ctx.font = "800 26px system-ui, -apple-system, sans-serif";
      ctx.fillText(`EXCLUSIVE INVITATION FROM ${userName.toUpperCase()}`, 540, 282);

      // Main Offer Headline
      ctx.fillStyle = "#ffffff";
      ctx.font = "900 64px system-ui, -apple-system, sans-serif";
      ctx.fillText("Scale Your Business in Lagos", 540, 390);

      ctx.fillStyle = "#a855f7"; // Purple-500
      ctx.font = "800 44px system-ui, -apple-system, sans-serif";
      ctx.fillText("Connect with 1,000+ Verified Suppliers", 540, 450);

      // Feature Bullet Box
      ctx.fillStyle = "rgba(15, 23, 42, 0.75)";
      ctx.strokeStyle = "rgba(168, 85, 247, 0.4)";
      ctx.lineWidth = 3;
      ctx.roundRect(120, 500, 840, 280, 24);
      ctx.fill();
      ctx.stroke();

      const bullets = [
        "✓ Free Startup Guides & Business Planning Tools",
        "✓ Direct WhatsApp Access to Verified Lagos Wholesalers",
        "✓ Free AI Business Coaching & Marketing Assistance",
        "✓ Instant Referral Rewards & Community Support",
      ];

      ctx.textAlign = "left";
      ctx.fillStyle = "#f8fafc";
      ctx.font = "600 28px system-ui, -apple-system, sans-serif";
      bullets.forEach((b, i) => {
        ctx.fillText(b, 170, 560 + i * 54);
      });

      // QR Code Container & Referral Code Display
      const qrBoxY = 820;
      ctx.fillStyle = "#ffffff";
      ctx.roundRect(160, qrBoxY, 760, 330, 28);
      ctx.fill();

      // Draw QR Code
      ctx.drawImage(qrImg, 200, qrBoxY + 35, 260, 260);

      // Text beside QR
      ctx.textAlign = "left";
      ctx.fillStyle = "#0f172a";
      ctx.font = "800 30px system-ui, -apple-system, sans-serif";
      ctx.fillText("SCAN TO JOIN TODAY", 500, qrBoxY + 80);

      ctx.fillStyle = "#64748b";
      ctx.font = "600 22px system-ui, -apple-system, sans-serif";
      ctx.fillText("Or use VIP Referral Code at signup:", 500, qrBoxY + 120);

      // Referral code pill
      ctx.fillStyle = "#7c3aed";
      ctx.roundRect(500, qrBoxY + 145, 380, 70, 16);
      ctx.fill();

      ctx.fillStyle = "#ffffff";
      ctx.font = "900 36px monospace";
      ctx.textAlign = "center";
      ctx.fillText(referralCode, 690, qrBoxY + 194);

      ctx.fillStyle = "#16a34a";
      ctx.font = "700 20px system-ui, -apple-system, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("🎁 Claim Instant Welcome Bonus Credits", 500, qrBoxY + 250);

      // Footer
      ctx.textAlign = "center";
      ctx.fillStyle = "#94a3b8";
      ctx.font = "500 22px system-ui, -apple-system, sans-serif";
      ctx.fillText("www.bethelincovibetv.com · Nigeria's #1 SME Growth Engine", 540, 1220);

      const url = canvas.toDataURL("image/png");
      setFlyerDataUrl(url);
    } catch (e) {
      console.error("Flyer creation error:", e);
      toast.error("Failed to render referral flyer");
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!flyerDataUrl) return;
    const a = document.createElement("a");
    a.href = flyerDataUrl;
    a.download = `Bethelincovibe-VIP-Invite-${referralCode}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success("Referral flyer downloaded!");
  };

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success("Referral link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      `🚀 Join Bethelincovibe TV — Lagos Premier Business & Supplier Hub! Use my invite code *${referralCode}* or tap here to join: ${referralLink}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
  };

  const handleNativeShare = async () => {
    if (!flyerDataUrl) return;
    try {
      const res = await fetch(flyerDataUrl);
      const blob = await res.blob();
      const file = new File([blob], `Bethelincovibe-Invite-${referralCode}.png`, { type: "image/png" });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: "Bethelincovibe TV Exclusive Invitation",
          text: `Join Bethelincovibe TV using my VIP referral code: ${referralCode}`,
          url: referralLink,
          files: [file],
        });
        return;
      }
    } catch (e) {
      console.warn("Native file share fallback:", e);
    }

    // Fallback text share
    if ((navigator as any).share) {
      navigator.share({
        title: "Bethelincovibe TV Invitation",
        text: `Join Bethelincovibe TV using my VIP referral code: ${referralCode}`,
        url: referralLink,
      });
    } else {
      handleCopyLink();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 rounded-3xl">
        <DialogHeader className="space-y-1 text-left">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-purple-600/10 text-purple-600">
              <Gift className="h-5 w-5" />
            </div>
            <DialogTitle className="text-xl font-extrabold text-foreground">
              Your VIP Referral Flyer
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Share this customized flyer on WhatsApp, Instagram, Twitter, and Facebook. When entrepreneurs sign up with your code, you earn bonus cash in your wallet!
          </DialogDescription>
        </DialogHeader>

        {/* Flyer Canvas Preview */}
        <div className="my-3 flex justify-center">
          {flyerDataUrl ? (
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-purple-500/30 max-h-[380px] bg-slate-950">
              <img
                src={flyerDataUrl}
                alt="Custom VIP Referral Flyer"
                className="w-auto h-[380px] object-contain mx-auto"
              />
              <div className="absolute bottom-2 right-2">
                <Badge className="bg-purple-600/90 text-white font-mono text-[10px] backdrop-blur-md">
                  Code: {referralCode}
                </Badge>
              </div>
            </div>
          ) : (
            <div className="h-[340px] w-full rounded-2xl bg-secondary/60 flex items-center justify-center text-xs text-muted-foreground animate-pulse">
              Generating High-Resolution Flyer...
            </div>
          )}
        </div>

        {/* Referral Link Quick Copy Box */}
        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-secondary/70 border border-border">
          <code className="text-xs font-mono flex-1 truncate text-foreground px-2">
            {referralLink}
          </code>
          <Button size="sm" variant="ghost" onClick={handleCopyLink} className="h-8 px-3 font-bold text-xs gap-1.5 shrink-0">
            {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied" : "Copy Link"}
          </Button>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
          <Button
            onClick={handleDownload}
            disabled={!flyerDataUrl}
            className="w-full h-10 rounded-xl font-bold text-xs bg-purple-600 hover:bg-purple-700 text-white gap-1.5 shadow-md shadow-purple-600/20"
          >
            <Download className="h-4 w-4" /> Download Flyer
          </Button>

          <Button
            onClick={handleShareWhatsApp}
            variant="outline"
            className="w-full h-10 rounded-xl font-bold text-xs border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10 gap-1.5"
          >
            <Smartphone className="h-4 w-4" /> Share on WhatsApp
          </Button>

          <Button
            onClick={handleNativeShare}
            variant="secondary"
            className="w-full h-10 rounded-xl font-bold text-xs gap-1.5"
          >
            <Share2 className="h-4 w-4" /> More Share Options
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
