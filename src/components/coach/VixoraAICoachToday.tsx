import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Sparkles,
  Mic,
  TrendingUp,
  Target,
  CheckCircle2,
  Calendar,
  RotateCcw,
  MessageSquare,
  ShieldCheck,
  Zap,
  ChevronRight,
  Award,
} from "lucide-react";
import { toast } from "sonner";
import { useFeatureFlags } from "@/contexts/FeatureFlagsContext";
import VixoraCoachLiveDialog from "@/components/coach/VixoraCoachLiveDialog";
import coachAvatarImg from "@/assets/images/ai_business_coach_1787551806148.jpg";

interface VixoraAICoachTodayProps {
  onAskQuestion?: (question: string) => void;
  className?: string;
  compact?: boolean;
}

const TODAY_INSIGHTS = [
  {
    title: "High-Margin Cashflow Protection",
    summary: "Always price in a 10-15% supplier logistics buffer into final advertised product totals to protect net margins against delivery surge.",
    action: "Recalculate your top 3 bestselling product margins today.",
    tag: "Margin Growth",
  },
  {
    title: "Direct WhatsApp Conversion Funnel",
    summary: "Respond to customer inquiries within 5 minutes with stock confirmation & payment links to achieve 3.4x higher closing rate.",
    action: "Send personalized follow-up messages to 5 previous inquiries.",
    tag: "Conversion",
  },
  {
    title: "Customer Retention & Referral Booster",
    summary: "Offering a 5% discount or referral perk on the next purchase turns one-time buyers into repeat brand advocates with zero ad spend.",
    action: "Share your referral link with existing happy customers.",
    tag: "Viral Growth",
  },
];

const DAILY_REVENUE_CHALLENGES = [
  { id: "c1", text: "Follow up with at least 5 warm inquiries on WhatsApp", points: "+150 XP" },
  { id: "c2", text: "Audit product pricing to maintain min 25% net profit", points: "+200 XP" },
  { id: "c3", text: "Publish or share 1 listing with high-converting details", points: "+150 XP" },
];

