import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Activity, ArrowUpRight, CheckCircle2, AlertTriangle, ShieldCheck,
  TrendingUp, Users, Building2, FileText, ShoppingCart, GraduationCap,
  Megaphone, Compass, Sparkles, MessageSquare, Bot, Play, Check, ChevronRight
} from "lucide-react";
import { DailyBriefing, PlatformAlert, AgentTask, TaskPriority, generateExecutiveDailyBriefing } from "@/lib/executiveAdminAIEngine";

interface ExecutiveOverviewTabProps {
  briefing?: DailyBriefing;
  stats?: any;
  alerts?: PlatformAlert[];
  tasks?: AgentTask[];
  onOpenBriefing?: () => void;
  onOpenDailyBriefing?: () => void;
  onOpenInvestigation?: () => void;
  onOpenSSOT?: () => void;
  onApproveDecision?: (decisionId: string | any, actionType?: string) => void;
  onResolveAlert?: (alertId: string) => void;
  onSelectAgent?: (agentId: string) => void;
  onNavigateToTab?: (tab: "overview" | "console" | "fleet" | "tasks") => void;
}

export default function ExecutiveOverviewTab({
  briefing,
  stats,
  alerts = [],
  tasks = [],
  onOpenBriefing,
  onOpenDailyBriefing,
  onOpenInvestigation,
  onOpenSSOT,
  onApproveDecision,
  onResolveAlert,
  onSelectAgent,
  onNavigateToTab,
}: ExecutiveOverviewTabProps) {
  const currentBriefing = briefing || generateExecutiveDailyBriefing(stats, tasks, alerts);
  const activeAlerts = alerts.filter((a) => a.status === "active");

  const handleOpenBriefing = onOpenDailyBriefing || onOpenBriefing || (() => {});

  const getPriorityBadge = (p: TaskPriority) => {
    switch (p) {
      case "P0":
        return <Badge className="bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/30 font-black text-[10px]">P0 CRITICAL</Badge>;
      case "P1":
        return <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/30 font-black text-[10px]">P1 HIGH</Badge>;
      case "P2":
        return <Badge className="bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/30 font-bold text-[10px]">P2 MEDIUM</Badge>;
      default:
        return <Badge className="bg-slate-500/20 text-slate-700 dark:text-slate-400 border-slate-500/30 font-medium text-[10px]">P3 LOW</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. Top Executive Health Score & Strategic Action Bar */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-950 via-indigo-950 to-purple-950 p-4 sm:p-6 text-white border border-purple-500/30 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-black">
              <Sparkles className="h-3.5 w-3.5 text-purple-400" />
              Central Operating Intelligence
            </div>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-white flex items-center gap-2.5">
              Bethelincovibe TV Executive Command Center
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 font-medium">
              Ecosystem Mission: <span className="text-white font-bold">Discover → Learn → Promote → Connect → Sell → Grow</span>
            </p>
          </div>

          <div className="flex flex-row md:flex-col items-center md:items-end gap-3 shrink-0 w-full md:w-auto justify-between md:justify-end">
            <div className="text-left md:text-right">
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Ecosystem Health</p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-4xl font-black text-emerald-400">{currentBriefing.platformHealthScore}%</span>
                <span className="text-xs text-emerald-300 font-bold">Optimal</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={handleOpenBriefing}
                size="sm"
                className="h-8 sm:h-9 px-3 rounded-xl font-black text-xs bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-md gap-1.5"
              >
                <Play className="h-3 w-3" /> Daily Briefing
              </Button>
              {onOpenInvestigation && (
                <Button
                  onClick={onOpenInvestigation}
                  size="sm"
                  variant="outline"
                  className="h-8 sm:h-9 px-3 rounded-xl font-bold text-xs border-purple-400/40 text-purple-200 hover:bg-purple-500/20 gap-1.5"
                >
                  <Bot className="h-3 w-3" /> Investigate
                </Button>
              )}
              {onOpenSSOT && (
                <Button
                  onClick={onOpenSSOT}
                  size="sm"
                  variant="ghost"
                  className="h-8 sm:h-9 px-2.5 rounded-xl font-bold text-xs text-slate-300 hover:bg-white/10 hover:text-white"
                  title="Single Source of Truth Knowledge Base"
                >
                  SSOT
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Core Platform Journey Funnel Metrics (6 Pillars) */}
      <div>
        <div className="flex items-center justify-between px-1 mb-2">
          <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <TrendingUp className="h-4 w-4 text-primary" /> Core Business Journey Funnel
          </h3>
          <span className="text-[11px] font-bold text-muted-foreground">Live Telemetry</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
          {/* DISCOVER */}
          <Card className="p-3 rounded-2xl border border-border/70 bg-gradient-to-br from-blue-500/10 via-background to-background hover:border-blue-500/40 transition-all">
            <div className="flex items-center justify-between">
              <div className="h-7 w-7 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Compass className="h-4 w-4" />
              </div>
              <span className="text-[10px] font-black text-blue-600 dark:text-blue-400">1. DISCOVER</span>
            </div>
            <p className="text-xl sm:text-2xl font-black text-foreground mt-2">{stats?.businesses || 0}</p>
            <p className="text-[11px] font-medium text-muted-foreground">Verified Listings</p>
          </Card>

          {/* LEARN */}
          <Card className="p-3 rounded-2xl border border-border/70 bg-gradient-to-br from-purple-500/10 via-background to-background hover:border-purple-500/40 transition-all">
            <div className="flex items-center justify-between">
              <div className="h-7 w-7 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <GraduationCap className="h-4 w-4" />
              </div>
              <span className="text-[10px] font-black text-purple-600 dark:text-purple-400">2. LEARN</span>
            </div>
            <p className="text-xl sm:text-2xl font-black text-foreground mt-2">{stats?.posts || 0}</p>
            <p className="text-[11px] font-medium text-muted-foreground">Guides & Masterclasses</p>
          </Card>

          {/* PROMOTE */}
          <Card className="p-3 rounded-2xl border border-border/70 bg-gradient-to-br from-rose-500/10 via-background to-background hover:border-rose-500/40 transition-all">
            <div className="flex items-center justify-between">
              <div className="h-7 w-7 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                <Megaphone className="h-4 w-4" />
              </div>
              <span className="text-[10px] font-black text-rose-600 dark:text-rose-400">3. PROMOTE</span>
            </div>
            <p className="text-xl sm:text-2xl font-black text-foreground mt-2">{stats?.globalAds ? "Active" : "Paused"}</p>
            <p className="text-[11px] font-medium text-muted-foreground">Ad Network & Banners</p>
          </Card>

          {/* CONNECT */}
          <Card className="p-3 rounded-2xl border border-border/70 bg-gradient-to-br from-emerald-500/10 via-background to-background hover:border-emerald-500/40 transition-all">
            <div className="flex items-center justify-between">
              <div className="h-7 w-7 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Users className="h-4 w-4" />
              </div>
              <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400">4. CONNECT</span>
            </div>
            <p className="text-xl sm:text-2xl font-black text-foreground mt-2">{stats?.users || 0}</p>
            <p className="text-[11px] font-medium text-muted-foreground">Network Members</p>
          </Card>

          {/* SELL */}
          <Card className="p-3 rounded-2xl border border-border/70 bg-gradient-to-br from-amber-500/10 via-background to-background hover:border-amber-500/40 transition-all">
            <div className="flex items-center justify-between">
              <div className="h-7 w-7 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <ShoppingCart className="h-4 w-4" />
              </div>
              <span className="text-[10px] font-black text-amber-600 dark:text-amber-400">5. SELL</span>
            </div>
            <p className="text-xl sm:text-2xl font-black text-foreground mt-2">{stats?.salesPages || 0}</p>
            <p className="text-[11px] font-medium text-muted-foreground">Sales Funnel Pages</p>
          </Card>

          {/* GROW */}
          <Card className="p-3 rounded-2xl border border-border/70 bg-gradient-to-br from-indigo-500/10 via-background to-background hover:border-indigo-500/40 transition-all">
            <div className="flex items-center justify-between">
              <div className="h-7 w-7 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <TrendingUp className="h-4 w-4" />
              </div>
              <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400">6. GROW</span>
            </div>
            <p className="text-xl sm:text-2xl font-black text-foreground mt-2">24/7 AI</p>
            <p className="text-[11px] font-medium text-muted-foreground">Business Coaching</p>
          </Card>
        </div>
      </div>

      {/* 3. Founder Decisions Required & Proactive Alerts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Founder Decisions */}
        <Card className="rounded-2xl border border-border/80 shadow-xs">
          <CardHeader className="py-3 px-4 border-b bg-muted/20 flex flex-row items-center justify-between">
            <CardTitle className="text-xs sm:text-sm font-black flex items-center gap-2 text-foreground">
              <ShieldCheck className="h-4 w-4 text-purple-600" />
              Founder & CEO Decisions Required
            </CardTitle>
            <Badge variant="outline" className="text-[10px] font-bold">
              {(currentBriefing.founderDecisionsRequired || []).length} Pending
            </Badge>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 space-y-2.5">
            {(currentBriefing.founderDecisionsRequired || []).length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-xs font-bold text-foreground">All founder approvals up to date</p>
                <p className="text-[11px]">No high-impact administrative blockers currently pending.</p>
              </div>
            ) : (
              (currentBriefing.founderDecisionsRequired || []).map((dec) => (
                <div
                  key={dec.id}
                  className="p-3 rounded-xl border border-border/70 bg-card hover:bg-secondary/40 transition-colors flex items-center justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {getPriorityBadge(dec.priority)}
                      <p className="text-xs font-black text-foreground truncate">{dec.title}</p>
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-1">{dec.impact}</p>
                  </div>

                  {onApproveDecision && (
                    <Button
                      size="sm"
                      onClick={() => onApproveDecision(dec.id, dec.id === "dec_01" ? "approve_businesses" : "multi_blog_campaign")}
                      className="h-8 px-3 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 gap-1"
                    >
                      <Check className="h-3 w-3" /> Approve
                    </Button>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Proactive Platform Alerts */}
        <Card className="rounded-2xl border border-border/80 shadow-xs">
          <CardHeader className="py-3 px-4 border-b bg-muted/20 flex flex-row items-center justify-between">
            <CardTitle className="text-xs sm:text-sm font-black flex items-center gap-2 text-foreground">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Proactive Platform Intelligence Alerts
            </CardTitle>
            <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[10px] font-bold">
              {activeAlerts.length} Active
            </Badge>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 space-y-2.5">
            {activeAlerts.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-xs font-bold text-foreground">Zero anomalies detected</p>
                <p className="text-[11px]">All platform telemetry, security, and conversion funnels are within optimal thresholds.</p>
              </div>
            ) : (
              activeAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="p-3 rounded-xl border border-border/70 bg-card hover:bg-secondary/40 transition-colors space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {getPriorityBadge(alert.priority)}
                      <p className="text-xs font-black text-foreground">{alert.title}</p>
                    </div>
                    {onResolveAlert && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onResolveAlert(alert.id)}
                        className="h-6 px-2 text-[10px] font-bold text-muted-foreground hover:text-foreground"
                      >
                        Dismiss
                      </Button>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    <span className="font-semibold text-foreground/90">What Happened: </span>
                    {alert.whatHappened}
                  </p>
                  <div className="flex items-center justify-between pt-1 text-[10px] text-muted-foreground border-t border-border/40">
                    <span className="font-semibold text-purple-600 dark:text-purple-400">
                      Assigned Agent: {alert.assignedAgent}
                    </span>
                    <span>{new Date(alert.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
