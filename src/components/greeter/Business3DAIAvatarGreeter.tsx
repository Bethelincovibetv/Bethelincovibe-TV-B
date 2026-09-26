import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Volume2,
  VolumeX,
  RotateCcw,
  FastForward,
  Sparkles,
  Send,
  Minimize2,
  HelpCircle,
  Phone,
  MessageCircle,
  ShieldCheck,
  Building2,
  MapPin,
  ShoppingBag,
  Clock,
  ArrowRight,
  ExternalLink,
  Award,
  CheckCircle2,
  Truck,
  Flame,
  Radio,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import Avatar3DStage, { AvatarAnimationState } from "./Avatar3DStage";
import { getHealthyGeminiClient } from "@/lib/multiApiKeyManager";

export interface BusinessGreeterInput {
  business_name?: string;
  name?: string;
  category?: string;
  categories?: { name?: string; slug?: string };
  short_description?: string;
  description?: string;
  key_products?: string[];
  products?: any[];
  services?: any[];
  custom_greeting_override?: string;
  voice_style?: "friendly" | "formal" | "energetic";
  city?: string;
  state?: string;
  phone?: string;
  whatsapp?: string;
  address?: string;
  verified?: boolean;
  logo_url?: string;
  website?: string;
  rating?: number;
  reviews_count?: number;
}

interface Business3DAIAvatarGreeterProps {
  business: BusinessGreeterInput;
  products?: any[];
  services?: any[];
  autoStart?: boolean;
  className?: string;
}

/**
 * Animated Sound Wave Equalizer
 * Displays rhythmic audio frequencies matching speech cadence for an executive feel.
 */
