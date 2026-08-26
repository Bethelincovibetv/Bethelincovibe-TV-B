import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Bot, Sparkles, Loader2, ArrowRight, CheckCircle2, TrendingUp,
  AlertTriangle, ShieldCheck, Send, Check
} from "lucide-react";
import {
  coordinateExecutiveInvestigation,
  InvestigationResult,
  SPECIALIZED_AI_AGENTS,
  AgentTask,
  TaskPriority,
} from "@/lib/executiveAdminAIEngine";
import { toast } from "sonner";

interface InvestigationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stats?: any;
  onCreateTask?: (task: any) => void;
  onDispatchDirective?: (agentId: any, directive: string) => void;
}

const SAMPLE_QUESTIONS = [
  "Why is merchant registration volume pacing and how can we scale it?",
  "Evaluate our wholesale sourcing content and conversion to WhatsApp inquiries",
  "Audit platform security and rate limiting integrity across directory endpoints",
  "How can we maximize Learning Hub student course completions and certificates?",
];

export default function InvestigationModal({
  open,
  onOpenChange,
  stats,
  onCreateTask,
  onDispatchDirective,
}: InvestigationModalProps) {
  const [query, setQuery] = useState("");
  const [investigating, setInvestigating] = useState(false);
  const [result, setResult] = useState<InvestigationResult | null>(null);

  const handleRunInvestigation = async (questionText: string) => {
    if (!questionText.trim()) {
      toast.error("Please enter a question or investigation topic.");
      return;
    }

    setInvestigating(true);
    setResult(null);

    try {
      const res = await coordinateExecutiveInvestigation(questionText.trim(), {
        businesses: stats?.businesses || 0,
        pendingBusinesses: stats?.pendingBusinesses || 0,
        posts: stats?.posts || 0,
        users: stats?.users || 0,
        salesPages: stats?.salesPages || 0,
        categories: stats?.categories || 0,
        unreadContacts: stats?.pendingBusinesses || 0,
      });
      setResult(res);
      toast.success("Multi-agent synthesis complete!");
    } catch (e: any) {
      toast.error("Investigation error: " + e.message);
    } finally {
      setInvestigating(false);
    }
  };

  const handleDispatchAsTask = () => {
    if (!result) return;
    
    if (onDispatchDirective) {
      onDispatchDirective(result.assignedAgent, result.recommendedAction);
    }

    if (onCreateTask) {
      onCreateTask({
        title: `Directive: ${result.recommendedAction.slice(0, 60)}…`,
        assignedAgent: result.assignedAgent,
        assignedAgentId: result.assignedAgent,
        priority: result.priority,
        status: "pending",
        request: result.recommendedAction,
        context: result.whyItHappened,
        dataSummary: (result.evidence || []).join(" | "),
        recommendation: result.recommendedAction,
        expectedResult: result.expectedOutcome,
      });
    }

    toast.success(`Task dispatched to ${result.assignedAgent}!`);
    onOpenChange(false);
  };

  const getPriorityBadge = (p: TaskPriority) => {
    switch (p) {
      case "P0":
        return <Badge className="bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/30 text-[9px] font-black">P0 CRITICAL</Badge>;
      case "P1":
        return <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/30 text-[9px] font-black">P1 HIGH</Badge>;
      default:
        return <Badge className="bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/30 text-[9px] font-bold">P2 MEDIUM</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 rounded-2xl">
        <DialogHeader className="border-b pb-3 space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Bot className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-black text-foreground">
                Multi-Agent Investigation & Synthesis Console
              </DialogTitle>
              <p className="text-xs text-muted-foreground font-medium">
                Executive Admin AI routes inquiries across specialized agents to produce synthesized findings.
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-1 text-xs">
          {/* Query Input */}
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask any strategic, business, or operational question..."
                className="h-9 text-xs rounded-xl flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRunInvestigation(query);
                }}
              />
              <Button
                onClick={() => handleRunInvestigation(query)}
                disabled={investigating}
                className="h-9 px-4 rounded-xl text-xs font-black bg-primary text-primary-foreground gap-1.5 shrink-0"
              >
                {investigating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                <span>{investigating ? "Synthesizing…" : "Investigate"}</span>
              </Button>
            </div>

            {/* Quick Sample Prompts */}
            {!result && !investigating && (
              <div className="space-y-1 pt-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Sample Inquiries</p>
                <div className="flex flex-wrap gap-1.5">
                  {SAMPLE_QUESTIONS.map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setQuery(q);
                        handleRunInvestigation(q);
                      }}
                      className="text-[11px] text-left p-1.5 px-2.5 rounded-lg border bg-muted/40 hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Loading Animation */}
          {investigating && (
            <div className="p-8 text-center space-y-3 rounded-2xl bg-muted/20 border border-primary/20 animate-pulse">
              <div className="h-10 w-10 mx-auto rounded-2xl bg-primary/20 text-primary flex items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-black text-foreground">Coordinating Specialized AI Agents…</p>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  Analytics AI querying live metrics · Marketplace AI auditing listings · Content & Growth AI synthesizing recommendations.
                </p>
              </div>
            </div>
          )}

          {/* Synthesized Output (8 Pillars) */}
          {result && (
            <div className="space-y-3.5 rounded-2xl bg-card border p-4 shadow-sm animate-in fade-in">
              <div className="flex items-center justify-between border-b pb-2.5">
                <div className="flex items-center gap-2">
                  {getPriorityBadge(result.priority)}
                  <span className="font-bold text-xs text-foreground">Assigned Agent: {result.assignedAgent}</span>
                </div>
                <div className="flex items-center gap-1">
                  {result.agentsInvolved.map((a) => (
                    <span key={a} className="text-[9px] px-1.5 py-0.5 rounded bg-muted font-mono">
                      {a}
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-2.5 text-xs">
                {/* 1. What Happened */}
                <div className="p-2.5 rounded-xl bg-muted/30 border space-y-0.5">
                  <p className="text-[10px] font-extrabold uppercase text-muted-foreground">1. What Happened</p>
                  <p className="font-semibold text-foreground leading-relaxed">{result.whatHappened}</p>
                </div>

                {/* 2. Why It Happened */}
                <div className="p-2.5 rounded-xl bg-muted/30 border space-y-0.5">
                  <p className="text-[10px] font-extrabold uppercase text-muted-foreground">2. Why It Happened (Root Cause)</p>
                  <p className="font-semibold text-foreground leading-relaxed">{result.whyItHappened}</p>
                </div>

                {/* 3. Evidence */}
                <div className="p-2.5 rounded-xl bg-muted/30 border space-y-1">
                  <p className="text-[10px] font-extrabold uppercase text-muted-foreground">3. Evidence & Telemetry</p>
                  <ul className="space-y-0.5 list-disc list-inside text-muted-foreground">
                    {result.evidence.map((ev, i) => (
                      <li key={i} className="leading-relaxed">
                        {ev}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* 4. Recommended Action */}
                <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 space-y-0.5">
                  <p className="text-[10px] font-extrabold uppercase text-purple-600 dark:text-purple-400">
                    4. Recommended Action & Strategy
                  </p>
                  <p className="font-black text-foreground leading-relaxed">{result.recommendedAction}</p>
                </div>

                {/* 5. Expected Outcome & Monitoring */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="p-2.5 rounded-xl bg-muted/30 border space-y-0.5">
                    <p className="text-[10px] font-extrabold uppercase text-muted-foreground">5. Expected Outcome</p>
                    <p className="text-[11px] font-medium text-foreground/90">{result.expectedOutcome}</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-muted/30 border space-y-0.5">
                    <p className="text-[10px] font-extrabold uppercase text-muted-foreground">6. Monitoring Plan</p>
                    <p className="text-[11px] font-medium text-foreground/90">{result.monitoringPlan}</p>
                  </div>
                </div>
              </div>

              {/* Action */}
              <div className="pt-2 border-t flex justify-end gap-2">
                <Button
                  size="sm"
                  onClick={handleDispatchAsTask}
                  className="h-8 px-4 rounded-xl text-xs font-black bg-primary text-primary-foreground gap-1.5"
                >
                  <Check className="h-3.5 w-3.5" /> Approve & Dispatch Directive to {result.assignedAgent}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
