import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles, ArrowRight, UserCheck, CheckCircle2, Shield,
  Cpu, Headphones, Megaphone, FileText, Store, MessageSquare,
  GraduationCap, BarChart3, CreditCard, ShieldCheck, Globe, Zap
} from "lucide-react";
import { DigitalEmployeeProfile, AgentStatus } from "@/lib/aiWorkforceRegistry";

interface AgentProfileCardProps {
  agent: DigitalEmployeeProfile;
  onViewProfile?: (agent: DigitalEmployeeProfile) => void;
  onDispatchDirective?: (agent: DigitalEmployeeProfile) => void;
  activeTasksCount?: number;
  compact?: boolean;
}

const ICON_MAP: Record<string, any> = {
  Cpu,
  Headphones,
  Megaphone,
  FileText,
  Store,
  MessageSquare,
  GraduationCap,
  BarChart3,
  CreditCard,
  ShieldCheck,
  Globe,
  Zap,
  Sparkles,
};

export default function AgentProfileCard({
  agent,
  onViewProfile,
  onDispatchDirective,
  activeTasksCount = 0,
  compact = false,
}: AgentProfileCardProps) {
  const IconComponent = ICON_MAP[agent.iconName] || Sparkles;

  const getStatusBadge = (status: AgentStatus) => {
    switch (status) {
      case "active":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Active
          </span>
        );
      case "available":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
            Available
          </span>
        );
      case "busy":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping" />
            Busy
          </span>
        );
      case "needs_attention":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-red-500/15 text-red-700 dark:text-red-300 border border-red-500/30">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
            Needs Attention
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-muted text-muted-foreground border border-border">
            Offline
          </span>
        );
    }
  };

  return (
    <Card className="rounded-2xl sm:rounded-3xl border-2 border-border/80 bg-card hover:border-primary/50 hover:shadow-lg transition-all duration-200 overflow-hidden flex flex-col justify-between group">
      <CardContent className="p-4 sm:p-5 space-y-3.5">
        {/* Top Header: Photo, Identification & Status */}
        <div className="flex items-start gap-3.5">
          {/* Real Employee Headshot Portrait with Online Ring */}
          <div className="relative shrink-0">
            <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-2xl overflow-hidden border-2 border-border/80 shadow-md bg-muted group-hover:scale-105 transition-transform duration-300">
              <img
                src={agent.profilePhotoUrl}
                alt={agent.name}
                className="h-full w-full object-cover object-center"
                onError={(e) => {
                  // Fallback to stylized gradient avatar if image fails
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
            </div>
            {/* Department Icon Chip */}
            <div
              className={`absolute -bottom-1 -right-1 h-6 w-6 rounded-lg bg-gradient-to-br ${agent.gradient} text-white flex items-center justify-center shadow-xs border border-background`}
              title={agent.department}
            >
              <IconComponent className="h-3 w-3" />
            </div>
          </div>

          {/* Name & Title */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-1 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-wider text-primary">
                {agent.department}
              </span>
              {getStatusBadge(agent.status)}
            </div>

            <h3 className="text-sm sm:text-base font-black text-foreground group-hover:text-primary transition-colors truncate">
              {agent.name}
            </h3>

            <p className="text-xs font-bold text-muted-foreground truncate">
              {agent.jobTitle}
            </p>

            <div className="mt-1 flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground">
              <Badge variant="outline" className="text-[9px] font-bold px-1.5 py-0 rounded-md border-border/60 bg-muted/40">
                {agent.isExecutive ? "Executive Lead" : "Digital Employee"}
              </Badge>
              {agent.isCustomRecruit && (
                <Badge className="text-[9px] font-bold px-1.5 py-0 rounded-md bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30">
                  Custom Recruited
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Role Summary */}
        <p className="text-xs text-foreground/90 font-medium leading-relaxed line-clamp-2 bg-muted/30 p-2.5 rounded-xl border border-border/50">
          {agent.role}
        </p>

        {/* Current Operational Focus */}
        <div className="space-y-1">
          <p className="text-[9px] font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <Sparkles className="h-2.5 w-2.5 text-primary" /> Current Focus
          </p>
          <p className="text-xs font-bold text-foreground line-clamp-1">
            {agent.currentFocus}
          </p>
        </div>

        {/* Top Capabilities Tags */}
        {!compact && (
          <div className="flex flex-wrap gap-1 pt-1">
            {agent.capabilities.slice(0, 3).map((cap, idx) => (
              <span
                key={idx}
                className="text-[9px] font-bold bg-secondary text-secondary-foreground px-2 py-0.5 rounded-md border border-border/40 truncate max-w-[170px]"
              >
                {cap}
              </span>
            ))}
            {agent.capabilities.length > 3 && (
              <span className="text-[9px] font-black text-muted-foreground px-1 py-0.5">
                +{agent.capabilities.length - 3} more
              </span>
            )}
          </div>
        )}

        {/* Card Footer: Action Buttons */}
        <div className="pt-3 border-t border-border/70 flex items-center justify-between gap-2">
          <div className="text-[10px] font-bold text-muted-foreground">
            <span className="font-black text-foreground">{activeTasksCount}</span> active task{activeTasksCount === 1 ? "" : "s"}
          </div>

          <div className="flex items-center gap-1.5">
            {onViewProfile && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onViewProfile(agent)}
                className="h-7 px-2.5 text-xs font-bold rounded-xl border-border/80 hover:bg-muted"
              >
                Profile
              </Button>
            )}

            {onDispatchDirective && (
              <Button
                size="sm"
                onClick={() => onDispatchDirective(agent)}
                className="h-7 px-3 text-xs font-black rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 gap-1 shadow-2xs"
              >
                <span>Dispatch</span>
                <ArrowRight className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
