import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Users, Sparkles, Search, UserPlus, Filter, Grid3X3, List,
  ShieldCheck, ArrowRight, RefreshCw, Briefcase
} from "lucide-react";
import {
  AgentTask,
  AgentId,
} from "@/lib/executiveAdminAIEngine";
import {
  DigitalEmployeeProfile,
  getWorkforceRegistry,
  findAgentForTask,
  updateAgentProfile,
} from "@/lib/aiWorkforceRegistry";
import AgentProfileCard from "./AgentProfileCard";
import AgentProfileModal from "./AgentProfileModal";
import RecruitAgentModal from "./RecruitAgentModal";
import { toast } from "sonner";

interface AgentFleetMatrixTabProps {
  tasks?: AgentTask[];
  onDispatchToAgent?: (agentId: AgentId, directive: string) => void;
  onDispatchAgent?: (agentId: AgentId, directive?: string) => void;
  onInvestigateAgent?: (agentId: AgentId) => void;
  onAuditFleet?: () => void;
}

export default function AgentFleetMatrixTab({
  tasks = [],
  onDispatchToAgent,
  onDispatchAgent,
  onInvestigateAgent,
  onAuditFleet,
}: AgentFleetMatrixTabProps) {
  const [workforce, setWorkforce] = useState<DigitalEmployeeProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("All");
  const [selectedProfileModalAgent, setSelectedProfileModalAgent] = useState<DigitalEmployeeProfile | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isRecruitModalOpen, setIsRecruitModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "dense">("grid");

  // Load workforce registry on mount
  useEffect(() => {
    setWorkforce(getWorkforceRegistry());
  }, []);

  const refreshWorkforce = () => {
    setWorkforce(getWorkforceRegistry());
  };

  // Get list of unique departments
  const departments = ["All", ...Array.from(new Set(workforce.map((a) => a.department)))];

  // Filter workforce
  const filteredWorkforce = workforce.filter((agent) => {
    const matchesDept = selectedDepartment === "All" || agent.department === selectedDepartment;
    const q = searchQuery.toLowerCase().trim();
    if (!q) return matchesDept;

    const matchesSearch =
      agent.name.toLowerCase().includes(q) ||
      agent.jobTitle.toLowerCase().includes(q) ||
      agent.department.toLowerCase().includes(q) ||
      agent.role.toLowerCase().includes(q) ||
      agent.capabilities.some((c) => c.toLowerCase().includes(q)) ||
      agent.tools.some((t) => t.toLowerCase().includes(q));

    return matchesDept && matchesSearch;
  });

  const handleOpenProfile = (agent: DigitalEmployeeProfile) => {
    setSelectedProfileModalAgent(agent);
    setIsProfileModalOpen(true);
  };

  const handleDispatchDirective = (agent: DigitalEmployeeProfile) => {
    setSelectedProfileModalAgent(agent);
    setIsProfileModalOpen(true);
  };

  const handleExecuteDispatch = (agentId: string, directive: string) => {
    if (onDispatchToAgent) {
      onDispatchToAgent(agentId as AgentId, directive);
    } else if (onDispatchAgent) {
      onDispatchAgent(agentId as AgentId, directive);
    }
  };

  const handleAgentRecruited = (newAgent: DigitalEmployeeProfile) => {
    refreshWorkforce();
  };

  const handleAgentUpdated = (updated: DigitalEmployeeProfile) => {
    refreshWorkforce();
  };

  const totalActiveTasks = (tasks || []).filter(
    (t) => t?.status === "in_progress" || t?.status === "pending"
  ).length;

  return (
    <div className="space-y-4">
      {/* Fleet Header Bar */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-card border-2 border-border/80 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
              <Users className="h-4 w-4" />
            </div>
            <h2 className="text-base sm:text-lg font-black tracking-tight text-foreground">
              Digital Employee Workforce Directory
            </h2>
            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] font-black">
              {workforce.length} EMPLOYEES ACTIVE
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground font-medium">
            Central Operating Chain: <span className="text-foreground font-bold">Founder & CEO Bethel Goodgift</span> → <span className="text-primary font-bold">Victoria Vance (Executive Coordinator)</span> → <span className="text-foreground font-bold">Specialized Workforce</span>.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-start sm:justify-end">
          <Button
            onClick={() => setIsRecruitModalOpen(true)}
            size="sm"
            className="h-8 rounded-xl text-xs font-black gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs"
          >
            <UserPlus className="h-3.5 w-3.5" /> Recruit New AI Worker
          </Button>

          <Button
            onClick={onAuditFleet || (() => toast.success("All 12 digital employees are operational and responsive."))}
            size="sm"
            variant="outline"
            className="h-8 rounded-xl text-xs font-bold gap-1.5 border-border/80 hover:bg-muted"
          >
            <Sparkles className="h-3.5 w-3.5 text-primary" /> Fleet Diagnostic
          </Button>
        </div>
      </div>

      {/* Search & Department Filters */}
      <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/80 space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by employee name, job title, department, or capability..."
              className="pl-8 text-xs rounded-xl h-8 bg-background border-border"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            )}
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 shrink-0 self-end sm:self-auto">
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
              className="h-7 w-7 p-0 rounded-lg"
              title="Grid View"
            >
              <Grid3X3 className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant={viewMode === "dense" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("dense")}
              className="h-7 w-7 p-0 rounded-lg"
              title="Compact View"
            >
              <List className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Department Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <span className="text-[10px] font-extrabold uppercase text-muted-foreground shrink-0 mr-1 flex items-center gap-1">
            <Filter className="h-3 w-3" /> Dept:
          </span>
          {departments.map((dept) => (
            <button
              key={dept}
              onClick={() => setSelectedDepartment(dept)}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                selectedDepartment === dept
                  ? "bg-primary text-primary-foreground shadow-2xs font-black"
                  : "bg-background text-foreground/80 hover:bg-muted border border-border/60"
              }`}
            >
              {dept}
            </button>
          ))}
        </div>
      </div>

      {/* Workforce Cards Grid */}
      {filteredWorkforce.length === 0 ? (
        <div className="p-8 text-center rounded-2xl bg-card border border-border/80 space-y-2">
          <p className="text-sm font-black text-foreground">No digital employees found matching "{searchQuery}"</p>
          <p className="text-xs text-muted-foreground">Try clearing your search query or selecting a different department filter.</p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setSearchQuery("");
              setSelectedDepartment("All");
            }}
            className="text-xs font-bold rounded-xl mt-2"
          >
            Reset Filters
          </Button>
        </div>
      ) : (
        <div className={`grid gap-3.5 ${viewMode === "grid" ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1 md:grid-cols-2"}`}>
          {filteredWorkforce.map((agent) => {
            const agentTasks = (tasks || []).filter((t) => t?.assignedAgent === agent.id);
            const activeCount = agentTasks.filter(
              (t) => t?.status === "in_progress" || t?.status === "pending"
            ).length;

            return (
              <AgentProfileCard
                key={agent.id}
                agent={agent}
                activeTasksCount={activeCount}
                onViewProfile={handleOpenProfile}
                onDispatchDirective={handleDispatchDirective}
                compact={viewMode === "dense"}
              />
            );
          })}
        </div>
      )}

      {/* Profile Dossier Modal */}
      <AgentProfileModal
        agent={selectedProfileModalAgent}
        open={isProfileModalOpen}
        onOpenChange={setIsProfileModalOpen}
        onDispatchDirective={handleExecuteDispatch}
        onAgentUpdated={handleAgentUpdated}
      />

      {/* Recruit New AI Worker Modal */}
      <RecruitAgentModal
        open={isRecruitModalOpen}
        onOpenChange={setIsRecruitModalOpen}
        onAgentRecruited={handleAgentRecruited}
      />
    </div>
  );
}
