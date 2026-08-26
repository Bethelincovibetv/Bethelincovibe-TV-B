import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Cpu, Headphones, Megaphone, FileText, Store, MessageSquare,
  GraduationCap, BarChart3, CreditCard, ShieldCheck, Globe, Zap,
  Sparkles, CheckCircle2, Play, Send, Plus, ArrowRight
} from "lucide-react";
import {
  SPECIALIZED_AI_AGENTS,
  SpecializedAgentDefinition,
  AgentTask,
  AgentId,
} from "@/lib/executiveAdminAIEngine";
import { toast } from "sonner";

interface AgentFleetMatrixTabProps {
  tasks: AgentTask[];
  onDispatchToAgent: (agentId: AgentId, directive: string) => void;
  onAuditFleet: () => void;
}

const AGENT_ICON_MAP: Record<string, any> = {
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
};

export default function AgentFleetMatrixTab({
  tasks,
  onDispatchToAgent,
  onAuditFleet,
}: AgentFleetMatrixTabProps) {
  const [selectedAgent, setSelectedAgent] = useState<SpecializedAgentDefinition | null>(null);
  const [quickPrompt, setQuickPrompt] = useState("");

  const handleQuickDispatch = (agentId: AgentId) => {
    if (!quickPrompt.trim()) {
      toast.error("Please enter a directive for the agent.");
      return;
    }
    onDispatchToAgent(agentId, quickPrompt.trim());
    setQuickPrompt("");
    setSelectedAgent(null);
    toast.success(`Directive dispatched to ${agentId}`);
  };

  return (
    <div className="space-y-4">
      {/* Fleet Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-muted/40 border border-border/80">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-black tracking-tight text-foreground">
              Specialized AI Agent Fleet (11 Coordinated Agents)
            </h2>
            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] font-bold">
              100% ONLINE
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground font-medium mt-0.5">
            Central Operating Hierarchy: Founder & CEO ↓ Executive Admin AI ↓ Specialized Agents.
          </p>
        </div>

        <Button
          onClick={onAuditFleet}
          size="sm"
          variant="outline"
          className="h-8 rounded-xl text-xs font-bold gap-1.5 border-primary/20 hover:bg-primary/10"
        >
          <Sparkles className="h-3.5 w-3.5 text-primary" /> Run Fleet Diagnostic Audit
        </Button>
      </div>

      {/* Agents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {SPECIALIZED_AI_AGENTS.map((agent) => {
          const Icon = AGENT_ICON_MAP[agent.iconName] || BotIconFallback;
          const agentTasks = tasks.filter((t) => t.assignedAgent === agent.id);
          const activeCount = agentTasks.filter((t) => t.status === "in_progress" || t.status === "pending").length;

          return (
            <Card
              key={agent.id}
              className="rounded-2xl border border-border/70 bg-card hover:border-primary/40 hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
            >
              <CardHeader className="p-4 pb-2 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`h-9 w-9 rounded-xl bg-gradient-to-br ${agent.gradient} text-white flex items-center justify-center shadow-xs shrink-0`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                        {agent.codename}
                      </p>
                      <h3 className="text-xs sm:text-sm font-black text-foreground truncate group-hover:text-primary transition-colors">
                        {agent.name}
                      </h3>
                    </div>
                  </div>

                  <span className="flex h-2 w-2 relative shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                </div>

                <p className="text-[11px] font-bold text-primary/90">{agent.role}</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                  {agent.description}
                </p>
              </CardHeader>

              <CardContent className="p-4 pt-2 space-y-3">
                {/* Current Focus */}
                <div className="p-2 rounded-xl bg-muted/30 border border-border/50 text-[11px] space-y-0.5">
                  <p className="text-[9px] font-extrabold uppercase text-muted-foreground">Current Operational Focus</p>
                  <p className="font-semibold text-foreground/90 line-clamp-2">{agent.currentFocus}</p>
                </div>

                {/* Capabilities Badges */}
                <div className="flex flex-wrap gap-1">
                  {agent.capabilities.slice(0, 3).map((cap, i) => (
                    <span
                      key={i}
                      className="text-[9px] font-semibold bg-secondary/80 text-secondary-foreground px-1.5 py-0.5 rounded-md border border-border/40"
                    >
                      {cap}
                    </span>
                  ))}
                  {agent.capabilities.length > 3 && (
                    <span className="text-[9px] font-bold text-muted-foreground px-1">
                      +{agent.capabilities.length - 3}
                    </span>
                  )}
                </div>

                {/* Footer Action */}
                <div className="pt-2 border-t border-border/60 flex items-center justify-between gap-2">
                  <div className="text-[10px] text-muted-foreground">
                    <span className="font-black text-foreground">{activeCount}</span> active task{activeCount === 1 ? "" : "s"}
                  </div>

                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setSelectedAgent(agent)}
                    className="h-7 px-2.5 rounded-xl text-xs font-bold gap-1 group-hover:bg-primary group-hover:text-white transition-colors"
                  >
                    <span>Dispatch</span>
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Dispatch Modal */}
      {selectedAgent && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-lg bg-card rounded-2xl border border-border shadow-2xl p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`h-8 w-8 rounded-xl bg-gradient-to-br ${selectedAgent.gradient} text-white flex items-center justify-center`}>
                  <Cpu className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-foreground">
                    Dispatch Directive to {selectedAgent.name}
                  </h3>
                  <p className="text-[11px] text-muted-foreground">{selectedAgent.role}</p>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedAgent(null)}
                className="h-7 w-7 p-0 rounded-full"
              >
                ✕
              </Button>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-bold text-foreground">Specify the directive or request:</p>
              <textarea
                value={quickPrompt}
                onChange={(e) => setQuickPrompt(e.target.value)}
                rows={3}
                placeholder={`e.g. ${selectedAgent.capabilities[0]} for our top Lagos SME merchants...`}
                className="w-full rounded-xl border border-input bg-background p-3 text-xs focus:ring-2 focus:ring-primary outline-hidden"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedAgent(null)}
                className="h-8 rounded-xl text-xs font-bold"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => handleQuickDispatch(selectedAgent.id)}
                className="h-8 rounded-xl text-xs font-black bg-primary text-primary-foreground gap-1.5"
              >
                <Send className="h-3 w-3" /> Dispatch Directive
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BotIconFallback(props: any) {
  return <Cpu {...props} />;
}
