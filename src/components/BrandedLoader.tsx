import { Sparkles } from "lucide-react";

interface BrandedLoaderProps {
  message?: string;
  submessage?: string;
  fullScreen?: boolean;
}

export default function BrandedLoader({
  message = "Loading...",
  submessage = "Bethelincovibe TV • Business Growth Ecosystem",
  fullScreen = false,
}: BrandedLoaderProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center px-4 py-12 ${
        fullScreen ? "min-h-[70vh]" : "min-h-[40vh]"
      } animate-in fade-in duration-200`}
    >
      <div className="relative mb-5">
        {/* Ambient pulse glow */}
        <div className="absolute -inset-3 rounded-3xl bg-gradient-to-r from-primary/30 via-accent/30 to-purple-600/30 blur-xl animate-pulse" />

        {/* Logo Container with gentle float and pulse */}
        <div className="relative flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-card to-muted p-2.5 shadow-[0_12px_28px_-4px_rgba(0,0,0,0.18),inset_0_2px_0_rgba(255,255,255,0.4)] ring-1 ring-border/80 transition-transform">
          <img
            src="/logo.png"
            alt="Bethelincovibe TV"
            className="h-full w-full rounded-2xl object-contain animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite]"
          />
        </div>

        {/* Subtle spinning ring accent */}
        <div className="absolute -inset-1 rounded-3xl border-2 border-primary/20 border-t-primary animate-spin pointer-events-none" />
      </div>

      <div className="space-y-1 max-w-sm">
        <h3 className="text-sm sm:text-base font-extrabold text-foreground tracking-tight flex items-center justify-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-primary animate-bounce" />
          <span>{message}</span>
        </h3>
        {submessage && (
          <p className="text-xs text-muted-foreground font-medium truncate">
            {submessage}
          </p>
        )}
      </div>
    </div>
  );
}
