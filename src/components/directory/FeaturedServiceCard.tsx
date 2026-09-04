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
  Play,
  Video,
  Layers,
} from "lucide-react";
import DirectServiceBookingDialog from "./DirectServiceBookingDialog";
import BusinessChatDialog from "@/components/BusinessChatDialog";
import { extractYouTubeId, getYouTubeEmbedUrl } from "@/services/serviceManagementService";
import { toast } from "sonner";

export interface ServicePortfolioSample {
  id?: string;
  title: string;
  image_url?: string;
  description?: string;
  link_url?: string;
}

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
  youtube_video_url?: string;
  samples?: ServicePortfolioSample[];
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
  const [activeSample, setActiveSample] = useState<ServicePortfolioSample | null>(null);

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
  const duration = service?.duration;
  const category = service?.category;
  const youtubeUrl = service?.youtube_video_url;
  const hasVideo = !!extractYouTubeId(youtubeUrl);
  const embedVideoUrl = hasVideo ? getYouTubeEmbedUrl(youtubeUrl!) : null;
  const samples = Array.isArray(service?.samples) ? service.samples : [];

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
        onClick={() => setDetailOpen(true)}
        className={`group cursor-pointer rounded-2xl border border-border/80 bg-card overflow-hidden transition-all duration-300 hover:border-primary/50 hover:shadow-xl flex flex-col justify-between ${className}`}
      >
        {/* Cover / Media Thumbnail Section */}
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-muted">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={title}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/30 p-4 text-center">
              <Briefcase className="h-10 w-10 text-primary/40 mb-2" />
              <span className="text-xs font-bold text-muted-foreground">
                {businessName}
              </span>
            </div>
          )}

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

          {/* Top Badges */}
          <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-1">
            <Badge className="bg-black/60 backdrop-blur-md text-white border-0 text-[10px] font-bold px-2 py-0.5">
              {category || "Verified Service"}
            </Badge>

            <div className="flex items-center gap-1">
              {hasVideo && (
                <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-black flex items-center gap-1 shadow-sm">
                  <Play className="w-2.5 h-2.5 fill-white" /> Video
                </span>
              )}
              {samples.length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-purple-600 text-white text-[10px] font-black flex items-center gap-1 shadow-sm">
                  <Layers className="w-2.5 h-2.5" /> {samples.length} Samples
                </span>
              )}
              <button
                onClick={handleShare}
                className="h-7 w-7 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-white/80 hover:text-white hover:bg-black/80 transition-all"
                title="Share service"
              >
                <Share2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Bottom Title & Price Overlay */}
          <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-end justify-between gap-2">
            <div className="min-w-0 flex-1">
              {duration && (
                <span className="text-[10px] font-semibold text-white/90 flex items-center gap-1 mb-0.5 drop-shadow-sm">
                  <Clock className="h-3 w-3" /> {duration}
                </span>
              )}
            </div>
            {price && (
              <Badge className="bg-primary text-primary-foreground text-xs font-black px-2.5 py-1 rounded-xl shadow-md border border-white/20 shrink-0">
                {price}
              </Badge>
            )}
          </div>
        </div>

        {/* Card Body */}
        <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
          <div className="space-y-2">
            <div className="flex items-center gap-1 text-xs text-muted-foreground font-semibold">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              <span className="truncate">{businessName}</span>
            </div>

            <h3 className="font-extrabold text-sm sm:text-base text-foreground line-clamp-1 group-hover:text-primary transition-colors">
              {title}
            </h3>

            {desc && (
              <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                {desc}
              </p>
            )}

            {/* Key Deliverables Chips */}
            {benefits.length > 0 && (
              <div className="space-y-1 pt-1">
                <div className="grid grid-cols-1 gap-1">
                  {benefits.slice(0, 2).map((b: string, i: number) => (
                    <div
                      key={i}
                      className="flex items-center gap-1.5 text-[11px] text-muted-foreground"
                    >
                      <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
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
          <div
            className="pt-3 border-t border-border/60 grid grid-cols-2 gap-2 mt-auto"
            onClick={(e) => e.stopPropagation()}
          >
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
        <DialogContent className="sm:max-w-2xl rounded-3xl p-0 overflow-hidden bg-card border-border/80 shadow-2xl max-h-[90vh] flex flex-col">
          {/* Header image or video player */}
          {hasVideo && embedVideoUrl ? (
            <div className="aspect-[16/9] w-full bg-black relative">
              <iframe
                src={embedVideoUrl}
                title={`Video for ${title}`}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : imageUrl ? (
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
          ) : null}

          <div className="p-6 space-y-4 overflow-y-auto flex-1">
            <DialogHeader className="text-left space-y-1.5 pb-2 border-b">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-xs font-bold">
                  <ShieldCheck className="h-3 w-3 mr-1" /> Verified Service Solution
                </Badge>
                {businessName && (
                  <Badge variant="outline" className="text-xs font-semibold">
                    {businessName}
                  </Badge>
                )}
                {duration && (
                  <Badge variant="outline" className="text-xs font-semibold text-muted-foreground">
                    <Clock className="w-3 h-3 mr-1" /> {duration}
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

            {/* Portfolio Samples & Case Studies Gallery */}
            {samples.length > 0 && (
              <div className="space-y-2.5 p-4 rounded-2xl bg-card border border-border/80">
                <h4 className="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-purple-600" /> Past Work Samples & Case Studies:
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {samples.map((sample, sIdx) => (
                    <div
                      key={sample.id || sIdx}
                      className="p-2.5 rounded-xl border border-border/70 bg-muted/30 flex items-start gap-2.5"
                    >
                      {sample.image_url && (
                        <img
                          src={sample.image_url}
                          alt={sample.title}
                          className="w-12 h-12 rounded-lg object-cover shrink-0 border border-border/60"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="font-extrabold text-xs text-foreground truncate">{sample.title}</div>
                        {sample.description && (
                          <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
                            {sample.description}
                          </p>
                        )}
                        {sample.link_url && (
                          <a
                            href={sample.link_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-primary hover:underline flex items-center gap-1 mt-1 font-bold"
                          >
                            Live Project <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                      </div>
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
                      className="w-full rounded-2xl font-bold text-sm border-border/80 hover:bg-muted gap-2 text-foreground"
                    >
                      <MessageCircle className="h-4 w-4 text-primary" />
                      Chat / Inquire
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
