import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Sparkles,
  Bot,
  Mic,
  Volume2,
  TrendingUp,
  Target,
  DollarSign,
  Lightbulb,
  CheckCircle2,
  ArrowRight,
  Zap,
  Calendar,
  Clock,
  Briefcase,
  Play,
  RotateCcw,
  MessageSquare,
  ShieldCheck,
  ShoppingBag,
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
    summary: "Always price in a supplier delivery buffer (10-15%) into final advertised product totals to protect net margins against logistics surge in Lagos.",
    action: "Recalculate your top 3 bestselling product margins today.",
    tag: "Margin Growth",
  },
  {
    title: "Direct WhatsApp Conversion Funnel",
    summary: "Respond to customer inquiries within 5 minutes with immediate stock availability and a clear payment link to achieve 3.4x higher closing rate.",
    action: "Send personalized follow-up messages to 5 previous inquiries.",
    tag: "High Conversion",
  },
  {
    title: "Customer Retention & Referral Booster",
    summary: "Offering a 5% discount or referral perk on the next purchase turns one-time shoppers into repeat brand advocates with zero ad spend.",
    action: "Share your referral link with existing happy customers.",
    tag: "Viral Growth",
  },
];

const DAILY_REVENUE_CHALLENGES = [
  { id: "c1", text: "Follow up with at least 5 warm inquiries or abandoned leads on WhatsApp.", points: "+150 XP" },
  { id: "c2", text: "Audit product pricing & inventory markup to maintain minimum 25% net profit.", points: "+200 XP" },
  { id: "c3", text: "Publish or update 1 marketplace listing with high-converting details.", points: "+150 XP" },
];

