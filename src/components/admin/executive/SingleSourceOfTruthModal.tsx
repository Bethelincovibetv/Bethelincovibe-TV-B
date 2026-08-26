import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen, Compass, GraduationCap, Megaphone, Users, ShoppingCart,
  TrendingUp, ShieldCheck, Cpu, UserCheck, CheckCircle2
} from "lucide-react";
import { PLATFORM_SSOT, SPECIALIZED_AI_AGENTS } from "@/lib/executiveAdminAIEngine";

interface SingleSourceOfTruthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PILLAR_ICON_MAP: Record<string, any> = {
  Compass,
  GraduationCap,
  Megaphone,
  Users,
  ShoppingCart,
  TrendingUp,
};

export default function SingleSourceOfTruthModal({
  open,
  onOpenChange,
}: SingleSourceOfTruthModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 rounded-2xl">
        <DialogHeader className="border-b pb-3">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-xs">
              <BookOpen className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-black text-foreground">
                Single Source of Truth (SSOT) Knowledge Repository
              </DialogTitle>
              <p className="text-xs text-muted-foreground font-medium">
                Authoritative platform identity, mission, journey pillars, and governance rules.
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-1 text-xs">
          {/* Executive Company Identity */}
          <div className="p-3.5 rounded-2xl bg-muted/40 border space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-primary">Company & Founder</span>
              <Badge variant="outline" className="text-[10px] font-bold">
                Founder & CEO: {PLATFORM_SSOT.company.founderAndCeo}
              </Badge>
            </div>
            <h3 className="text-sm font-black text-foreground">{PLATFORM_SSOT.company.name}</h3>
            <p className="text-muted-foreground leading-relaxed">
              <strong className="text-foreground">Positioning: </strong>
              {PLATFORM_SSOT.company.positioning}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <div className="p-2.5 rounded-xl bg-card border space-y-0.5">
                <p className="text-[9px] font-extrabold uppercase text-purple-600 dark:text-purple-400">Mission</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{PLATFORM_SSOT.company.mission}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-card border space-y-0.5">
                <p className="text-[9px] font-extrabold uppercase text-blue-600 dark:text-blue-400">Vision</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{PLATFORM_SSOT.company.vision}</p>
              </div>
            </div>
          </div>

          {/* 6 Core Journey Pillars */}
          <div className="space-y-2">
            <h4 className="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-1.5">
              <Compass className="h-3.5 w-3.5 text-primary" /> The 6 Core Business Growth Journey Pillars
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {PLATFORM_SSOT.journeyPillars.map((p, idx) => {
                const Icon = PILLAR_ICON_MAP[p.iconName] || Compass;
                return (
                  <div key={p.code} className="p-3 rounded-xl border bg-card space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <span className="font-black text-xs text-foreground">
                        {idx + 1}. {p.label}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{p.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Operating Hierarchy & Governance */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 rounded-2xl bg-muted/30 border space-y-1.5">
              <div className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400 font-bold">
                <Cpu className="h-3.5 w-3.5" />
                <span className="text-[10px] uppercase font-black tracking-wider">Operating Hierarchy</span>
              </div>
              <p className="text-[11px] font-mono font-bold text-foreground/90 p-2 rounded-xl bg-card border leading-relaxed">
                {PLATFORM_SSOT.hierarchy}
              </p>
              <p className="text-[10px] text-muted-foreground">
                All 11 specialized agents report to Executive Admin AI, which coordinates execution and advises the Founder & CEO.
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-muted/30 border space-y-1.5">
              <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-bold">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span className="text-[10px] uppercase font-black tracking-wider">Founder Governance & Safe Gates</span>
              </div>
              <ul className="space-y-1">
                {PLATFORM_SSOT.governance.founderApprovalRequired.map((rule, idx) => (
                  <li key={idx} className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                    <CheckCircle2 className="h-3 w-3 text-rose-500 shrink-0 mt-0.5" />
                    <span>{rule}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
