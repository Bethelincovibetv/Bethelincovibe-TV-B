import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2, AlertCircle, Sparkles, User, MessageCircle, Building2,
  Rocket, ArrowRight, ShieldAlert, ChevronRight, Compass, Camera
} from "lucide-react";

interface ProfileCompletionCardProps {
  profile: any;
  businessCount?: number;
  onLaunchWizard: () => void;
}

export default function ProfileCompletionCard({
  profile,
  businessCount = 0,
  onLaunchWizard,
}: ProfileCompletionCardProps) {
  const analysis = useMemo(() => {
    const items = [
      {
        id: "displayName",
        label: "Display / Business Name",
        done: !!profile?.display_name?.trim(),
        weight: 15,
        fixUrl: "/dashboard/profile-edit",
        recommendation: "Set a clear display name so clients recognize your brand.",
      },
      {
        id: "username",
        label: "Public Username (@handle)",
        done: !!profile?.username?.trim(),
        weight: 15,
        fixUrl: "/dashboard/profile-edit",
        recommendation: "Choose a custom handle so your profile link (/u/handle) is easy to share.",
      },
      {
        id: "avatar",
        label: "Profile Photo / Logo",
        done: !!profile?.avatar_url,
        weight: 15,
        fixUrl: "/dashboard/profile-edit",
        recommendation: "Upload a logo or profile photo to increase trust and profile views by 3x.",
      },
      {
        id: "bio",
        label: "Bio / Professional Tagline",
        done: !!profile?.bio?.trim(),
        weight: 15,
        fixUrl: "/dashboard/profile-edit",
        recommendation: "Write a short summary describing your products, services, or expertise.",
      },
      {
        id: "whatsapp",
        label: "WhatsApp Contact",
        done: !!profile?.whatsapp?.trim(),
        weight: 15,
        fixUrl: "/dashboard/profile-edit",
        recommendation: "Add your WhatsApp number so customers can chat with you directly.",
      },
      {
        id: "offering",
        label: "Services or Business Listing",
        done: (Array.isArray(profile?.services) && profile.services.length > 0) || businessCount > 0,
        weight: 15,
        fixUrl: "/businesses/list",
        recommendation: "Add your services or list your business on the Lagos Directory to get buyer leads.",
      },
      {
        id: "socials",
        label: "Social Media Links",
        done: !!(profile?.social_links?.instagram || profile?.social_links?.twitter || profile?.social_links?.website || profile?.social_links?.facebook),
        weight: 10,
        fixUrl: "/dashboard/profile-edit",
        recommendation: "Link your Instagram or website to verify your business presence.",
      },
    ];

    const completedWeight = items.filter((i) => i.done).reduce((acc, i) => acc + i.weight, 0);
    const missing = items.filter((i) => !i.done);

    return {
      percentage: completedWeight,
      items,
      missing,
    };
  }, [profile, businessCount]);

  if (analysis.percentage >= 100) {
    return (
      <Card className="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-card border-emerald-500/30">
        <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-md">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-bold text-sm">Profile & Business Setup 100% Complete!</p>
                <Badge className="bg-emerald-600 text-white text-[10px]">Level 5 Verified</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Your public profile <code>/u/{profile?.username}</code> is fully optimized for Google & Lagos buyers.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button asChild size="sm" variant="outline" className="w-full sm:w-auto">
              <Link to={`/u/${profile?.username || "me"}`} target="_blank">View Public Profile →</Link>
            </Button>
            <Button size="sm" variant="ghost" onClick={onLaunchWizard} className="text-xs">
              Review Setup
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Recommendation engine picks the highest-impact missing item
  const topRecommendation = analysis.missing[0];

  return (
    <Card className="border-primary/30 shadow-md overflow-hidden bg-gradient-to-b from-card to-secondary/30">
      <CardHeader className="p-4 sm:p-5 pb-3 bg-gradient-to-r from-primary/10 via-purple-500/5 to-transparent border-b border-border/60">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-accent text-white flex items-center justify-center shadow-xs">
              <Compass className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                Setup Progress: {analysis.percentage}% Complete
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Complete your profile & business setup to unlock maximum platform reach.
              </p>
            </div>
          </div>

          <Button onClick={onLaunchWizard} size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold shrink-0 shadow-sm gap-1.5">
            <Sparkles className="h-4 w-4 text-amber-300" /> Launch Setup Wizard
          </Button>
        </div>

        <div className="mt-3 space-y-1">
          <Progress value={analysis.percentage} className="h-2.5 bg-secondary" />
          <div className="flex justify-between text-[11px] text-muted-foreground font-medium">
            <span>{analysis.items.filter((i) => i.done).length} of {analysis.items.length} steps complete</span>
            <span className="text-primary font-bold">+{100 - analysis.percentage}% boost remaining</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-5 space-y-4">
        {/* Automated System Recommendation Box */}
        {topRecommendation && (
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
            <div className="h-8 w-8 rounded-xl bg-amber-500 text-amber-950 flex items-center justify-center font-bold shrink-0 shadow-xs mt-0.5">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-extrabold text-amber-950 dark:text-amber-300 uppercase tracking-wide">
                System Recommendation
              </p>
              <p className="text-xs font-semibold text-foreground mt-0.5">
                {topRecommendation.recommendation}
              </p>
            </div>
            <Button asChild size="sm" variant="secondary" className="shrink-0 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-amber-950">
              <Link to={topRecommendation.fixUrl}>Fix Now <ChevronRight className="h-3.5 w-3.5 ml-0.5" /></Link>
            </Button>
          </div>
        )}

        {/* Checklist */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          {analysis.items.map((item) => (
            <div
              key={item.id}
              className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 transition ${
                item.done
                  ? "bg-secondary/40 border-border/60 text-muted-foreground"
                  : "bg-card border-primary/20 text-foreground font-medium shadow-2xs"
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                {item.done ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                )}
                <span className="truncate">{item.label}</span>
              </div>

              {item.done ? (
                <Badge variant="secondary" className="text-[10px] text-emerald-600 bg-emerald-500/10 border-0">
                  Done
                </Badge>
              ) : (
                <Link
                  to={item.fixUrl}
                  className="text-[11px] font-bold text-primary hover:underline shrink-0 flex items-center"
                >
                  Add <ArrowRight className="h-3 w-3 ml-0.5" />
                </Link>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
