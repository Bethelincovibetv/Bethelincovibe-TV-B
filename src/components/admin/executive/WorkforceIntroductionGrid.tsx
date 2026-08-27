import React from "react";
import { DigitalEmployeeProfile } from "@/lib/aiWorkforceRegistry";
import AgentProfileCard from "./AgentProfileCard";

interface WorkforceIntroductionGridProps {
  agents: DigitalEmployeeProfile[];
  onViewProfile?: (agent: DigitalEmployeeProfile) => void;
  onDispatchDirective?: (agent: DigitalEmployeeProfile) => void;
  compact?: boolean;
}

export default function WorkforceIntroductionGrid({
  agents,
  onViewProfile,
  onDispatchDirective,
  compact = false,
}: WorkforceIntroductionGridProps) {
  if (!agents || agents.length === 0) return null;

  return (
    <div className="w-full my-3 space-y-2">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {agents.map((agent) => (
          <AgentProfileCard
            key={agent.id}
            agent={agent}
            onViewProfile={onViewProfile}
            onDispatchDirective={onDispatchDirective}
            compact={compact}
          />
        ))}
      </div>
    </div>
  );
}
