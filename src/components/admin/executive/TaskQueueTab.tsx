import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  ListFilter, Plus, CheckCircle2, Clock, AlertTriangle, ArrowUpRight,
  ShieldCheck, Bot, Check, X, Search, Sparkles, Send
} from "lucide-react";
import {
  AgentTask,
  TaskPriority,
  TaskStatus,
  AgentId,
  SPECIALIZED_AI_AGENTS,
} from "@/lib/executiveAdminAIEngine";
import { toast } from "sonner";

interface TaskQueueTabProps {
  tasks: AgentTask[];
  onUpdateTask: (task: AgentTask) => void;
  onCreateTask: (task: Omit<AgentTask, "id" | "createdAt" | "updatedAt">) => void;
  onExecuteTask: (task: AgentTask) => void;
}

export default function TaskQueueTab({
  tasks,
  onUpdateTask,
  onCreateTask,
  onExecuteTask,
}: TaskQueueTabProps) {
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTask, setSelectedTask] = useState<AgentTask | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New task form state
  const [newTitle, setNewTitle] = useState("");
  const [newAgent, setNewAgent] = useState<AgentId>("content_ai");
  const [newPriority, setNewPriority] = useState<TaskPriority>("P1");
  const [newRequest, setNewRequest] = useState("");
  const [newContext, setNewContext] = useState("");
  const [newExpectedResult, setNewExpectedResult] = useState("");

  const filteredTasks = tasks.filter((t) => {
    if (filterStatus !== "all" && t.status !== filterStatus) return false;
    if (filterPriority !== "all" && t.priority !== filterPriority) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        t.title.toLowerCase().includes(q) ||
        t.request.toLowerCase().includes(q) ||
        t.assignedAgent.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newRequest.trim()) {
      toast.error("Please fill in the title and request fields.");
      return;
    }

    onCreateTask({
      title: newTitle.trim(),
      assignedAgent: newAgent,
      priority: newPriority,
      status: "pending",
      request: newRequest.trim(),
      context: newContext.trim() || "Created via Executive Admin AI Task Board",
      dataSummary: "Awaiting execution telemetry",
      recommendation: "Execute and verify business outcome metrics.",
      expectedResult: newExpectedResult.trim() || "Improve platform performance and merchant metrics.",
    });

    setShowCreateModal(false);
    setNewTitle("");
    setNewRequest("");
    setNewContext("");
    setNewExpectedResult("");
    toast.success("New structured agent task dispatched to queue!");
  };

  const getPriorityBadge = (p: TaskPriority) => {
    switch (p) {
      case "P0":
        return <Badge className="bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/30 font-black text-[9px]">P0 CRITICAL</Badge>;
      case "P1":
        return <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/30 font-black text-[9px]">P1 HIGH</Badge>;
      case "P2":
        return <Badge className="bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/30 font-bold text-[9px]">P2 MEDIUM</Badge>;
      default:
        return <Badge className="bg-slate-500/20 text-slate-700 dark:text-slate-400 border-slate-500/30 font-medium text-[9px]">P3 LOW</Badge>;
    }
  };

  const getStatusBadge = (s: TaskStatus) => {
    switch (s) {
      case "completed":
        return <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 font-bold text-[9px]">Completed</Badge>;
      case "in_progress":
        return <Badge className="bg-cyan-500/15 text-cyan-700 dark:text-cyan-400 border-cyan-500/30 font-bold text-[9px]">In Progress</Badge>;
      case "escalated":
        return <Badge className="bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30 font-bold text-[9px]">Escalated to Founder</Badge>;
      case "failed":
        return <Badge className="bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30 font-bold text-[9px]">Failed</Badge>;
      default:
        return <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 font-bold text-[9px]">Pending</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Controls & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 p-3 rounded-2xl bg-card border border-border/80">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks, agents, requests..."
              className="h-8 pl-8 text-xs rounded-xl"
            />
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="h-8 px-2 text-xs rounded-xl border border-input bg-background font-medium"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="escalated">Escalated</option>
          </select>

          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="h-8 px-2 text-xs rounded-xl border border-input bg-background font-medium"
          >
            <option value="all">All Priorities</option>
            <option value="P0">P0 Critical</option>
            <option value="P1">P1 High</option>
            <option value="P2">P2 Medium</option>
            <option value="P3">P3 Low</option>
          </select>
        </div>

        <Button
          size="sm"
          onClick={() => setShowCreateModal(true)}
          className="h-8 rounded-xl font-bold text-xs bg-primary text-primary-foreground gap-1.5 shrink-0"
        >
          <Plus className="h-3.5 w-3.5" /> Dispatch New Task
        </Button>
      </div>

      {/* Tasks List */}
      <div className="space-y-2.5">
        {filteredTasks.length === 0 ? (
          <div className="p-8 text-center rounded-2xl border border-dashed border-border bg-card/50 text-muted-foreground">
            <Bot className="h-8 w-8 mx-auto mb-2 text-muted-foreground/60" />
            <p className="text-xs font-bold text-foreground">No tasks matching current filter</p>
            <p className="text-[11px]">All agent queues are clean or adjusted by search parameters.</p>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const agentDef = SPECIALIZED_AI_AGENTS.find((a) => a.id === task.assignedAgent);
            return (
              <Card
                key={task.id}
                onClick={() => setSelectedTask(task)}
                className="p-3.5 rounded-2xl border border-border/70 bg-card hover:border-primary/40 hover:bg-secondary/20 transition-all cursor-pointer space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {getPriorityBadge(task.priority)}
                      {getStatusBadge(task.status)}
                      <span className="text-[10px] font-bold text-muted-foreground">
                        {agentDef?.name || task.assignedAgent}
                      </span>
                    </div>
                    <h3 className="text-xs sm:text-sm font-black text-foreground">{task.title}</h3>
                    <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                      {task.request}
                    </p>
                  </div>

                  <div className="shrink-0 flex flex-col items-end gap-1.5">
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(task.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    {task.status !== "completed" && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          onExecuteTask(task);
                        }}
                        className="h-7 px-2.5 rounded-xl text-[11px] font-bold gap-1"
                      >
                        <Sparkles className="h-3 w-3 text-primary" /> Execute
                      </Button>
                    )}
                  </div>
                </div>

                {task.result && (
                  <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-800 dark:text-emerald-300">
                    <span className="font-bold">Result: </span>
                    {task.result}
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>

      {/* Task Details Modal (Structured Communication Inspector) */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-2xl bg-card rounded-2xl border border-border shadow-2xl p-4 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3 border-b pb-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  {getPriorityBadge(selectedTask.priority)}
                  {getStatusBadge(selectedTask.status)}
                  <Badge variant="outline" className="text-[10px] font-bold">
                    Agent: {selectedTask.assignedAgent}
                  </Badge>
                </div>
                <h2 className="text-base font-black text-foreground">{selectedTask.title}</h2>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedTask(null)}
                className="h-7 w-7 p-0 rounded-full"
              >
                ✕
              </Button>
            </div>

            {/* Structured Communication Breakdown */}
            <div className="space-y-3 text-xs">
              <div className="p-2.5 rounded-xl bg-muted/40 border space-y-0.5">
                <p className="text-[10px] font-extrabold uppercase text-muted-foreground tracking-wider">
                  1. REQUEST (What was asked)
                </p>
                <p className="font-semibold text-foreground leading-relaxed">{selectedTask.request}</p>
              </div>

              <div className="p-2.5 rounded-xl bg-muted/40 border space-y-0.5">
                <p className="text-[10px] font-extrabold uppercase text-muted-foreground tracking-wider">
                  2. CONTEXT (Why it matters)
                </p>
                <p className="font-semibold text-foreground leading-relaxed">{selectedTask.context}</p>
              </div>

              <div className="p-2.5 rounded-xl bg-muted/40 border space-y-0.5">
                <p className="text-[10px] font-extrabold uppercase text-muted-foreground tracking-wider">
                  3. DATA & EVIDENCE (Observed metrics)
                </p>
                <p className="font-semibold text-foreground leading-relaxed">{selectedTask.dataSummary}</p>
              </div>

              <div className="p-2.5 rounded-xl bg-muted/40 border space-y-0.5">
                <p className="text-[10px] font-extrabold uppercase text-muted-foreground tracking-wider">
                  4. RECOMMENDATION (Strategic action)
                </p>
                <p className="font-semibold text-foreground leading-relaxed">{selectedTask.recommendation}</p>
              </div>

              <div className="p-2.5 rounded-xl bg-muted/40 border space-y-0.5">
                <p className="text-[10px] font-extrabold uppercase text-muted-foreground tracking-wider">
                  5. EXPECTED RESULT (Measurable business impact)
                </p>
                <p className="font-semibold text-foreground leading-relaxed">{selectedTask.expectedResult}</p>
              </div>

              {selectedTask.result && (
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-0.5">
                  <p className="text-[10px] font-extrabold uppercase text-emerald-700 dark:text-emerald-400 tracking-wider">
                    6. FINAL RESOLUTION
                  </p>
                  <p className="font-bold text-emerald-900 dark:text-emerald-200">{selectedTask.result}</p>
                </div>
              )}
            </div>

            {/* Actions Bar */}
            <div className="flex items-center justify-between pt-3 border-t gap-2 flex-wrap">
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    onUpdateTask({ ...selectedTask, status: "escalated", updatedAt: new Date().toISOString() });
                    setSelectedTask(null);
                    toast.success("Task escalated to Founder & CEO queue");
                  }}
                  className="h-8 rounded-xl text-xs font-bold"
                >
                  Escalate to Founder
                </Button>
              </div>

              <div className="flex items-center gap-2">
                {selectedTask.status !== "completed" && (
                  <Button
                    size="sm"
                    onClick={() => {
                      onUpdateTask({
                        ...selectedTask,
                        status: "completed",
                        result: "Task verified and closed by Executive Admin AI.",
                        updatedAt: new Date().toISOString(),
                      });
                      setSelectedTask(null);
                      toast.success("Task marked as completed");
                    }}
                    className="h-8 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                  >
                    <Check className="h-3 w-3" /> Mark Completed
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setSelectedTask(null)}
                  className="h-8 rounded-xl text-xs font-bold"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Task Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <form
            onSubmit={handleCreateSubmit}
            className="w-full max-w-lg bg-card rounded-2xl border border-border shadow-2xl p-4 sm:p-6 space-y-3.5 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b pb-2.5">
              <h2 className="text-sm sm:text-base font-black text-foreground">
                Dispatch New Structured Agent Directive
              </h2>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowCreateModal(false)}
                className="h-7 w-7 p-0 rounded-full"
              >
                ✕
              </Button>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-foreground">Task Title</label>
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Audit WhatsApp lead conversion funnel"
                className="h-8 text-xs rounded-xl"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-foreground">Assigned Agent</label>
                <select
                  value={newAgent}
                  onChange={(e) => setNewAgent(e.target.value as AgentId)}
                  className="w-full h-8 px-2 text-xs rounded-xl border border-input bg-background font-medium"
                >
                  {SPECIALIZED_AI_AGENTS.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-foreground">Priority</label>
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value as TaskPriority)}
                  className="w-full h-8 px-2 text-xs rounded-xl border border-input bg-background font-medium"
                >
                  <option value="P0">P0 Critical</option>
                  <option value="P1">P1 High</option>
                  <option value="P2">P2 Medium</option>
                  <option value="P3">P3 Low</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-foreground">1. Request (Actionable Task)</label>
              <textarea
                value={newRequest}
                onChange={(e) => setNewRequest(e.target.value)}
                rows={2}
                placeholder="What exactly should the agent accomplish?"
                className="w-full rounded-xl border border-input bg-background p-2.5 text-xs outline-hidden focus:ring-2 focus:ring-primary"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-foreground">2. Context & Background</label>
              <textarea
                value={newContext}
                onChange={(e) => setNewContext(e.target.value)}
                rows={2}
                placeholder="Why is this task needed right now?"
                className="w-full rounded-xl border border-input bg-background p-2.5 text-xs outline-hidden focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-foreground">3. Expected Result (KPI target)</label>
              <Input
                value={newExpectedResult}
                onChange={(e) => setNewExpectedResult(e.target.value)}
                placeholder="e.g. 20% increase in lead response speed"
                className="h-8 text-xs rounded-xl"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowCreateModal(false)}
                className="h-8 rounded-xl text-xs font-bold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="h-8 rounded-xl text-xs font-black bg-primary text-primary-foreground gap-1.5"
              >
                <Send className="h-3 w-3" /> Dispatch Task
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
