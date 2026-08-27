import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  RefreshCw,
  Activity,
  Cpu,
  Clock,
  Sparkles,
  Terminal,
  ExternalLink,
} from "lucide-react";
import {
  runComprehensiveSystemHealthDiagnostic,
  SystemHealthReport,
  SystemComponentStatus,
} from "@/lib/executiveOrchestrationEngine";
import { toast } from "sonner";

interface SystemHealthDiagnosticsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SystemHealthDiagnosticsModal({
  open,
  onOpenChange,
}: SystemHealthDiagnosticsModalProps) {
  const [report, setReport] = useState<SystemHealthReport | null>(null);
  const [running, setRunning] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<"ALL" | SystemComponentStatus>("ALL");

  const runDiagnostic = async () => {
    setRunning(true);
    try {
      const res = await runComprehensiveSystemHealthDiagnostic();
      setReport(res);
      toast.success("Platform System Diagnostic complete!");
    } catch (err: any) {
      toast.error("Diagnostic probe failed: " + err.message);
    } finally {
      setRunning(false);
    }
  };

  useEffect(() => {
    if (open && !report && !running) {
      runDiagnostic();
    }
  }, [open]);

  const getStatusBadge = (status: SystemComponentStatus) => {
    switch (status) {
      case "WORKING":
        return (
          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] font-black gap-1">
            <CheckCircle2 className="h-3 w-3 text-emerald-500" /> WORKING
          </Badge>
        );
      case "PARTIALLY_WORKING":
        return (
          <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[10px] font-black gap-1">
            <AlertTriangle className="h-3 w-3 text-amber-500" /> PARTIAL
          </Badge>
        );
      case "NOT_CONFIGURED":
        return (
          <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30 text-[10px] font-black gap-1">
            <HelpCircle className="h-3 w-3 text-blue-500" /> NOT CONFIGURED
          </Badge>
        );
      case "BROKEN":
        return (
          <Badge className="bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30 text-[10px] font-black gap-1">
            <XCircle className="h-3 w-3 text-red-500" /> BROKEN
          </Badge>
        );
      default:
        return (
          <Badge className="bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30 text-[10px] font-black">
            BLOCKED
          </Badge>
        );
    }
  };

  const filteredChecks = report?.checks.filter((c) => {
    if (selectedFilter === "ALL") return true;
    return c.status === selectedFilter;
  }) || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 rounded-3xl border border-border/80 shadow-2xl bg-card">
        {/* Header */}
        <div className="p-6 pb-4 bg-gradient-to-br from-slate-950 via-indigo-950 to-purple-950 text-white border-b border-purple-500/20">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[11px] font-bold">
                <ShieldCheck className="h-3.5 w-3.5 text-purple-400" /> Executive Integrity Probes
              </div>
              <DialogTitle className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                Real-Time System Health & Diagnostic Suite
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-300">
                Self-testing verification across Auth, Database, Gemini AI, FCM Web Push, Email Router, Pexels Graphics, and Commerce.
              </DialogDescription>
            </div>

            <Button
              onClick={runDiagnostic}
              disabled={running}
              size="sm"
              className="rounded-xl font-bold text-xs bg-purple-600 hover:bg-purple-500 text-white gap-1.5 shadow-md shrink-0"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${running ? "animate-spin" : ""}`} />
              {running ? "Probing Subsystems…" : "Re-run Live Diagnostic"}
            </Button>
          </div>

          {/* Quick Metrics Bar */}
          {report && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-5 pt-4 border-t border-white/10">
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-center">
                <p className="text-[10px] uppercase font-bold text-slate-400">Health Score</p>
                <p className="text-xl font-black text-emerald-400">{report.healthScore}%</p>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                <p className="text-[10px] uppercase font-bold text-emerald-300">Working</p>
                <p className="text-xl font-black text-emerald-400">{report.workingCount}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
                <p className="text-[10px] uppercase font-bold text-amber-300">Partial</p>
                <p className="text-xl font-black text-amber-400">{report.partialCount}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-center">
                <p className="text-[10px] uppercase font-bold text-blue-300">Not Configured</p>
                <p className="text-xl font-black text-blue-400">{report.notConfiguredCount}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-center col-span-2 sm:col-span-1">
                <p className="text-[10px] uppercase font-bold text-red-300">Broken / Issues</p>
                <p className="text-xl font-black text-red-400">{report.brokenCount}</p>
              </div>
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          {/* Executive Summary */}
          {report && (
            <div className="p-3.5 rounded-2xl bg-muted/60 border border-border/80 text-xs font-medium flex items-start gap-2.5">
              <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-foreground">Executive AI Verification Summary: </span>
                <span className="text-muted-foreground">{report.executiveSummary}</span>
              </div>
            </div>
          )}

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-xs font-bold text-muted-foreground mr-1">Filter Probes:</span>
            {(["ALL", "WORKING", "PARTIALLY_WORKING", "NOT_CONFIGURED", "BROKEN"] as const).map((filterKey) => (
              <Button
                key={filterKey}
                variant={selectedFilter === filterKey ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedFilter(filterKey)}
                className="h-7 px-2.5 rounded-lg text-xs font-bold"
              >
                {filterKey.replace("_", " ")}
              </Button>
            ))}
          </div>

          {/* Probe Cards List */}
          <div className="space-y-2.5">
            {filteredChecks.map((check) => (
              <div
                key={check.id}
                className="p-4 rounded-2xl border border-border/80 bg-card hover:border-primary/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
              >
                <div className="space-y-1 max-w-xl">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-sm text-foreground">{check.name}</span>
                    {getStatusBadge(check.status)}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{check.details}</p>
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground/80 pt-1">
                    <span className="font-medium flex items-center gap-1">
                      <Terminal className="h-3 w-3 text-primary" /> {check.verificationEvidence}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-muted-foreground" /> {check.latencyMs}ms
                    </span>
                  </div>
                </div>

                {check.troubleshootingGuidance && (
                  <div className="sm:max-w-xs text-right text-[11px] text-amber-600 dark:text-amber-400 bg-amber-500/10 p-2 rounded-xl border border-amber-500/20">
                    <span className="font-bold">Guidance: </span> {check.troubleshootingGuidance}
                  </div>
                )}
              </div>
            ))}

            {filteredChecks.length === 0 && (
              <div className="p-8 text-center rounded-2xl border border-dashed border-border text-muted-foreground text-xs">
                No system probes match the selected filter.
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
