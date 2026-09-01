import { useState, useEffect, useRef } from "react";
import { Sparkles, ShieldCheck } from "lucide-react";

interface StartupSplashScreenProps {
  /** When true, essential services (e.g. auth check) have completed initialization */
  isReady?: boolean;
  /** Optional callback fired when the splash screen has completely faded out */
  onFinish?: () => void;
  /** Minimum time to display the splash screen in ms (default: 750ms) */
  minDurationMs?: number;
  /** Maximum safety timeout in ms to guarantee dismissal (default: 3500ms) */
  maxTimeoutMs?: number;
}

export default function StartupSplashScreen({
  isReady = true,
  onFinish,
  minDurationMs = 750,
  maxTimeoutMs = 3500,
}: StartupSplashScreenProps) {
  const [stage, setStage] = useState<"loading" | "finishing" | "gone">("loading");
  const [progress, setProgress] = useState(15);
  const [statusText, setStatusText] = useState("Initializing ecosystem...");
  const mountTimeRef = useRef<number>(Date.now());
  const dismissedRef = useRef<boolean>(false);

  useEffect(() => {
    if (dismissedRef.current) return;

    // Staged progress step 1
    const t1 = setTimeout(() => {
      if (!dismissedRef.current) {
        setProgress(45);
        setStatusText("Verifying secure connection...");
      }
    }, 250);

    // Staged progress step 2
    const t2 = setTimeout(() => {
      if (!dismissedRef.current) {
        setProgress(78);
        setStatusText("Synchronizing marketplace...");
      }
    }, 500);

    function dismiss() {
      if (dismissedRef.current) return;
      dismissedRef.current = true;
      setProgress(100);
      setStatusText("Welcome to Bethelincovibe TV");
      setStage("finishing");

      setTimeout(() => {
        setStage("gone");
        onFinish?.();
      }, 450); // Matches CSS transition duration
    }

    // Safety fallback timeout to ensure user is never locked out
    const safetyTimeout = setTimeout(() => {
      dismiss();
    }, maxTimeoutMs);

    if (isReady) {
      const elapsed = Date.now() - mountTimeRef.current;
      const remainingTime = Math.max(0, minDurationMs - elapsed);
      const readyTimer = setTimeout(() => {
        dismiss();
      }, remainingTime);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(readyTimer);
        clearTimeout(safetyTimeout);
      };
    }

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(safetyTimeout);
    };
  }, [isReady, minDurationMs, maxTimeoutMs, onFinish]);

  if (stage === "gone") {
    return null;
  }

  const isFinishing = stage === "finishing";

  return (
    <div
      id="app-startup-splash"
      role="status"
      aria-label="Loading Bethelincovibe TV"
      aria-live="polite"
      className={`fixed inset-0 z-[999999] flex flex-col items-center justify-between select-none overflow-hidden transition-all duration-450 ease-out ${
        isFinishing
          ? "opacity-0 scale-[1.04] pointer-events-none"
          : "opacity-100 scale-100 pointer-events-auto"
      } bg-[#0c0817] text-white`}
    >
      {/* Background ambient lighting */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-gradient-to-tr from-purple-900/35 via-primary/25 to-pink-600/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-primary/20 rounded-full blur-2xl" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-pink-600/20 rounded-full blur-2xl" />
        {/* Subtle grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)`,
            backgroundSize: "28px 28px",
          }}
        />
      </div>

      {/* Top Spacer for balance */}
      <div className="h-16 sm:h-20" />

      {/* Main Center Content */}
      <div className="relative z-10 flex flex-col items-center px-6 text-center max-w-sm sm:max-w-md w-full">
        {/* Animated Brand Shield & Logo */}
        <div className="relative mb-7 flex items-center justify-center">
          {/* Pulsing Aura Rings */}
          <div className="absolute -inset-6 rounded-full bg-gradient-to-tr from-primary/30 via-accent/30 to-purple-600/30 blur-2xl animate-pulse" />
          
          {/* Rotating Orbital Gradient Ring */}
          <div className="absolute -inset-3.5 rounded-full p-[2px] bg-gradient-to-r from-primary via-accent to-purple-500 animate-[spin_6s_linear_infinite] opacity-80">
            <div className="w-full h-full bg-[#0c0817] rounded-full" />
          </div>

          {/* Reverse Orbit Accent Dot */}
          <div className="absolute -inset-3.5 animate-[spin_4s_linear_infinite_reverse] pointer-events-none">
            <div className="w-2.5 h-2.5 rounded-full bg-accent shadow-[0_0_12px_#ec4899] -translate-x-1/2 left-1/2" />
          </div>

          {/* Logo Card with 3D Depth */}
          <div className="relative flex h-24 w-24 sm:h-28 sm:w-28 items-center justify-center rounded-3xl bg-gradient-to-b from-[#20153b] to-[#120a24] p-3 shadow-[0_20px_50px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.25)] ring-1 ring-white/15">
            <img
              src="/logo.png"
              alt="Bethelincovibe TV"
              className="h-full w-full object-contain rounded-2xl drop-shadow-[0_4px_12px_rgba(168,85,247,0.4)] animate-[pulse_3s_ease-in-out_infinite]"
            />
          </div>
        </div>

        {/* Brand Name & Tagline */}
        <div className="space-y-2 mb-6">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center justify-center gap-2">
            <span className="bg-gradient-to-r from-white via-purple-100 to-pink-200 bg-clip-text text-transparent">
              Bethelincovibe TV
            </span>
          </h1>
          <p className="text-xs sm:text-sm font-medium text-purple-200/75 tracking-wide">
            Lagos Business & Promotion Ecosystem
          </p>
        </div>

        {/* Progress Bar & Status Message */}
        <div className="w-full max-w-xs space-y-2.5">
          {/* Progress Track */}
          <div className="relative h-1.5 w-full bg-white/10 rounded-full overflow-hidden backdrop-blur-xs">
            <div
              className="h-full bg-gradient-to-r from-primary via-purple-400 to-accent rounded-full transition-all duration-300 ease-out shadow-[0_0_12px_rgba(236,72,153,0.8)]"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Status Label with Micro Animation */}
          <div className="flex items-center justify-between text-[11px] text-purple-300/80 font-medium px-0.5">
            <span className="flex items-center gap-1.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-accent" />
              </span>
              <span className="transition-opacity duration-200">{statusText}</span>
            </span>
            <span className="tabular-nums font-semibold text-white/90">{progress}%</span>
          </div>
        </div>
      </div>

      {/* Bottom Footer Details */}
      <div className="pb-8 text-center text-xs text-purple-300/50 flex flex-col items-center gap-1">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-purple-300/60">
          <ShieldCheck className="h-3.5 w-3.5 text-primary" />
          <span>Verified Lagos Business & Community Network</span>
        </div>
        <span className="text-[10px] text-purple-400/40">v2.4 • Fast & Secure Startup</span>
      </div>
    </div>
  );
}