export default function VixoraAICoachToday({
  onAskQuestion,
  className = "",
}: VixoraAICoachTodayProps) {
  const navigate = useNavigate();
  const { flags } = useFeatureFlags();
  const [liveVoiceOpen, setLiveVoiceOpen] = useState(false);
  const [completedChallenges, setCompletedChallenges] = useState<string[]>(["c1"]);
  const [activeInsightIndex, setActiveInsightIndex] = useState(0);

  const todayFormatted = new Date().toLocaleDateString("en-NG", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  const curInsight = TODAY_INSIGHTS[activeInsightIndex];

  const handleToggleChallenge = (id: string) => {
    setCompletedChallenges((prev) => {
      const next = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      if (!prev.includes(id)) {
        toast.success("Goal completed! +XP added to your sprint.");
      }
      return next;
    });
  };

  const challengeProgress = Math.round((completedChallenges.length / DAILY_REVENUE_CHALLENGES.length) * 100);

  const handleExecuteStrategy = () => {
    const q = `How can I implement "${curInsight.title}" in my Nigerian business today?`;
    if (onAskQuestion) {
      onAskQuestion(q);
    } else {
      navigate(`/dashboard/coach?prompt=${encodeURIComponent(q)}`);
    }
    toast.info("Opening Coach Bethel Goodgift with today's action plan...");
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <Card className="border-purple-500/30 bg-gradient-to-br from-card via-purple-950/10 to-card shadow-lg rounded-2xl overflow-hidden relative">
        {/* Top Accent Ribbon */}
        <div className="h-1 w-full bg-gradient-to-r from-purple-600 via-pink-500 to-amber-500" />

        {/* Compact Header */}
        <div className="px-4 py-3.5 border-b border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              <img
                src={coachAvatarImg}
                alt="Coach Bethel Goodgift"
                className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl object-cover ring-2 ring-purple-500/40 shadow-md"
              />
              <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-background flex items-center justify-center">
                <span className="h-1 w-1 rounded-full bg-white animate-ping" />
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black tracking-tight text-foreground">
                  Coach Bethel Goodgift
                </h3>
                <Badge className="bg-purple-600/90 text-white text-[10px] font-extrabold uppercase px-1.5 py-0">
                  BTV AI
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                <span className="flex items-center gap-1"><Calendar className="h-3 w-3 text-purple-500" /> {todayFormatted}</span>
                <span>·</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3" /> Executive Business Coach
                </span>
              </p>
            </div>
          </div>

          <Button
            onClick={() => setLiveVoiceOpen(true)}
            size="sm"
            className="h-9 px-3 rounded-xl font-bold text-xs bg-gradient-to-r from-purple-600 via-pink-600 to-amber-600 hover:from-purple-500 hover:to-amber-500 text-white shadow-md gap-1.5 border-0 self-start sm:self-auto"
          >
            <Mic className="h-3.5 w-3.5" />
            <span>Voice Call Coach</span>
            <span className="text-[9px] bg-white/25 px-1 py-0.2 rounded font-mono font-bold">LIVE</span>
          </Button>
        </div>

        {/* Organized 2-Column Dashboard on larger screens */}
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {/* Column 1: Today's Strategic Tip */}
          <div className="p-3.5 rounded-xl bg-purple-500/5 border border-purple-500/20 flex flex-col justify-between space-y-2.5">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> Today's Growth Insight
                </span>
                <Badge variant="outline" className="text-[10px] font-semibold py-0">
                  {curInsight.tag}
                </Badge>
              </div>

              <h4 className="text-xs sm:text-sm font-bold text-foreground leading-snug">
                {curInsight.title}
              </h4>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {curInsight.summary}
              </p>
            </div>

            <div className="pt-2 border-t border-border/50 flex items-center justify-between gap-2">
              <span className="text-[10px] text-foreground font-semibold truncate">
                ⚡ Action: {curInsight.action}
              </span>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveInsightIndex((prev) => (prev + 1) % TODAY_INSIGHTS.length)}
                  className="h-6 text-[10px] px-1.5 text-muted-foreground"
                >
                  <RotateCcw className="h-2.5 w-2.5 mr-1" /> Next
                </Button>
                <Button
                  size="sm"
                  onClick={handleExecuteStrategy}
                  className="h-6 text-[10px] px-2 font-bold bg-purple-600 hover:bg-purple-700 text-white"
                >
                  Apply
                </Button>
              </div>
            </div>
          </div>

          {/* Column 2: Compact Revenue Sprint Tracker */}
          <div className="p-3.5 rounded-xl bg-card border border-border/80 flex flex-col justify-between space-y-2">
            <div>
              <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                <span className="flex items-center gap-1.5 text-foreground">
                  <TrendingUp className="h-3.5 w-3.5 text-purple-600" /> Revenue Sprint Tracker
                </span>
                <span className="text-purple-600 font-mono text-[11px]">{challengeProgress}% Done</span>
              </div>
              <Progress value={challengeProgress} className="h-1.5 rounded-full bg-muted" />
            </div>

            <div className="space-y-1.5 pt-1">
              {DAILY_REVENUE_CHALLENGES.map((ch) => {
                const isDone = completedChallenges.includes(ch.id);
                return (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => handleToggleChallenge(ch.id)}
                    className={`w-full p-2 rounded-lg border text-left text-xs transition-all flex items-center justify-between gap-2 ${
                      isDone
                        ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-900 dark:text-emerald-300"
                        : "bg-muted/30 hover:bg-muted/70 border-border/60 text-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={`h-4 w-4 rounded-md flex items-center justify-center shrink-0 ${
                          isDone ? "bg-emerald-600 text-white" : "border border-muted-foreground/40"
                        }`}
                      >
                        {isDone && <CheckCircle2 className="h-3 w-3" />}
                      </div>
                      <span className={`text-[11px] truncate ${isDone ? "line-through opacity-75" : "font-medium"}`}>
                        {ch.text}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-muted-foreground shrink-0">
                      {ch.points}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </CardContent>

        {/* Compact Footer Actions */}
        <div className="px-4 py-2 bg-muted/20 border-t border-border/60 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span>BTV AI Coach Engine Ready</span>
          </div>

          <Button
            asChild
            variant="ghost"
            size="sm"
            className="h-7 text-xs font-bold text-primary hover:text-primary gap-1"
          >
            <Link to="/dashboard/coach">
              Open Full Coach Console <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </Card>

      {/* Live Voice Coach Dialog */}
      <VixoraCoachLiveDialog
        open={liveVoiceOpen}
        onOpenChange={setLiveVoiceOpen}
        coachName="Coach Bethel Goodgift"
        businessContext={{
          stage: "active",
          focus: "Revenue sprint & commercial scaling",
        }}
      />
    </div>
  );
}
