import React from "react";
import { BadgeCheck, ShieldCheck, Sparkles } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

interface VerifiedBadgeProps {
  verified?: boolean | null;
  verifiedUntil?: string | null;
  size?: "xs" | "sm" | "md" | "lg";
  showText?: boolean;
  text?: string;
  className?: string;
  interactive?: boolean;
}

export default function VerifiedBadge({
  verified = true,
  verifiedUntil,
  size = "sm",
  showText = false,
  text = "Verified Business",
  className = "",
}: VerifiedBadgeProps) {
  if (!verified) return null;

  // Check if expired
  if (verifiedUntil && new Date(verifiedUntil) < new Date()) {
    return null;
  }

  const iconSizes = {
    xs: "h-3.5 w-3.5",
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  };

  const textSizes = {
    xs: "text-[10px]",
    sm: "text-xs",
    md: "text-xs",
    lg: "text-sm",
  };

  const badgeContent = (
    <span
      className={`inline-flex items-center gap-1 font-extrabold text-sky-600 dark:text-sky-400 select-none ${className}`}
      title="Verified Business"
    >
      <span className="relative flex items-center justify-center">
        <BadgeCheck
          className={`${iconSizes[size]} fill-sky-500 text-white shrink-0 drop-shadow-xs`}
          aria-label="Verified Business Badge"
        />
      </span>
      {showText && (
        <span className={`font-black tracking-tight ${textSizes[size]}`}>
          {text}
        </span>
      )}
    </span>
  );

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex cursor-help">{badgeContent}</span>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="max-w-xs bg-slate-900 text-white p-2.5 rounded-xl border border-sky-500/30 shadow-xl space-y-1"
        >
          <div className="flex items-center gap-1.5 font-bold text-xs text-sky-400">
            <ShieldCheck className="h-4 w-4 text-sky-400" />
            Official Verified Business
          </div>
          <p className="text-[11px] text-slate-200 leading-relaxed">
            This business identity and contact details have been vetted and verified by Bethelincovibe.
          </p>
          {verifiedUntil && (
            <p className="text-[10px] text-slate-400 pt-0.5">
              Valid until: {new Date(verifiedUntil).toLocaleDateString()}
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function VerifiedPillBadge({
  className = "",
}: {
  className?: string;
}) {
  return (
    <Badge
      variant="secondary"
      className={`bg-sky-500/10 hover:bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30 gap-1 px-2.5 py-0.5 rounded-full font-black text-xs shadow-xs ${className}`}
    >
      <BadgeCheck className="h-3.5 w-3.5 fill-sky-500 text-white" />
      <span>Verified Business</span>
    </Badge>
  );
}