function VoiceWaveVisualizer({ isTalking }: { isTalking: boolean }) {
  const barHeights = [45, 80, 60, 95, 70, 100, 85, 65, 90, 75, 55, 40];

  return (
    <div className="flex items-center gap-1 h-6 px-2.5 py-1 rounded-full bg-black/40 border border-white/10 backdrop-blur-md">
      <Radio className={`h-3 w-3 ${isTalking ? "text-emerald-400 animate-pulse" : "text-slate-400"}`} />
      <span className="text-[10px] font-bold tracking-wider uppercase text-slate-300 mr-1 hidden sm:inline">
        {isTalking ? "Live Voice" : "Ready"}
      </span>
      <div className="flex items-center gap-0.5 h-4">
        {barHeights.map((h, i) => (
          <span
            key={i}
            className={`w-0.5 rounded-full transition-all duration-150 ${
              isTalking
                ? "bg-gradient-to-t from-amber-400 to-emerald-400"
                : "bg-slate-600 h-1.5"
            }`}
            style={
              isTalking
                ? {
                    height: `${Math.max(20, Math.min(100, h * (0.4 + Math.sin(Date.now() / 150 + i * 0.8) * 0.6)))}%`,
                    animationDelay: `${i * 60}ms`,
                  }
                : { height: "4px" }
            }
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Executive Corporate Virtual Host & Business Concierge
 * Designed with a high-end enterprise aesthetic, interactive voice synthesis,
 * real-time audio waveform visualizer, and instant executive actions.
 */
export default function Business3DAIAvatarGreeter({
  business,
  products = [],
  services = [],
  autoStart = true,
  className = "",
}: Business3DAIAvatarGreeterProps) {
  const [animState, setAnimState] = useState<AvatarAnimationState>("entrance");
  const [isTalking, setIsTalking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [subtitle, setSubtitle] = useState("");
  const [subtitleProgress, setSubtitleProgress] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);
  const [userQuestion, setUserQuestion] = useState("");
  const [isAnswering, setIsAnswering] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<
    Array<{ sender: "user" | "avatar"; text: string }>
  >([]);

  const synthRef = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const wordsIntervalRef = useRef<number | null>(null);
  const waveTickerRef = useRef<number | null>(null);
  const [, setTicker] = useState(0);

  const bizName = business.business_name || business.name || "Bethel Verified Enterprise";
  const bizCategory =
    business.category ||
    business.categories?.name ||
    "Verified Commercial Enterprise";
  const avatarGender = "female";
  const voiceStyle = business.voice_style || "formal";

  const keyItems = useMemo(() => {
    const list: string[] = [];
    if (products && products.length > 0) {
      products.slice(0, 3).forEach((p) => {
        if (p?.title || p?.name) list.push(p.title || p.name);
      });
    }
    if (services && services.length > 0) {
      services.slice(0, 2).forEach((s) => {
        const title = typeof s === "string" ? s : s?.title || s?.name;
        if (title) list.push(title);
      });
    }
    if (list.length === 0 && business.key_products) {
      list.push(...business.key_products.slice(0, 3));
    }
    return list;
  }, [products, services, business.key_products]);

  const defaultScript = useMemo(() => {
    if (business.custom_greeting_override) {
      return business.custom_greeting_override;
    }
    const location = [business.city, business.state].filter(Boolean).join(", ");
    const locationPart = location ? ` located in ${location}` : "";
    const itemsPart =
      keyItems.length > 0
        ? ` We specialize in certified ${keyItems.join(", ")}.`
        : ` We specialize in certified ${bizCategory} solutions.`;

    return `Welcome to ${bizName}${locationPart}. I am your verified digital concierge on Bethelincovibe TV.${itemsPart} You can inspect our verified catalog, review our CAC credentials, or connect with our leadership on WhatsApp. How may we assist your inquiry today?`;
  }, [bizName, bizCategory, business.custom_greeting_override, business.city, business.state, keyItems]);

  // High-frequency ticker to drive animated waveform when talking
  useEffect(() => {
    if (isTalking) {
      waveTickerRef.current = window.setInterval(() => {
        setTicker((t) => (t + 1) % 1000);
      }, 100);
    } else if (waveTickerRef.current) {
      clearInterval(waveTickerRef.current);
      waveTickerRef.current = null;
    }
    return () => {
      if (waveTickerRef.current) clearInterval(waveTickerRef.current);
    };
  }, [isTalking]);

  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      synthRef.current = window.speechSynthesis;
    }
    return () => {
      stopSpeaking();
    };
  }, []);

  useEffect(() => {
    const entranceTimer = setTimeout(() => {
      setAnimState("waving");
      if (autoStart) {
        const speechTimer = setTimeout(() => {
          speak(defaultScript);
        }, 1100);
        return () => clearTimeout(speechTimer);
      }
    }, 1400);

    return () => {
      clearTimeout(entranceTimer);
      stopSpeaking();
    };
  }, [defaultScript, autoStart]);

  const stopSpeaking = () => {
    if (wordsIntervalRef.current) {
      clearInterval(wordsIntervalRef.current);
      wordsIntervalRef.current = null;
    }
    if (synthRef.current) {
      synthRef.current.cancel();
    }
    setIsTalking(false);
    setAnimState("idle");
  };

  const speak = (textToSpeak: string, onComplete?: () => void) => {
    stopSpeaking();
    setSubtitle(textToSpeak);
    setSubtitleProgress(0);

    if (isMuted || !synthRef.current) {
      simulateMutedSubtitles(textToSpeak, onComplete);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utteranceRef.current = utterance;

    const voices = synthRef.current.getVoices();
    const naturalVoice =
      voices.find(
        (v) =>
          (v.lang.includes("en-NG") ||
            v.lang.includes("en-GB") ||
            v.lang.includes("en-US")) &&
          /female|samantha|victoria|karen|zira|fiona|natural/i.test(v.name)
      ) ||
      voices.find((v) => v.lang.startsWith("en")) ||
      voices[0];

    if (naturalVoice) utterance.voice = naturalVoice;

    utterance.rate = 0.98;
    utterance.pitch = 1.02;

    utterance.onstart = () => {
      setIsTalking(true);
      setAnimState("talking");
    };

    utterance.onboundary = (e) => {
      if (e.charIndex && textToSpeak.length > 0) {
        setSubtitleProgress(e.charIndex / textToSpeak.length);
      }
    };

    utterance.onend = () => {
      setIsTalking(false);
      setSubtitleProgress(1);
      setAnimState("idle");
      if (onComplete) onComplete();
    };

    utterance.onerror = () => {
      setIsTalking(false);
      setAnimState("idle");
      if (onComplete) onComplete();
    };

    try {
      synthRef.current.speak(utterance);
    } catch {
      simulateMutedSubtitles(textToSpeak, onComplete);
    }
  };

  const simulateMutedSubtitles = (text: string, onComplete?: () => void) => {
    setIsTalking(true);
    setAnimState("talking");
    const words = text.split(" ");
    let currentWord = 0;

    wordsIntervalRef.current = window.setInterval(() => {
      currentWord += 2;
      setSubtitleProgress(Math.min(1, currentWord / words.length));
      if (currentWord >= words.length) {
        if (wordsIntervalRef.current) {
          clearInterval(wordsIntervalRef.current);
          wordsIntervalRef.current = null;
        }
        setIsTalking(false);
        setAnimState("idle");
        if (onComplete) onComplete();
      }
    }, 320);
  };

  const handleToggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      if (subtitle) speak(subtitle);
    } else {
      setIsMuted(true);
      if (synthRef.current) synthRef.current.cancel();
      if (isTalking && subtitle) {
        simulateMutedSubtitles(subtitle);
      }
    }
  };

  const handleReplay = () => {
    speak(defaultScript);
  };

  const handleSkip = () => {
    stopSpeaking();
    setSubtitleProgress(1);
  };

  const handleAskQuestion = async (question: string) => {
    if (!question.trim() || isAnswering) return;
    setUserQuestion("");
    setIsAnswering(true);
    setConversationHistory((prev) => [...prev, { sender: "user", text: question }]);

    try {
      const ai = getHealthyGeminiClient();
      let answerText = "";

      if (ai) {
        const prompt = `You are the verified executive corporate concierge for "${bizName}", a verified Nigerian business in the category "${bizCategory}" on Bethelincovibe TV.
Business Details:
- Description: ${business.description || business.short_description || "Top rated verified supplier"}
- Address: ${business.address || ""} ${business.city || ""} ${business.state || "Nigeria"}
- Key Offerings: ${keyItems.join(", ") || "Certified products and services"}
- Phone: ${business.phone || ""}
- WhatsApp: ${business.whatsapp || ""}

Customer Question: "${question}"

Respond in a warm, polished, executive corporate tone in 1 to 2 crisp, elegant sentences. Highlight how the customer can place orders or connect with management on WhatsApp. Keep under 40 words.`;

        const res = await ai.models.generateContent({
          model: "gemini-3.8-flash",
          contents: prompt,
          config: {
            maxOutputTokens: 100,
            temperature: 0.6,
          },
        });

        answerText = res.text?.trim() || "";
      }

      if (!answerText) {
        const lowerQ = question.toLowerCase();
        if (lowerQ.includes("product") || lowerQ.includes("sell") || lowerQ.includes("offer")) {
          answerText = `At ${bizName}, our verified offerings include ${
            keyItems.join(", ") || "certified products and commercial services"
          }. You can browse our complete catalog below or chat on WhatsApp!`;
        } else if (lowerQ.includes("price") || lowerQ.includes("cost") || lowerQ.includes("quote")) {
          answerText = `Our pricing is competitive with verified buyer protection. You can review individual prices below or message our sales desk for wholesale quotes!`;
        } else if (lowerQ.includes("location") || lowerQ.includes("where") || lowerQ.includes("address")) {
          answerText = `We are based in ${
            [business.address, business.city, business.state].filter(Boolean).join(", ") || "Lagos, Nigeria"
          } and fulfill nationwide doorstep deliveries across Nigeria.`;
        } else if (lowerQ.includes("order") || lowerQ.includes("buy") || lowerQ.includes("whatsapp")) {
          answerText = `You can complete your order directly through our WhatsApp link or call our verified sales desk right here on Bethelincovibe TV!`;
        } else {
          answerText = `Thank you for your inquiry! At ${bizName}, our executive team is ready to serve you. Feel free to inspect our catalog or click WhatsApp to chat directly!`;
        }
      }

      setConversationHistory((prev) => [...prev, { sender: "avatar", text: answerText }]);
      speak(answerText);
    } catch {
      const fallbackMsg = `At ${bizName}, we pride ourselves on exceptional quality and reliable delivery. Please feel free to click WhatsApp to connect with our management directly!`;
      setConversationHistory((prev) => [...prev, { sender: "avatar", text: fallbackMsg }]);
      speak(fallbackMsg);
    } finally {
      setIsAnswering(false);
    }
  };

  const quickQuestions = [
    "⭐ What are your top verified offerings?",
    "📍 Where is your physical office located?",
    "💬 Can I order directly on WhatsApp?",
    "🚚 How does nationwide delivery work?",
  ];

  const waNumber = (business.whatsapp || business.phone || "").replace(/\D/g, "");
  const waUrl = waNumber ? `https://wa.me/${waNumber}?text=${encodeURIComponent(`Hello ${bizName}, I saw your verified profile on Bethelincovibe TV and would like to make an inquiry.`)}` : null;
  const phoneUrl = business.phone ? `tel:${business.phone}` : null;

  // Minimized floating launcher (Executive badge)
  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-3 duration-300">
        <button
          onClick={() => {
            setIsMinimized(false);
            handleReplay();
          }}
          className="group flex items-center gap-3 bg-slate-900/95 hover:bg-slate-800 text-white border border-amber-500/30 p-2 pr-4 rounded-full shadow-2xl backdrop-blur-md transition-all hover:scale-105 active:scale-95"
        >
          <div className="relative w-10 h-10 rounded-full bg-gradient-to-tr from-amber-500 to-amber-300 p-0.5 shadow-md">
            <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center text-amber-300">
              <Building2 className="h-5 w-5" />
            </div>
            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-slate-950" />
          </div>
          <div className="text-left">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-white">Executive Concierge</span>
              <Badge className="bg-emerald-500/20 text-emerald-300 border-0 text-[9px] px-1.5 py-0">
                Online
              </Badge>
            </div>
            <p className="text-[11px] text-slate-300 truncate max-w-[150px]">Inquire about {bizName}</p>
          </div>
        </button>
      </div>
    );
  }

  return (
    <div
      className={`relative rounded-3xl overflow-hidden border border-slate-700/60 bg-gradient-to-br from-slate-900 via-slate-900/95 to-slate-950 text-white shadow-2xl transition-all ${className}`}
    >
      {/* Executive Top Header Bar */}
      <div className="px-5 py-3.5 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 bg-white/5 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-amber-400 to-amber-200 p-0.5 shadow-md shrink-0">
            <div className="w-full h-full rounded-[14px] bg-slate-950 flex items-center justify-center overflow-hidden">
              {business.logo_url ? (
                <img
                  src={business.logo_url}
                  alt={bizName}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <Award className="h-5 w-5 text-amber-400" />
              )}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-slate-950" />
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-extrabold text-white tracking-tight">
                Official Business Concierge
              </span>
              <Badge className="bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-bold px-2 py-0.5">
                <ShieldCheck className="h-3 w-3 mr-1 text-amber-400" /> Verified Host
              </Badge>
              <Badge className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5">
                Buyer Protected
              </Badge>
            </div>
            <p className="text-xs text-slate-300 line-clamp-1 mt-0.5">
              Representing <span className="font-semibold text-white">{bizName}</span> • Instant Voice &amp; Interactive Guidance
            </p>
          </div>
        </div>

        {/* Audio Visualizer & Control Actions */}
        <div className="flex items-center gap-2">
          <VoiceWaveVisualizer isTalking={isTalking} />

          <Button
            size="sm"
            variant="ghost"
            onClick={handleToggleMute}
            className={`h-8 w-8 p-0 rounded-xl ${
              isMuted
                ? "text-rose-400 hover:bg-rose-500/20"
                : "text-amber-400 hover:bg-amber-500/20"
            }`}
            title={isMuted ? "Unmute Voice" : "Mute Voice"}
          >
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={handleReplay}
            className="h-8 w-8 p-0 rounded-xl text-slate-300 hover:text-white hover:bg-white/10"
            title="Replay Introduction"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>

          {isTalking && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleSkip}
              className="h-8 px-2.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 text-xs font-bold gap-1"
              title="Skip Speech"
            >
              <FastForward className="h-3.5 w-3.5" /> Skip
            </Button>
          )}

          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsMinimized(true)}
            className="h-8 w-8 p-0 rounded-xl text-slate-400 hover:text-white hover:bg-white/10"
            title="Minimize to Corner"
          >
            <Minimize2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main Body: 3D Host Stage & Executive Response Center */}
      <div className="grid grid-cols-1 md:grid-cols-12 items-center">
        {/* Left Column: 3D Stage with Podium */}
        <div className="md:col-span-5 relative h-72 sm:h-80 md:h-96 w-full flex items-center justify-center overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(217,119,6,0.12),transparent_70%)] pointer-events-none" />

          {/* Three.js Virtual Host */}
          <Avatar3DStage
            animState={animState}
            isTalking={isTalking}
            speechVolumeLevel={isTalking ? 0.8 : 0}
            voiceStyle={voiceStyle}
            avatarGender={avatarGender}
            className="w-full h-full"
          />

          {/* Live Host Status Badge */}
          <div className="absolute top-3 left-3 z-10">
            {isTalking ? (
              <Badge className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold backdrop-blur-md flex items-center gap-1.5 shadow-sm">
                <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
                Speaking with Client...
              </Badge>
            ) : (
              <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold backdrop-blur-md flex items-center gap-1.5 shadow-sm">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Executive Host Ready
              </Badge>
            )}
          </div>
        </div>

        {/* Right Column: Subtitles, Direct Connect Actions, and Q&A */}
        <div className="md:col-span-7 p-5 sm:p-6 space-y-4 flex flex-col justify-between">
          {/* Subtitles / Speech Box */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[11px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> Live Executive Briefing
              </span>
              <span className="text-[11px] text-slate-400">
                {isMuted ? "Sound Muted (Subtitles Active)" : "Voice Broadcast Enabled"}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/80 border border-white/10 shadow-inner min-h-[82px] flex flex-col justify-center">
              <p className="text-xs sm:text-sm text-slate-100 font-medium leading-relaxed">
                "{subtitle || defaultScript}"
              </p>
              {isTalking && (
                <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden mt-2.5">
                  <div
                    className="bg-gradient-to-r from-amber-400 via-amber-300 to-emerald-400 h-full transition-all duration-300"
                    style={{ width: `${Math.round(subtitleProgress * 100)}%` }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Fast Executive Connection Chips */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {waUrl && (
              <Button
                asChild
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md gap-1.5 h-9"
              >
                <a href={waUrl} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="h-3.5 w-3.5" /> WhatsApp Desk
                </a>
              </Button>
            )}

            {phoneUrl && (
              <Button
                asChild
                size="sm"
                variant="outline"
                className="bg-white/5 hover:bg-white/10 border-white/15 text-white font-bold text-xs rounded-xl gap-1.5 h-9"
              >
                <a href={phoneUrl}>
                  <Phone className="h-3.5 w-3.5 text-amber-400" /> Call Office
                </a>
              </Button>
            )}

            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const catalogEl = document.getElementById("catalog-section") || document.getElementById("products-tab");
                if (catalogEl) {
                  catalogEl.scrollIntoView({ behavior: "smooth" });
                } else {
                  handleAskQuestion("What products and services do you offer?");
                }
              }}
              className="bg-white/5 hover:bg-white/10 border-white/15 text-white font-bold text-xs rounded-xl gap-1.5 h-9 col-span-2 sm:col-span-1"
            >
              <ShoppingBag className="h-3.5 w-3.5 text-blue-400" /> View Catalog
            </Button>
          </div>

          {/* Quick Questions Chips */}
          <div className="space-y-1.5 pt-1">
            <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1">
              <HelpCircle className="h-3.5 w-3.5 text-amber-400" /> Popular Inquiries
            </span>
            <div className="flex flex-wrap gap-1.5">
              {quickQuestions.map((q, idx) => (
                <button
                  key={idx}
                  type="button"
                  disabled={isAnswering}
                  onClick={() => handleAskQuestion(q)}
                  className="text-[11px] font-medium px-3 py-1 rounded-xl bg-white/5 hover:bg-amber-500/20 border border-white/10 hover:border-amber-500/40 text-slate-200 hover:text-white transition-all disabled:opacity-50 text-left"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Ask AI Input Field */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAskQuestion(userQuestion);
            }}
            className="flex items-center gap-2 pt-1"
          >
            <Input
              value={userQuestion}
              onChange={(e) => setUserQuestion(e.target.value)}
              placeholder={`Ask anything about ${bizName}'s products, location, or delivery...`}
              disabled={isAnswering}
              className="bg-slate-950/80 border-white/15 text-white placeholder:text-slate-400 text-xs rounded-xl h-10 shadow-inner focus:border-amber-400/60"
            />
            <Button
              type="submit"
              disabled={isAnswering || !userQuestion.trim()}
              className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black px-4 rounded-xl text-xs h-10 shadow-md gap-1 shrink-0"
            >
              {isAnswering ? (
                <Sparkles className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  Ask <Send className="h-3.5 w-3.5" />
                </>
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