export default function VixoraAICoachToday({
  onAskQuestion,
  className = "",
  compact = false,
}: VixoraAICoachTodayProps) {
  const navigate = useNavigate();
  const { flags } = useFeatureFlags();
  const [liveVoiceOpen, setLiveVoiceOpen] = useState(false);
  const [completedChallenges, setCompletedChallenges] = useState<string[]>([]);
  const [activeInsightIndex, setActiveInsightIndex] = useState(0);

  // Today formatted
  const todayFormatted = new Date().toLocaleDateString("en-NG", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const curInsight = TODAY_INSIGHTS[activeInsightIndex];

  const handleToggleChallenge = (id: string) => {
    setCompletedChallenges((prev) => {
      const next = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      if (!prev.includes(id)) {
        toast.success("Daily business goal achieved! Great momentum.");
      }
      return next;
    });
  };

  const challengeProgress = Math.round((completedChallenges.length / DAILY_REVENUE_CHALLENGES.length) * 100);

  const handleExecuteStrategy = () => {
    if (onAskQuestion) {
      onAskQuestion(`How can I implement "${curInsight.title}" in my Nigerian business today?`);
    } else {
      navigate(`/dashboard/coach?prompt=${encodeURIComponent(`How can I implement "${curInsight.title}" in my Nigerian business today?`)}`);
    }
    toast.info("Opening Vixora Coach with today's action plan...");
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <Card className="border-purple-500/40 bg-gradient-to-br from-card via-purple-950/10 to-card shadow-xl overflow-hidden relative">
        {/* Top Accent Line */}
        <div className="h-1.5 w-full bg-gradient-to-r from-purple-600 via-pink-500 to-amber-500" />

        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="relative">
                <img
                  src={coachAvatarImg}
                  alt="Vixora AI Coach Adaobi"
                  className="h-12 w-12 rounded-2xl object-cover ring-2 ring-purple-500/40 shadow-lg shadow-purple-500/20"
                />
                <span className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-emerald-500 border-2 border-background flex items-center justify-center">
                  <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping" />
                </span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg sm:text-xl font-black tracking-tight text-foreground flex items-center gap-1.5">
                    Vixora AI Business Coach
                  </CardTitle>
                  <Badge className="bg-purple-600 text-white text-[10px] font-extrabold uppercase tracking-wide">
                    Live Today
                  </Badge>
                </div>
                <CardDescription className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-purple-500" /> {todayFormatted}
                  </span>
                  <span>·</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3" /> Coach Adaobi & Executive AI
                  </span>
                </CardDescription>
              </div>
            </div>

            {/* Quick Live Voice Launch Button */}
            <Button
              onClick={() => setLiveVoiceOpen(true)}
              className="h-10 px-4 rounded-xl font-extrabold text-xs sm:text-sm bg-gradient-to-r from-purple-600 via-pink-600 to-amber-600 hover:from-purple-500 hover:to-amber-500 text-white shadow-lg shadow-purple-600/25 gap-2 shrink-0 border-0"
            >
              <Mic className="h-4 w-4" />
              <span>Talk with Vixora AI Coach</span>
              <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-md font-mono">Live</span>
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 pt-1">
          {/* Section 1: Today's Strategic Growth Insight & Hook */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-500/10 via-background to-secondary/60 border border-purple-500/20 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-purple-600 text-white shadow-xs">
                  <Sparkles className="h-3.5 w-3.5" />
                </div>
                <span className="text-xs font-bold text-foreground">Today's Strategic Growth Advisor</span>
              </div>
              <Badge variant="outline" className="text-[10px] font-bold text-purple-600 dark:text-purple-400 border-purple-500/30">
                {curInsight.tag}
              </Badge>
            </div>

            <div>
              <h4 className="text-sm font-extrabold text-foreground mb-1">
                {curInsight.title}
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {curInsight.summary}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-border/60">
              <div className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
                <Target className="h-3.5 w-3.5 text-emerald-500" />
                <span>Today's Action: {curInsight.action}</span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveInsightIndex((prev) => (prev + 1) % TODAY_INSIGHTS.length)}
                  className="h-7 text-[11px] px-2 text-muted-foreground hover:text-foreground"
                >
                  <RotateCcw className="h-3 w-3 mr-1" /> Next Tip
                </Button>

                <Button
                  size="sm"
                  onClick={handleExecuteStrategy}
                  className="h-7 text-[11px] px-2.5 font-bold bg-purple-600 hover:bg-purple-700 text-white gap-1 shadow-xs"
                >
                  <MessageSquare className="h-3 w-3" /> Apply Strategy
                </Button>
              </div>
            </div>
          </div>

          {/* Section 2: Daily Revenue Sprint & Execution Meter */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="flex items-center gap-1.5 text-foreground">
                <TrendingUp className="h-3.5 w-3.5 text-purple-600" /> Daily Revenue Sprint Tracker
              </span>
              <span className="text-purple-600 font-mono">{challengeProgress}% Completed</span>
            </div>
            <Progress value={challengeProgress} className="h-2 rounded-full bg-secondary" />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
              {DAILY_REVENUE_CHALLENGES.map((ch) => {
                const isDone = completedChallenges.includes(ch.id);
                return (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => handleToggleChallenge(ch.id)}
                    className={`p-2.5 rounded-xl border text-left text-xs transition-all flex flex-col justify-between gap-1.5 ${
                      isDone
                        ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-900 dark:text-emerald-300"
                        : "bg-card hover:bg-secondary/70 border-border/70 text-foreground"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <span className={`text-[11px] leading-snug ${isDone ? "line-through opacity-80" : "font-medium"}`}>
                        {ch.text}
                      </span>
                      <div
                        className={`h-4 w-4 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${
                          isDone ? "bg-emerald-600 text-white" : "border border-muted-foreground/40"
                        }`}
                      >
                        {isDone && <CheckCircle2 className="h-3.5 w-3.5" />}
                      </div>
                    </div>
                    <span className="text-[10px] font-mono font-bold opacity-75 self-end">
                      {ch.points}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 3: Quick Strategic Consult Prompts */}
          <div className="pt-2 border-t space-y-2">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Lightbulb className="h-3 w-3 text-amber-500" /> Ask Vixora Coach Today:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {[
                "Calculate optimal markup for my goods",
                "How do I close WhatsApp sales faster?",
                "Give me 3 marketing strategies for this week",
                "How can I cut logistics cost in Nigeria?",
              ].map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => {
                    if (onAskQuestion) {
                      onAskQuestion(prompt);
                    } else {
                      navigate(`/dashboard/coach?prompt=${encodeURIComponent(prompt)}`);
                    }
                    toast.info(`Sent "${prompt}" to Vixora Coach`);
                  }}
                  className="text-[11px] px-2.5 py-1 rounded-full bg-secondary/80 hover:bg-purple-500/10 hover:text-purple-600 border border-border/70 transition-colors text-left"
                >
                  💬 {prompt}
                </button>
              ))}
            </div>
          </div>
        </CardContent>

        <CardFooter className="pt-3 border-t bg-secondary/20 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 text-xs">
          <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
            Vixora Neural Multi-Agent Intelligence Engine Active
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Button
              variant="outline"
              size="sm"
              asChild
              className="h-8 text-xs font-bold"
            >
              <Link to="/dashboard/coach">
                <MessageSquare className="h-3.5 w-3.5 mr-1" /> Open Coach Console
              </Link>
            </Button>
            <Button
              size="sm"
              asChild
              className="h-8 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white"
            >
              <Link to="/dashboard/submit-blog">
                <Sparkles className="h-3.5 w-3.5 mr-1" /> Boost My Business
              </Link>
            </Button>
          </div>
        </CardFooter>
      </Card>

      {/* Live Voice Coach Dialog */}
      <VixoraCoachLiveDialog
        open={liveVoiceOpen}
        onOpenChange={setLiveVoiceOpen}
        coachName="Coach Adaobi"
        businessContext={{
          stage: "active",
          focus: "Revenue sprint & commercial scaling",
        }}
      />
    </div>
  );
}
