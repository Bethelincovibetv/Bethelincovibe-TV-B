import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Cpu, ChevronDown, Sparkles, Brain, Zap } from "lucide-react";
import GeminiModelSelectorModal from "./GeminiModelSelectorModal";
import { getActiveGeminiModelId } from "@/lib/geminiModelRegistry";

interface GeminiModelSelectorPillProps {
  currentModelId?: string;
  onModelChange?: (modelId: string) => void;
  className?: string;
  variant?: "header" | "compact" | "luxury";
}

export default function GeminiModelSelectorPill({
  currentModelId: controlledModelId,
  onModelChange,
  className = "",
  variant = "luxury",
}: GeminiModelSelectorPillProps) {
  const [open, setOpen] = useState(false);
  const [activeModel, setActiveModel] = useState(controlledModelId || getActiveGeminiModelId());

  useEffect(() => {
    if (controlledModelId) {
      setActiveModel(controlledModelId);
    }
  }, [controlledModelId]);

  const handleSelect = (newModel: string) => {
    setActiveModel(newModel);
    onModelChange?.(newModel);
  };

  const isPro = activeModel.includes("pro");
  const isLite = activeModel.includes("lite");

  if (variant === "compact") {
    return (
      <>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-mono font-bold bg-muted/80 hover:bg-muted text-foreground border border-border/80 transition-all ${className}`}
        >
          <Cpu className="h-3 w-3 text-primary" />
          <span className="truncate max-w-[120px]">{activeModel}</span>
          <ChevronDown className="h-2.5 w-2.5 opacity-60" />
        </button>

        <GeminiModelSelectorModal
          open={open}
          onOpenChange={setOpen}
          currentModelId={activeModel}
          onSelectModel={handleSelect}
        />
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`group inline-flex items-center gap-2 px-3 py-1.5 rounded-2xl border transition-all text-left shadow-xs ${
          isPro
            ? "border-amber-500/40 bg-gradient-to-r from-amber-500/10 via-background to-amber-500/5 hover:border-amber-500/60"
            : "border-primary/40 bg-gradient-to-r from-primary/10 via-background to-primary/5 hover:border-primary/60"
        } ${className}`}
      >
        <div
          className={`p-1 rounded-lg shrink-0 ${
            isPro
              ? "bg-amber-500/20 text-amber-500"
              : isLite
              ? "bg-emerald-500/20 text-emerald-500"
              : "bg-primary/20 text-primary"
          }`}
        >
          {isPro ? (
            <Brain className="h-3.5 w-3.5" />
          ) : isLite ? (
            <Zap className="h-3.5 w-3.5" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
        </div>

        <div className="flex flex-col min-w-0 pr-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
              AI Core
            </span>
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <span className="text-xs font-black text-foreground truncate max-w-[140px] sm:max-w-[170px] leading-tight">
            {activeModel}
          </span>
        </div>

        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-transform group-hover:translate-y-0.5 shrink-0" />
      </button>

      <GeminiModelSelectorModal
        open={open}
        onOpenChange={setOpen}
        currentModelId={activeModel}
        onSelectModel={handleSelect}
      />
    </>
  );
}
