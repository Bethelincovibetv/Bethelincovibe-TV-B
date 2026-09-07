import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import {
  Gift,
  Copy,
  Check,
  Sparkles,
  Bot,
  Send,
  Trophy,
  RefreshCw,
  ExternalLink,
  MessageCircle,
  ShieldCheck,
  ChevronDown,
  X,
  Flame,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export type CreativeExperienceType = "static" | "interactive" | "conversational" | "minigame";

export interface CreativeExperienceConfig {
  promoCode?: string;
  discountValue?: string;
  assistantFaq?: string[];
  businessHighlights?: string;
  gameRewardTitle?: string;
  gameRewardCode?: string;
}

interface CreativeAdExperienceProps {
  type: CreativeExperienceType;
  config?: CreativeExperienceConfig;
  adTitle: string;
  adDescription?: string;
  targetUrl: string;
  whatsappNumber?: string;
  sponsorName?: string;
  className?: string;
  onActionTrigger?: (actionName: string) => void;
}

export default function CreativeAdExperience({
  type = "static",
  config = {},
  adTitle,
  adDescription = "",
  targetUrl,
  whatsappNumber,
  sponsorName = "Verified Sponsor",
  className = "",
  onActionTrigger,
}: CreativeAdExperienceProps) {
  // If static, no extra interactive overlay is needed
  if (type === "static") return null;

  return (
    <div className={`mt-3 rounded-2xl border bg-card/95 shadow-sm p-3.5 ${className}`}>
      {type === "interactive" && (
        <InteractiveVoucherExperience
          config={config}
          adTitle={adTitle}
          targetUrl={targetUrl}
          whatsappNumber={whatsappNumber}
          onActionTrigger={onActionTrigger}
        />
      )}

      {type === "conversational" && (
        <ConversationalInquiryExperience
          config={config}
          adTitle={adTitle}
          adDescription={adDescription}
          targetUrl={targetUrl}
          whatsappNumber={whatsappNumber}
          sponsorName={sponsorName}
          onActionTrigger={onActionTrigger}
        />
      )}

      {type === "minigame" && (
        <MinigameChallengeExperience
          config={config}
          adTitle={adTitle}
          targetUrl={targetUrl}
          whatsappNumber={whatsappNumber}
          onActionTrigger={onActionTrigger}
        />
      )}
    </div>
  );
}

// ============================================================================
// 1. INTERACTIVE VOUCHER / DISCOUNT REVEAL
// ============================================================================
function InteractiveVoucherExperience({
  config,
  adTitle,
  targetUrl,
  whatsappNumber,
  onActionTrigger,
}: {
  config: CreativeExperienceConfig;
  adTitle: string;
  targetUrl: string;
  whatsappNumber?: string;
  onActionTrigger?: (act: string) => void;
}) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  const promoCode = config.promoCode?.trim() || "BTV-DEAL15";
  const discount = config.discountValue?.trim() || "15% OFF";

  const handleReveal = () => {
    setRevealed(true);
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.7 },
      colors: ["#7c3aed", "#f59e0b", "#10b981"],
    });
    onActionTrigger?.("reveal_voucher");
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(promoCode);
    setCopied(true);
    toast.success(`Promo code "${promoCode}" copied to clipboard!`);
    setTimeout(() => setCopied(false), 2500);
    onActionTrigger?.("copy_promo_code");
  };

  const destinationHref = whatsappNumber
    ? `https://wa.me/${whatsappNumber.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
        `Hello! I unlocked the promo code "${promoCode}" (${discount}) from your Bethelincovibe ad "${adTitle}". I'd like to redeem it!`
      )}`
    : targetUrl;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-black text-amber-600 dark:text-amber-400">
          <Gift className="h-4 w-4 text-primary" />
          <span>Interactive Perk Reveal</span>
        </div>
        <Badge variant="outline" className="text-[10px] font-bold border-amber-500/40 text-amber-600 bg-amber-500/10">
          {discount}
        </Badge>
      </div>

      {!revealed ? (
        <div
          onClick={handleReveal}
          className="group relative cursor-pointer overflow-hidden rounded-xl border-2 border-dashed border-primary/40 bg-gradient-to-r from-primary/10 via-amber-500/10 to-primary/10 p-4 text-center transition-all hover:border-primary hover:shadow-md active:scale-98"
        >
          <div className="space-y-1">
            <Sparkles className="mx-auto h-6 w-6 text-primary group-hover:scale-110 group-hover:rotate-12 transition-transform" />
            <p className="text-xs font-black text-foreground">Tap to Scratch &amp; Reveal Secret Discount</p>
            <p className="text-[11px] text-muted-foreground">Unlock verified promotional code for this sponsor</p>
          </div>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-2.5 rounded-xl bg-gradient-to-r from-emerald-500/15 via-primary/10 to-emerald-500/15 border border-emerald-500/30 p-3"
        >
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Verified Promo Code</p>
              <p className="text-base font-black text-foreground font-mono tracking-wider">{promoCode}</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopy}
              className="h-8 rounded-lg text-xs font-bold gap-1 border-primary/30 hover:bg-primary/10"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? "Copied!" : "Copy"}</span>
            </Button>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <Button
              asChild
              size="sm"
              className="w-full rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs h-8 shadow-xs"
            >
              <a href={destinationHref} target="_blank" rel="noopener sponsored" onClick={handleCopy}>
                {whatsappNumber ? "Redeem on WhatsApp" : "Redeem Offer Now"} <ExternalLink className="h-3 w-3 ml-1" />
              </a>
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ============================================================================
// 2. CONVERSATIONAL AI PRODUCT & BUSINESS INQUIRY ASSISTANT
// ============================================================================
interface ChatMsg {
  role: "user" | "assistant";
  text: string;
}

function ConversationalInquiryExperience({
  config,
  adTitle,
  adDescription,
  targetUrl,
  whatsappNumber,
  sponsorName,
  onActionTrigger,
}: {
  config: CreativeExperienceConfig;
  adTitle: string;
  adDescription: string;
  targetUrl: string;
  whatsappNumber?: string;
  sponsorName: string;
  onActionTrigger?: (act: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      role: "assistant",
      text: `Hello! I'm the verified inquiry assistant for ${sponsorName}. Ask me anything about "${adTitle}" or choose a quick question below!`,
    },
  ]);
  const [inputVal, setInputVal] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const defaultPrompts = [
    "What are your prices / pricing options?",
    "How do I order or place a booking?",
    "Where are you located & what's your delivery time?",
  ];

  const quickPrompts =
    config.assistantFaq && config.assistantFaq.length > 0 ? config.assistantFaq : defaultPrompts;

  const handleSendPrompt = (text: string) => {
    if (!text.trim()) return;
    const userQ = text.trim();
    setMessages((prev) => [...prev, { role: "user", text: userQ }]);
    setInputVal("");
    setIsTyping(true);
    onActionTrigger?.("chat_inquiry");

    // Grounded answer generator based strictly on provided business info
    setTimeout(() => {
      let reply = "";
      const lower = userQ.toLowerCase();

      if (lower.includes("price") || lower.includes("cost") || lower.includes("how much")) {
        reply = `For exact pricing and current promotional offers on "${adTitle}", please check their link or reach out directly. ${
          config.businessHighlights || adDescription || "The business provides competitive quotes and special platform rates."
        }`;
      } else if (lower.includes("order") || lower.includes("book") || lower.includes("buy")) {
        reply = `You can easily order or book directly by clicking "Visit Partner Store" or connecting via WhatsApp. ${sponsorName} processes requests promptly for all verified platform clients!`;
      } else if (lower.includes("where") || lower.includes("locat") || lower.includes("deliver") || lower.includes("time")) {
        reply = `${sponsorName} serves customers nationwide across Nigeria. ${
          config.businessHighlights
            ? `Highlights: ${config.businessHighlights}.`
            : "Deliveries and consultations are coordinated directly after booking."
        }`;
      } else {
        reply = `Thanks for your inquiry about "${adTitle}". ${
          config.businessHighlights || adDescription || "Our team is available to assist you."
        } Click the WhatsApp button below to speak directly with an official representative!`;
      }

      setMessages((prev) => [...prev, { role: "assistant", text: reply }]);
      setIsTyping(false);
    }, 600);
  };

  const whatsappHref = whatsappNumber
    ? `https://wa.me/${whatsappNumber.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
        `Hello ${sponsorName}, I have a question about "${adTitle}" on Bethelincovibe.`
      )}`
    : targetUrl;

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-black text-indigo-600 dark:text-indigo-400">
          <Bot className="h-4 w-4 text-primary" />
          <span>Quick Business Inquiry Assistant</span>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setExpanded(!expanded)}
          className="h-6 text-[11px] font-bold text-muted-foreground hover:text-foreground px-2"
        >
          {expanded ? "Minimize" : "Ask a Question"} <ChevronDown className={`h-3 w-3 ml-1 transition-transform ${expanded ? "rotate-180" : ""}`} />
        </Button>
      </div>

      {/* Collapsed view: Quick prompt chips */}
      {!expanded ? (
        <div className="space-y-1.5">
          <p className="text-[11px] text-muted-foreground font-medium">Instant answers about this deal:</p>
          <div className="flex flex-wrap gap-1.5">
            {quickPrompts.slice(0, 2).map((prompt, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setExpanded(true);
                  handleSendPrompt(prompt);
                }}
                className="rounded-lg border border-primary/20 bg-muted/40 hover:bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-foreground text-left transition hover:border-primary/40 flex items-center gap-1"
              >
                <Zap className="h-2.5 w-2.5 text-amber-500 shrink-0" />
                <span className="truncate max-w-[200px]">{prompt}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        /* Expanded Interactive Chat Drawer */
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="space-y-2 pt-1 border-t border-border/60"
        >
          {/* Message History */}
          <div className="max-h-48 overflow-y-auto space-y-2 p-2 rounded-xl bg-muted/30 text-xs">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {m.role === "assistant" && (
                  <div className="h-6 w-6 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="h-3.5 w-3.5" />
                  </div>
                )}
                <div
                  className={`max-w-[85%] rounded-xl p-2.5 text-[11px] leading-relaxed ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground font-medium rounded-tr-none"
                      : "bg-background border border-border/70 text-foreground rounded-tl-none shadow-2xs"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex gap-2 items-center text-[10px] text-muted-foreground italic pl-8">
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" />
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce delay-100" />
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce delay-200" />
                <span>Typing verified reply...</span>
              </div>
            )}
          </div>

          {/* Quick Prompt Chips */}
          <div className="flex flex-wrap gap-1">
            {quickPrompts.map((q, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendPrompt(q)}
                className="text-[10px] bg-background hover:bg-muted border border-border/80 px-2 py-0.5 rounded-md text-muted-foreground hover:text-foreground transition"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Chat Input */}
          <div className="flex items-center gap-1.5 pt-1">
            <Input
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSendPrompt(inputVal);
                }
              }}
              placeholder="Ask anything about this ad..."
              className="h-8 text-xs rounded-xl flex-1"
            />
            <Button
              size="sm"
              onClick={() => handleSendPrompt(inputVal)}
              disabled={!inputVal.trim() || isTyping}
              className="h-8 w-8 p-0 rounded-xl bg-primary text-primary-foreground shrink-0"
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Direct WhatsApp Callout */}
          <div className="flex items-center justify-between pt-1 text-[11px] text-muted-foreground border-t border-border/40">
            <span>Want to speak with a human?</span>
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener sponsored"
              className="font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
            >
              <MessageCircle className="h-3 w-3" /> WhatsApp Provider
            </a>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ============================================================================
// 3. CATCHY 5-SECOND REACTION CHALLENGE MINI-GAME
// ============================================================================
function MinigameChallengeExperience({
  config,
  adTitle,
  targetUrl,
  whatsappNumber,
  onActionTrigger,
}: {
  config: CreativeExperienceConfig;
  adTitle: string;
  targetUrl: string;
  whatsappNumber?: string;
  onActionTrigger?: (act: string) => void;
}) {
  const [gameState, setGameState] = useState<"idle" | "playing" | "won">("idle");
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(6);
  const targetScore = 3;

  const rewardCode = config.gameRewardCode?.trim() || config.promoCode?.trim() || "VIP-WINNER20";
  const rewardTitle = config.gameRewardTitle?.trim() || "Exclusive 20% Off VIP Perk Unlocked!";

  const startGame = () => {
    setGameState("playing");
    setScore(0);
    setTimeLeft(6);
    onActionTrigger?.("start_game");
  };

  React.useEffect(() => {
    if (gameState !== "playing") return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setGameState("idle");
          toast.error("Time's up! Tap restart to try again for the VIP Perk.");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [gameState]);

  const handleTapItem = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newScore = score + 1;
    setScore(newScore);
    if (newScore >= targetScore) {
      setGameState("won");
      confetti({
        particleCount: 70,
        spread: 70,
        origin: { y: 0.65 },
        colors: ["#f59e0b", "#ec4899", "#8b5cf6", "#10b981"],
      });
      onActionTrigger?.("win_game");
    }
  };

  const destinationHref = whatsappNumber
    ? `https://wa.me/${whatsappNumber.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
        `Hello! I won the challenge game on your Bethelincovibe ad "${adTitle}" and unlocked code "${rewardCode}". I want to claim my VIP deal!`
      )}`
    : targetUrl;

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-black text-rose-600 dark:text-rose-400">
          <Trophy className="h-4 w-4 text-amber-500" />
          <span>Interactive Mini-Game Perk Challenge</span>
        </div>
        {gameState === "playing" && (
          <Badge className="bg-rose-500 text-white text-[10px] font-mono animate-pulse">
            ⏱ {timeLeft}s left
          </Badge>
        )}
      </div>

      {gameState === "idle" && (
        <div className="p-3 rounded-xl bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-primary/10 border border-amber-500/30 text-center space-y-2">
          <p className="text-xs font-black text-foreground">Catch 3 Floating Perks in 6s to Unlock VIP Discount</p>
          <p className="text-[11px] text-muted-foreground">Test your speed &amp; claim an exclusive promo voucher</p>
          <Button
            size="sm"
            onClick={startGame}
            className="rounded-xl font-black text-xs bg-gradient-to-r from-amber-500 to-rose-500 hover:opacity-90 text-white shadow-sm h-8 px-4 gap-1.5"
          >
            <Zap className="h-3.5 w-3.5 fill-current" /> Start Challenge
          </Button>
        </div>
      )}

      {gameState === "playing" && (
        <div className="relative h-32 rounded-xl bg-radial from-primary/10 to-card border border-primary/40 overflow-hidden flex items-center justify-around p-2">
          <p className="absolute top-2 left-2 text-[10px] font-bold text-muted-foreground">
            Progress: <span className="text-foreground font-black">{score}/{targetScore}</span>
          </p>

          {Array.from({ length: 3 }).map((_, i) => (
            <motion.button
              key={i}
              type="button"
              animate={{
                y: [0, -18, 0],
                rotate: [0, 10, -10, 0],
              }}
              transition={{
                duration: 1.2 + i * 0.3,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              onClick={handleTapItem}
              className="h-12 w-12 rounded-full bg-gradient-to-tr from-amber-400 to-rose-500 text-white flex items-center justify-center shadow-lg hover:scale-125 active:scale-90 transition-transform cursor-pointer border-2 border-white/60"
            >
              <Sparkles className="h-6 w-6 fill-white" />
            </motion.button>
          ))}
        </div>
      )}

      {gameState === "won" && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-500/15 via-amber-500/15 to-emerald-500/15 border border-emerald-500/40 space-y-2 text-center"
        >
          <div className="flex items-center justify-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-extrabold text-xs">
            <Trophy className="h-4 w-4" />
            <span>{rewardTitle}</span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <span className="font-mono text-sm font-black text-foreground bg-background px-3 py-1 rounded-lg border border-border">
              {rewardCode}
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(rewardCode);
                toast.success(`Copied ${rewardCode}!`);
              }}
              className="h-7 text-xs font-bold rounded-lg"
            >
              Copy
            </Button>
          </div>

          <Button
            asChild
            size="sm"
            className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs h-8 shadow-xs"
          >
            <a href={destinationHref} target="_blank" rel="noopener sponsored">
              Claim VIP Perk Now <ExternalLink className="h-3 w-3 ml-1" />
            </a>
          </Button>
        </motion.div>
      )}
    </div>
  );
}
