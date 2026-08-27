import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Sparkles, CheckCircle2, Shield, ArrowRight, Wrench, Lock,
  FileText, Activity, Send, Check, Play, UserCheck, AlertCircle,
  Cpu, Headphones, Megaphone, Store, MessageSquare, GraduationCap,
  BarChart3, CreditCard, ShieldCheck, Globe, Zap
} from "lucide-react";
import { DigitalEmployeeProfile, AgentStatus, updateAgentProfile } from "@/lib/aiWorkforceRegistry";
import { toast } from "sonner";

interface AgentProfileModalProps {
  agent: DigitalEmployeeProfile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDispatchDirective?: (agentId: string, prompt: string) => void;
  onAgentUpdated?: (updated: DigitalEmployeeProfile) => void;
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

export default function AgentProfileModal({
  agent,
  open,
  onOpenChange,
  onDispatchDirective,
  onAgentUpdated,
}: AgentProfileModalProps) {
  const [directiveText, setDirectiveText] = useState("");
  const [activeTab, setActiveTab] = useState<"about" | "capabilities" | "permissions" | "dispatch">("about");

  if (!agent) return null;

  const IconComponent = ICON_MAP[agent.iconName] || Sparkles;

  const handleSendDirective = (e: React.FormEvent) => {
    e.preventDefault();
    if (!directiveText.trim()) {
      toast.error("Please enter a directive to assign to this digital employee.");
      return;
    }
    if (onDispatchDirective) {
      onDispatchDirective(agent.id, directiveText.trim());
    }
    setDirectiveText("");
    onOpenChange(false);
    toast.success(`Directive dispatched to ${agent.name} (${agent.jobTitle})`);
  };

  const handleStatusChange = (newStatus: AgentStatus) => {
    const updated = updateAgentProfile(agent.id, { status: newStatus });
    if (updated) {
      if (onAgentUpdated) onAgentUpdated(updated);
      toast.success(`${agent.name}'s status updated to ${newStatus}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 rounded-2xl sm:rounded-3xl border-2 border-border/80 shadow-2xl bg-card">
        {/* Top Hero Banner with Gradient & Employee Avatar */}
        <div className="relative p-5 sm:p-6 pb-4 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white border-b border-border/80">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {/* Real Headshot Photo */}
            <div className="relative shrink-0">
              <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl overflow-hidden border-2 border-white/30 shadow-xl bg-slate-800">
                <img
                  src={agent.profilePhotoUrl}
                  alt={agent.name}
                  className="h-full w-full object-cover object-center"
                />
              </div>
              <div
                className={`absolute -bottom-1 -right-1 h-7 w-7 rounded-xl bg-gradient-to-br ${agent.gradient} text-white flex items-center justify-center shadow-md border-2 border-slate-950`}
              >
                <IconComponent className="h-3.5 w-3.5" />
              </div>
            </div>

            {/* Employee Credentials */}
            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className="bg-primary/20 text-primary-foreground border-primary/40 text-[10px] font-black uppercase tracking-wider">
                  {agent.department}
                </Badge>
                <Badge variant="outline" className="text-[10px] font-bold text-white/80 border-white/20">
                  {agent.isExecutive ? "Executive Lead" : "Digital Employee"}
                </Badge>
              </div>

              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                {agent.name}
              </h2>

              <p className="text-xs sm:text-sm font-bold text-slate-300">
                {agent.jobTitle}
              </p>

              <p className="text-[11px] text-slate-400 font-medium pt-0.5">
                Reporting: <span className="text-white font-bold">{agent.executiveRelationship}</span>
              </p>
            </div>
          </div>

          {/* Quick Tab Switcher */}
          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/10 overflow-x-auto text-xs font-bold">
            <button
              onClick={() => setActiveTab("about")}
              className={`px-3 py-1.5 rounded-xl transition-colors shrink-0 ${
                activeTab === "about" ? "bg-white text-slate-950 font-black shadow-xs" : "text-white/70 hover:text-white hover:bg-white/10"
              }`}
            >
              Overview & Bio
            </button>
            <button
              onClick={() => setActiveTab("capabilities")}
              className={`px-3 py-1.5 rounded-xl transition-colors shrink-0 ${
                activeTab === "capabilities" ? "bg-white text-slate-950 font-black shadow-xs" : "text-white/70 hover:text-white hover:bg-white/10"
              }`}
            >
              Capabilities & Tools
            </button>
            <button
              onClick={() => setActiveTab("permissions")}
              className={`px-3 py-1.5 rounded-xl transition-colors shrink-0 ${
                activeTab === "permissions" ? "bg-white text-slate-950 font-black shadow-xs" : "text-white/70 hover:text-white hover:bg-white/10"
              }`}
            >
              Security & Permissions
            </button>
            <button
              onClick={() => setActiveTab("dispatch")}
              className={`px-3 py-1.5 rounded-xl transition-colors shrink-0 ${
                activeTab === "dispatch" ? "bg-primary text-primary-foreground font-black shadow-xs" : "text-primary-foreground/90 bg-primary/20 hover:bg-primary/30"
              }`}
            >
              Dispatch Directive
            </button>
          </div>
        </div>

        {/* Modal Body Content */}
        <div className="p-5 sm:p-6 space-y-4">
          {activeTab === "about" && (
            <div className="space-y-4">
              {/* Professional Biography */}
              <div className="p-4 rounded-2xl bg-muted/40 border border-border/80 space-y-1.5">
                <h4 className="text-xs font-black uppercase tracking-wider text-primary flex items-center gap-1.5">
                  <UserCheck className="h-3.5 w-3.5" /> Professional Biography
                </h4>
                <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed font-medium">
                  {agent.biography}
                </p>
              </div>

              {/* Core Role & Operational Focus */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-card border border-border/80 space-y-1">
                  <p className="text-[10px] font-extrabold uppercase text-muted-foreground">Primary Mission</p>
                  <p className="text-xs font-bold text-foreground leading-snug">{agent.role}</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-card border border-border/80 space-y-1">
                  <p className="text-[10px] font-extrabold uppercase text-muted-foreground">Current Operational Focus</p>
                  <p className="text-xs font-bold text-foreground leading-snug">{agent.currentFocus}</p>
                </div>
              </div>

              {/* Responsibilities */}
              <div className="space-y-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-foreground">
                  Key Responsibilities
                </h4>
                <div className="space-y-1.5">
                  {agent.responsibilities.map((resp, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-foreground/90 font-medium">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{resp}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Status Management */}
              <div className="pt-2 border-t border-border/70 flex items-center justify-between gap-3 flex-wrap">
                <div className="text-xs font-bold text-muted-foreground">
                  Operational Status: <span className="text-foreground font-black uppercase">{agent.status}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-muted-foreground">Set status:</span>
                  {(["active", "available", "busy", "offline"] as AgentStatus[]).map((st) => (
                    <Button
                      key={st}
                      variant={agent.status === st ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleStatusChange(st)}
                      className="h-6 px-2 text-[10px] font-extrabold rounded-lg capitalize"
                    >
                      {st}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "capabilities" && (
            <div className="space-y-4">
              {/* Technical Capabilities */}
              <div className="space-y-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-primary" /> Specialist AI Capabilities
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {agent.capabilities.map((cap, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-muted/40 border border-border/70 text-xs font-bold text-foreground flex items-center gap-2"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                      <span>{cap}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tools & Integrations */}
              <div className="space-y-2 pt-2 border-t border-border/60">
                <h4 className="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  <Wrench className="h-3.5 w-3.5 text-primary" /> Integrated Tools & Systems Accessed
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {agent.tools.map((tool, idx) => (
                    <Badge
                      key={idx}
                      variant="secondary"
                      className="text-xs font-bold px-2.5 py-1 rounded-xl border border-border/80"
                    >
                      {tool}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "permissions" && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-300 text-xs space-y-1">
                <p className="font-black flex items-center gap-1.5">
                  <Shield className="h-4 w-4 text-amber-600 dark:text-amber-400" /> Security & Boundary Enforcement
                </p>
                <p className="font-medium text-[11px] leading-relaxed">
                  Every AI specialist operates under strictly scoped least-privilege permissions. High-impact financial, compliance, or destructive operations always require Founder & CEO approval.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-primary" /> Granted System Permissions
                </h4>
                <div className="space-y-1.5">
                  {agent.permissions.map((perm, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-card border border-border/80 text-xs font-mono font-bold text-foreground flex items-center justify-between"
                    >
                      <span>{perm}</span>
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                        AUTHORIZED
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "dispatch" && (
            <form onSubmit={handleSendDirective} className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-black text-foreground flex items-center gap-1.5">
                  <Send className="h-3.5 w-3.5 text-primary" /> Assign Task Directive to {agent.name}
                </label>
                <Textarea
                  rows={3}
                  value={directiveText}
                  onChange={(e) => setDirectiveText(e.target.value)}
                  placeholder={`Describe the exact task or objective for ${agent.name} (${agent.jobTitle})...`}
                  className="font-medium text-xs sm:text-sm rounded-2xl p-3 bg-background border-border shadow-2xs resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenChange(false)}
                  className="h-8 font-bold text-xs rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="h-8 font-black text-xs rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5 shadow-xs"
                >
                  <Play className="h-3.5 w-3.5" /> Dispatch to {agent.name}
                </Button>
              </div>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
