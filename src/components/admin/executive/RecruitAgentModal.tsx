import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Sparkles, CheckCircle2, Shield, Image, Plus } from "lucide-react";
import {
  DigitalEmployeeProfile,
  PRESET_AVATARS_FOR_RECRUITS,
  recruitNewAIAgent
} from "@/lib/aiWorkforceRegistry";
import { toast } from "sonner";

interface RecruitAgentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAgentRecruited: (newAgent: DigitalEmployeeProfile) => void;
}

export default function RecruitAgentModal({
  open,
  onOpenChange,
  onAgentRecruited,
}: RecruitAgentModalProps) {
  const [name, setName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [department, setDepartment] = useState("Growth & Innovation");
  const [role, setRole] = useState("");
  const [biography, setBiography] = useState("");
  const [currentFocus, setCurrentFocus] = useState("");
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState(PRESET_AVATARS_FOR_RECRUITS[0].url);
  const [customPhotoUrl, setCustomPhotoUrl] = useState("");
  const [capabilitiesRaw, setCapabilitiesRaw] = useState("Market Research, Campaign Optimization, Automated Reporting");
  const [responsibilitiesRaw, setResponsibilitiesRaw] = useState("Execute targeted marketing experiments\nAnalyze customer retention feedback\nPublish weekly growth insights");
  const [toolsRaw, setToolsRaw] = useState("Gemini Reasoning API, Analytics Pipeline, Supabase DB");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !jobTitle.trim() || !role.trim()) {
      toast.error("Please fill in the employee's name, job title, and role summary.");
      return;
    }

    const photoUrl = customPhotoUrl.trim() || selectedPhotoUrl;

    const capabilities = capabilitiesRaw
      .split(/,|\n/)
      .map((s) => s.trim())
      .filter(Boolean);

    const responsibilities = responsibilitiesRaw
      .split(/\n|,/)
      .map((s) => s.trim())
      .filter(Boolean);

    const tools = toolsRaw
      .split(/,|\n/)
      .map((s) => s.trim())
      .filter(Boolean);

    const newRecruit = recruitNewAIAgent({
      name: name.trim(),
      codename: `${name.trim().split(" ")[0]} AI`,
      jobTitle: jobTitle.trim(),
      department: department.trim(),
      role: role.trim(),
      biography: biography.trim() || `${name.trim()} is an AI Specialist focused on ${department.trim()} for Bethelincovibe TV.`,
      currentFocus: currentFocus.trim() || `Assisting in high-velocity ${department.trim()} initiatives.`,
      profilePhotoUrl: photoUrl,
      capabilities: capabilities.length ? capabilities : ["Specialist Analysis", "Autonomous Execution"],
      responsibilities: responsibilities.length ? responsibilities : ["Execute departmental directives", "Report to Victoria Vance"],
      tools: tools.length ? tools : ["Gemini 3.7 Flash Engine", "Platform API"],
      permissions: ["read_telemetry", "execute_specialist_directives"],
      status: "active",
      availability: "24/7 Real-Time Autonomous",
      executiveRelationship: "Reports to Victoria Vance (Executive Admin AI).",
      iconName: "Sparkles",
      gradient: "from-indigo-600 to-purple-600",
    });

    onAgentRecruited(newRecruit);
    onOpenChange(false);
    toast.success(`🎉 Successfully recruited ${newRecruit.name} (${newRecruit.jobTitle}) to the Digital Workforce!`);

    // Reset form
    setName("");
    setJobTitle("");
    setRole("");
    setBiography("");
    setCurrentFocus("");
    setCustomPhotoUrl("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-5 sm:p-6 rounded-2xl sm:rounded-3xl border-2 border-border/80 shadow-2xl bg-card">
        <DialogHeader className="space-y-1 pb-3 border-b border-border/80">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
              <UserPlus className="h-4 w-4" />
            </div>
            <DialogTitle className="text-lg sm:text-xl font-black text-foreground">
              Recruit New AI Digital Employee
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs font-semibold text-muted-foreground">
            Onboard a new specialized AI employee to expand the platform's autonomous workforce.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Avatar Selection */}
          <div className="space-y-2">
            <label className="text-xs font-black text-foreground flex items-center gap-1.5">
              <Image className="h-3.5 w-3.5 text-primary" /> Select Professional Portrait
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {PRESET_AVATARS_FOR_RECRUITS.map((item, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => {
                    setSelectedPhotoUrl(item.url);
                    setCustomPhotoUrl("");
                  }}
                  className={`relative rounded-xl overflow-hidden aspect-square border-2 transition-all ${
                    selectedPhotoUrl === item.url && !customPhotoUrl
                      ? "border-primary ring-2 ring-primary/40 scale-105"
                      : "border-border/80 opacity-70 hover:opacity-100"
                  }`}
                  title={item.label}
                >
                  <img src={item.url} alt={item.label} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
            <Input
              value={customPhotoUrl}
              onChange={(e) => setCustomPhotoUrl(e.target.value)}
              placeholder="Or paste custom corporate photo URL..."
              className="text-xs rounded-xl"
            />
          </div>

          {/* Core Info: Name, Title & Department */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-extrabold text-foreground">Full Employee Name *</label>
              <Input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Marcus Sterling"
                className="text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-extrabold text-foreground">Job Title *</label>
              <Input
                required
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="e.g., Principal Logistics Coordinator"
                className="text-xs rounded-xl"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-extrabold text-foreground">Department Category *</label>
              <Input
                required
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g., Supply Chain & Logistics"
                className="text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-extrabold text-foreground">Current Focus Objective</label>
              <Input
                value={currentFocus}
                onChange={(e) => setCurrentFocus(e.target.value)}
                placeholder="e.g., Optimizing freight rates from Guangzhou to Lagos"
                className="text-xs rounded-xl"
              />
            </div>
          </div>

          {/* Role Summary */}
          <div className="space-y-1">
            <label className="text-xs font-extrabold text-foreground">Role Summary *</label>
            <Input
              required
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g., Analyzes international shipping routes, customs tariffs, and delivery timelines."
              className="text-xs rounded-xl"
            />
          </div>

          {/* Biography */}
          <div className="space-y-1">
            <label className="text-xs font-extrabold text-foreground">Professional Biography</label>
            <Textarea
              rows={2}
              value={biography}
              onChange={(e) => setBiography(e.target.value)}
              placeholder="Detailed professional background and expertise..."
              className="text-xs rounded-xl resize-none"
            />
          </div>

          {/* Capabilities & Responsibilities */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-extrabold text-foreground">Key Capabilities (comma separated)</label>
              <Textarea
                rows={2}
                value={capabilitiesRaw}
                onChange={(e) => setCapabilitiesRaw(e.target.value)}
                placeholder="Freight Rate Auditing, Customs Clearance AI, Carrier Matchmaking"
                className="text-xs rounded-xl resize-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-extrabold text-foreground">Key Responsibilities (line separated)</label>
              <Textarea
                rows={2}
                value={responsibilitiesRaw}
                onChange={(e) => setResponsibilitiesRaw(e.target.value)}
                placeholder="Track Lagos port arrival schedules&#10;Verify shipping agent credentials"
                className="text-xs rounded-xl resize-none"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-extrabold text-foreground">Tools & System Integrations (comma separated)</label>
            <Input
              value={toolsRaw}
              onChange={(e) => setToolsRaw(e.target.value)}
              placeholder="Port Tariff API, Gemini Reasoning, Logistics DB"
              className="text-xs rounded-xl"
            />
          </div>

          {/* Footer Submit */}
          <div className="pt-3 border-t border-border/80 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs font-bold rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              className="text-xs font-black rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5 shadow-xs"
            >
              <Sparkles className="h-3.5 w-3.5" /> Onboard Digital Employee
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
