import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Briefcase,
  CheckCircle2,
  Sparkles,
  MessageCircle,
  Calendar,
  ExternalLink,
  ShieldCheck,
  Eye,
  Share2,
  Clock,
  ArrowRight,
  Phone,
} from "lucide-react";
import DirectServiceBookingDialog from "./DirectServiceBookingDialog";
import BusinessChatDialog from "@/components/BusinessChatDialog";
import { toast } from "sonner";

export interface ServiceData {
  title: string;
  description?: string;
  image_url?: string;
  flyer_creative_url?: string;
  photo_url?: string;
  image?: string;
  link_url?: string;
  url?: string;
  price?: string;
  suggestedPrice?: string;
  benefits?: string[];
  cta_text?: string;
  ctaText?: string;
  keywords?: string[];
  duration?: string;
  category?: string;
}

interface FeaturedServiceCardProps {
  service: ServiceData;
  businessId?: string;
  businessName?: string;
  ownerUserId?: string;
  businessPhone?: string | null;
  businessWhatsApp?: string | null;
  businessEmail?: string | null;
  isVerified?: boolean;
  className?: string;
}

export default function FeaturedServiceCard({
  service,
  businessId = "",
  businessName = "Verified Business",
  ownerUserId,
  businessPhone,
  businessWhatsApp,
  businessEmail,
  isVerified = true,
  className = "",
}: FeaturedServiceCardProps) {
  const [detailOpen, setDetailOpen] = useState(false);

  const title = service?.title || "Professional Service";
  const desc = service?.description || "";
  const imageUrl =
    service?.image_url ||
    service?.flyer_creative_url ||
    service?.photo_url ||
    service?.image;
  const price = service?.price || service?.suggestedPrice;
  const benefits = Array.isArray(service?.benefits) ? service.benefits : [];
  const ctaText = service?.cta_text || service?.ctaText || "Book Service";
  const keywords = Array.isArray(service?.keywords) ? service.keywords : [];
  const externalLink = service?.link_url || service?.url;

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareData = {
      title: `${title} - ${businessName}`,
      text: `${title} offered by ${businessName} on Bethelincovibe TV. ${price ? `Pricing: ${price}` : ""}`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {}
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Service link copied to clipboard!");
    }
  };

  return (
    <>
      <div
        className={`group relative rounded-3xl border border-border/80 bg-card/95 hover:bg-card hover:border-primary/50 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col h-full overflow-hidden ${className}`}
      >
        {/* Top Image / Visual Showcase */}
        <div
          onClick={() => setDetailOpen(true)}
          className="aspect-[16/10] w-full bg-muted/60 overflow-hidden relative cursor-pointer select-none"
        >
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 via-indigo-500/10 to-emerald-500/20 flex flex-col items-center justify-center p-6 text-center relative">
              <div className="w-14 h-14 rounded-2xl bg-background/80 backdrop-blur-md shadow-md border border-primary/20 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                <Briefcase className="h-7 w-7" />
              </div>
              <p className="text-xs font-black text-foreground mt-3 tracking-wide">
                {title}
              </p>
            </div>
          )}

          {/* Top Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />

          {/* Top Badges */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 z-10">
            {isVerified && (
              <Badge className="bg-emerald-600/90 hover:bg-emerald-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full backdrop-blur-md shadow-xs flex items-center gap-1 border border-emerald-400/30">
                <ShieldCheck className="h-3 w-3" /> Verified Service
              </Badge>
            )}

            <button
              onClick={handleShare}
              title="Share service"
              className="ml-auto h-7 w-7 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-md flex items-center justify-center transition-all active:scale-90"
            >
              <Share2 className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Price Overlay Banner */}
          {price && (
            <div className="absolute bottom-3 left-3 z-10">
              <div className="bg-primary/95 text-primary-foreground text-xs font-black px-3 py-1 rounded-xl shadow-md backdrop-blur-md border border-white/20 flex items-center gap-1">
                <span>{price}</span>
              </div>
            </div>
          )}

          {/* Quick View Button on Hover */}
          <div className="absolute bottom-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <span className="bg-black/70 hover:bg-black/90 text-white text-[10px] font-bold px-2 py-1 rounded-lg backdrop-blur-md flex items-center gap-1">
              <Eye className="h-3 w-3" /> Full View
            </span>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
          <div className="space-y-2">
            <h3
              onClick={() => setDetailOpen(true)}
              className="font-black text-sm sm:text-base text-foreground group-hover:text-primary transition-colors cursor-pointer line-clamp-1 leading-snug"
              title={title}
            >
              {title}
            </h3>

            {desc && (
              <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                {desc}
              </p>
            )}

            {/* Key Deliverables & Benefits Checklist */}
            {benefits.length > 0 && (
              <div className="pt-2.5 space-y-1.5 border-t border-border/60">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Deliverables &amp; Inclusions:
                </p>
                <div className="space-y-1">
                  {benefits.slice(0, 3).map((b: string, bi: number) => (
                    <div
                      key={bi}
                      className="flex items-start gap-1.5 text-xs text-foreground/90 font-medium"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                      <span className="truncate">{b}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Keywords / Tags */}
            {keywords.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {keywords.slice(0, 3).map((kw: string, kwi: number) => (
                  <span
                    key={kwi}
                    className="text-[10px] px-2 py-0.5 rounded-md bg-muted/80 text-muted-foreground font-medium"
                  >
                    #{kw}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Action Bar */}
          <div className="pt-3 border-t border-border/60 grid grid-cols-2 gap-2 mt-auto">
            <DirectServiceBookingDialog
              businessId={businessId}
              businessName={businessName}
              ownerUserId={ownerUserId}
              serviceTitle={title}
              servicePrice={price}
              serviceImageUrl={imageUrl}
              businessPhone={businessPhone}
              businessWhatsApp={businessWhatsApp}
              businessEmail={businessEmail}
              trigger={
                <Button
                  size="sm"
                  className="w-full text-xs font-black h-9 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm gap-1 transition-transform active:scale-95"
                >
                  <Calendar className="h-3.5 w-3.5" />
                  {ctaText || "Book Service"}
                </Button>
              }
            />

            {businessId ? (
              <BusinessChatDialog
                businessId={businessId}
                businessName={businessName}
                serviceTitle={title}
                trigger={
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full text-xs font-bold h-9 rounded-xl border-border/80 hover:bg-muted gap-1 text-foreground"
                  >
                    <MessageCircle className="h-3.5 w-3.5 text-primary" />
                    Inquire
                  </Button>
                }
              />
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setDetailOpen(true)}
                className="w-full text-xs font-bold h-9 rounded-xl border-border/80 hover:bg-muted gap-1 text-foreground"
              >
                <Eye className="h-3.5 w-3.5 text-primary" />
                Details
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Expansive Full Details Modal */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-xl rounded-3xl p-0 overflow-hidden bg-card border-border/80 shadow-2xl">
          {imageUrl && (
            <div className="aspect-[16/9] w-full bg-black relative flex items-center justify-center overflow-hidden">
              <img
                src={imageUrl}
                alt={title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
              {price && (
                <div className="absolute bottom-4 left-4">
                  <Badge className="bg-primary text-primary-foreground text-sm font-black px-3.5 py-1 rounded-xl shadow-lg border border-white/20">
                    {price}
                  </Badge>
                </div>
              )}
            </div>
          )}

          <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
            <DialogHeader className="text-left space-y-1.5 pb-2 border-b">
              <div className="flex items-center gap-2">
                <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-xs font-bold">
                  <ShieldCheck className="h-3 w-3 mr-1" /> Verified Service Solution
                </Badge>
                {businessName && (
                  <Badge variant="outline" className="text-xs font-semibold">
                    {businessName}
                  </Badge>
                )}
              </div>
              <DialogTitle className="text-xl sm:text-2xl font-black text-foreground">
                {title}
              </DialogTitle>
            </DialogHeader>

            {desc && (
              <div className="space-y-1">
                <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                  About This Service
                </h4>
                <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
                  {desc}
                </p>
              </div>
            )}

            {/* Complete Inclusions List */}
            {benefits.length > 0 && (
              <div className="space-y-2 p-4 rounded-2xl bg-muted/50 border border-border/60">
                <h4 className="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-primary" /> Key Deliverables &amp; Benefits:
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {benefits.map((b: string, i: number) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-foreground font-medium">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{b}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* External URL / Order Link */}
            {externalLink && (
              <div className="pt-2">
                <Button asChild variant="outline" className="w-full rounded-xl gap-2 font-bold">
                  <a href={externalLink} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" /> Open Service Link / Order Page
                  </a>
                </Button>
              </div>
            )}

            {/* Action Bar inside Dialog */}
            <div className="pt-4 border-t border-border/60 grid grid-cols-2 gap-3">
              <DirectServiceBookingDialog
                businessId={businessId}
                businessName={businessName}
                ownerUserId={ownerUserId}
                serviceTitle={title}
                servicePrice={price}
                serviceImageUrl={imageUrl}
                businessPhone={businessPhone}
                businessWhatsApp={businessWhatsApp}
                businessEmail={businessEmail}
                trigger={
                  <Button
                    size="lg"
                    className="w-full rounded-2xl font-black text-sm bg-primary text-primary-foreground shadow-md gap-2"
                  >
                    <Calendar className="h-4 w-4" />
                    Book Service Now
                  </Button>
                }
              />

              {businessId ? (
                <BusinessChatDialog
                  businessId={businessId}
                  businessName={businessName}
                  serviceTitle={title}
                  trigger={
                    <Button
                      size="lg"
                      variant="outline"
                      className="w-full rounded-2xl font-bold text-sm border-border/80 hover:bg-muted gap-2"
                    >
                      <MessageCircle className="h-4 w-4 text-primary" />
                      Chat with Provider
                    </Button>
                  }
                />
              ) : (
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => setDetailOpen(false)}
                  className="w-full rounded-2xl font-bold text-sm"
                >
                  Close
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
