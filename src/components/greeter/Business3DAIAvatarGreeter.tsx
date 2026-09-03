import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Volume2,
  VolumeX,
  RotateCcw,
  FastForward,
  MessageSquare,
  Sparkles,
  Send,
  X,
  Maximize2,
  Minimize2,
  Bot,
  User,
  ShoppingBag,
  HelpCircle,
  Phone,
  MessageCircle,
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
}

interface Business3DAIAvatarGreeterProps {
  business: BusinessGreeterInput;
  products?: any[];
  services?: any[];
  autoStart?: boolean;
  avatarGender?: "female" | "male";
  onContactWhatsApp?: () => void;
  className?: string;
}

export default function Business3DAIAvatarGreeter({
  business,
  products = [],
  services = [],
  autoStart = true,
  avatarGender = "female",
  onContactWhatsApp,
  className = "",
}: Business3DAIAvatarGreeterProps) {
  // Normalize business metadata
  const bizName = business.business_name || business.name || "Our Business";
  const bizCategory =
    business.category || business.categories?.name || "Premium Commerce";
  const rawDescription = business.short_description || business.description || "";
  const bizDesc =
    rawDescription.length > 200
      ? rawDescription.slice(0, 195) + "..."
      : rawDescription;

  // Extract products/services
  const keyItems = useMemo(() => {
    if (business.key_products && business.key_products.length > 0) {
      return business.key_products;
    }
    const fromProds = products.map((p) => p.title || p.name).filter(Boolean);
    const fromServs = services
      .map((s) => (typeof s === "string" ? s : s.title || s.name))
      .filter(Boolean);
    const combined = [...fromProds, ...fromServs];
    return combined.slice(0, 4);
  }, [business.key_products, products, services]);

  const voiceStyle = business.voice_style || "friendly";

  // Build natural, engaging welcoming speech
  const defaultScript = useMemo(() => {
    if (business.custom_greeting_override) {
      return business.custom_greeting_override;
    }
    const intro = `Welcome to ${bizName}! I'm your 3D virtual assistant. We specialize in ${bizCategory}.`;
    const descPart = bizDesc
      ? ` ${bizDesc}`
      : " We take great pride in delivering verified quality and authentic customer service.";
    const productPart =
      keyItems.length > 0
        ? ` Some of our most popular offerings include ${keyItems.join(", ")}.`
        : "";
    const cta = " Feel free to explore our catalog, or ask me anything about our products, pricing, or orders!";
    return `${intro}${descPart}${productPart}${cta}`;
  }, [bizName, bizCategory, bizDesc, keyItems, business.custom_greeting_override]);

  // States
  const [isOpen, setIsOpen] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [animState, setAnimState] = useState<AvatarAnimationState>("entrance");
  const [isTalking, setIsTalking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [subtitle, setSubtitle] = useState("");
  const [subtitleProgress, setSubtitleProgress] = useState(0); // 0 to 1

  // Interactive Question-Answering state
  const [showQAPanel, setShowQAPanel] = useState(false);
  const [userQuery, setUserQuery] = useState("");
  const [isAnswering, setIsAnswering] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<
    { sender: "avatar" | "user"; text: string }[]
  >([]);

  const synthRef = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const wordsIntervalRef = useRef<number | null>(null);

  // Initialize SpeechSynthesis safely
  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      synthRef.current = window.speechSynthesis;
    }
    return () => {
      stopSpeaking();
    };
  }, []);

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

  /**
   * Speak text with real-time lip-sync, subtitle highlighting, and audio controls
   */
  const speak = (textToSpeak: string, onComplete?: () => void) => {
    stopSpeaking();
    setSubtitle(textToSpeak);
    setSubtitleProgress(0);

    if (isMuted || !synthRef.current) {
      // Muted simulation: display subtitles with word cadence for accessibility
      simulateMutedSubtitles(textToSpeak, onComplete);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utteranceRef.current = utterance;

    // Pick best voice for style and clarity
    const voices = synthRef.current.getVoices();
    const naturalVoice =
      voices.find(
        (v) =>
          (v.lang.includes("en-NG") ||
            v.lang.includes("en-GB") ||
            v.lang.includes("en-US")) &&
          (avatarGender === "female"
            ? /female|samantha|victoria|karen|zira|fiona/i.test(v.name)
            : /male|daniel|george|alex|david/i.test(v.name))
      ) ||
      voices.find((v) => v.lang.startsWith("en")) ||
      voices[0];

    if (naturalVoice) utterance.voice = naturalVoice;

    if (voiceStyle === "energetic") {
      utterance.rate = 1.1;
      utterance.pitch = 1.15;
    } else if (voiceStyle === "formal") {
      utterance.rate = 0.95;
      utterance.pitch = 0.95;
    } else {
      // friendly
      utterance.rate = 1.02;
      utterance.pitch = 1.05;
    }

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
    } catch (e) {
      console.warn("SpeechSynthesis error, falling back to simulated subtitles:", e);
      simulateMutedSubtitles(textToSpeak, onComplete);
    }
  };

  /**
   * Accessible subtitle timer when audio is muted or unavailable
   */
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
    }, 380);
  };

  // Trigger entrance sequence on load
  useEffect(() => {
    if (!autoStart || hasStarted) return;
    setHasStarted(true);

    // 1. Entrance animation (steps onto spotlight stage)
    setAnimState("entrance");

    // 2. Wave and start speaking after step-forward
    const timer = setTimeout(() => {
      setAnimState("waving");
      speak(defaultScript, () => {
        setAnimState("idle");
      });
    }, 1200);

    return () => clearTimeout(timer);
  }, [autoStart, defaultScript, hasStarted]);

  // Replay greeting
  const handleReplay = () => {
    setAnimState("waving");
    setTimeout(() => {
      speak(defaultScript);
    }, 400);
  };

  // Skip speaking
  const handleSkip = () => {
    stopSpeaking();
  };

  // Toggle Mute
  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (nextMuted && isTalking) {
      if (synthRef.current) synthRef.current.cancel();
      simulateMutedSubtitles(subtitle);
    }
  };

  // Interactive Question Handling via Gemini AI
  const handleAskQuestion = async (queryText?: string) => {
    const question = (queryText || userQuery).trim();
    if (!question || isAnswering) return;

    setUserQuery("");
    setIsAnswering(true);
    stopSpeaking();

    // Add question to conversation history
    setConversationHistory((prev) => [...prev, { sender: "user", text: question }]);

    try {
      const geminiInstance = await getHealthyGeminiClient("greeter_ai");

      let answerText = "";
      if (geminiInstance) {
        const prompt = `You are the polite, professional 3D virtual shop attendant and customer concierge for "${bizName}".
Business Information:
- Category: ${bizCategory}
- Description: ${bizDesc}
- Featured Products/Services: ${keyItems.join(", ") || "Custom goods and verified catalog items"}
- Location: ${[business.address, business.city, business.state].filter(Boolean).join(", ") || "Lagos, Nigeria"}
- WhatsApp Available: ${business.whatsapp || business.phone ? "Yes" : "No"}

Visitor Question: "${question}"

Instructions:
Respond as the friendly, in-person shop attendant greeting the customer.
Give a clear, warm, 1 to 2 sentence answer.
Be helpful and concise because your answer will be spoken out loud via text-to-speech. Do not use bullet points or formatting symbols.`;

        const res = await geminiInstance.client.models.generateContent({
          model: "gemini-3.8-flash",
          contents: prompt,
          config: {
            maxOutputTokens: 120,
            temperature: 0.7,
          },
        });

        answerText = res.text?.trim() || "";
      }

      // Safe fallback if API key is not ready or network delay
      if (!answerText) {
        const lowerQ = question.toLowerCase();
        if (lowerQ.includes("product") || lowerQ.includes("sell") || lowerQ.includes("offer")) {
          answerText = `At ${bizName}, we specialize in ${bizCategory}. Our top items include ${
            keyItems.join(", ") || "high-demand verified products"
          }. You can browse our full catalog right below!`;
        } else if (lowerQ.includes("price") || lowerQ.includes("cost") || lowerQ.includes("how much")) {
          answerText = `Our prices are competitive and transparent. You can inspect all items directly in our listed catalog or message our team on WhatsApp for wholesale pricing!`;
        } else if (lowerQ.includes("location") || lowerQ.includes("where") || lowerQ.includes("address")) {
          answerText = `We are based in ${
            [business.address, business.city, business.state].filter(Boolean).join(", ") || "Lagos, Nigeria"
          }. We also provide nationwide courier delivery across Nigeria!`;
        } else if (lowerQ.includes("order") || lowerQ.includes("buy") || lowerQ.includes("whatsapp")) {
          answerText = `You can place an order immediately by clicking the WhatsApp or Call buttons right here on our verified profile page!`;
        } else {
          answerText = `Thank you for asking! At ${bizName}, we are always thrilled to serve you. Feel free to explore our verified inventory or message us directly on WhatsApp!`;
        }
      }

      setConversationHistory((prev) => [...prev, { sender: "avatar", text: answerText }]);
      speak(answerText);
    } catch (err) {
      console.warn("AI Greeter Q&A error:", err);
      const fallbackMsg = `At ${bizName}, we are dedicated to top quality. Please feel free to inspect our products or click WhatsApp to chat directly with our owner!`;
      setConversationHistory((prev) => [...prev, { sender: "avatar", text: fallbackMsg }]);
      speak(fallbackMsg);
    } finally {
      setIsAnswering(false);
    }
  };

  const quickQuestions = [
    "What are your top products?",
    "Where are you located?",
    "How do I order on WhatsApp?",
    "Do you deliver nationwide?",
  ];

  // If minimized, display elegant floating corner launcher
  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
        <button
          onClick={() => {
            setIsMinimized(false);
            setIsOpen(true);
            handleReplay();
          }}
          className="group relative flex items-center gap-3 bg-neutral-950/90 hover:bg-neutral-900 border-2 border-amber-500/50 p-2 pr-4 rounded-full shadow-2xl backdrop-blur-md transition-all hover:scale-105 active:scale-95 text-white"
        >
          <div className="relative w-11 h-11 rounded-full bg-gradient-to-tr from-amber-500 to-orange-500 p-0.5 overflow-hidden ring-2 ring-amber-400/40">
            <div className="w-full h-full rounded-full bg-neutral-900 flex items-center justify-center text-amber-400">
              <Bot className="h-6 w-6" />
            </div>
            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-neutral-950" />
          </div>
          <div className="text-left">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-amber-400">3D AI Concierge</span>
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[9px] px-1 py-0">
                Online
              </Badge>
            </div>
            <p className="text-[11px] text-neutral-300">Click to ask about {bizName}</p>
          </div>
        </button>
      </div>
    );
  }

  return (
    <div
      className={`relative rounded-3xl overflow-hidden border-2 border-amber-500/40 bg-gradient-to-b from-neutral-950 via-neutral-900 to-neutral-950 text-white shadow-2xl transition-all ${className}`}
    >
      {/* Top Header Bar */}
      <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between bg-white/5 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-neutral-950 font-black shadow-md">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-black text-white">
                3D AI Concierge &amp; Virtual Attendant
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-300 bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 rounded-full">
                <Sparkles className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
                Live 3D Lip-Sync
              </span>
            </div>
            <p className="text-[11px] text-neutral-400">
              Introducing {bizName} • Ask questions verbally or by text
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          {/* Mute/Unmute */}
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

          {/* Replay */}
          <Button
            size="sm"
            variant="ghost"
            onClick={handleReplay}
            className="h-8 w-8 p-0 rounded-xl text-neutral-300 hover:text-white hover:bg-white/10"
            title="Replay Greeting"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>

          {/* Skip Speech */}
          {isTalking && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleSkip}
              className="h-8 px-2 rounded-xl text-neutral-300 hover:text-white hover:bg-white/10 text-xs font-bold gap-1"
              title="Skip Speech"
            >
              <FastForward className="h-3.5 w-3.5" /> Skip
            </Button>
          )}

          {/* Minimize / Dock to corner */}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsMinimized(true)}
            className="h-8 w-8 p-0 rounded-xl text-neutral-400 hover:text-white hover:bg-white/10"
            title="Dock to Corner"
          >
            <Minimize2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main Grid Body: 3D Stage & Interactive Greeting Panel */}
      <div className="grid grid-cols-1 md:grid-cols-12 items-center">
        {/* Left Column: 3D Stage & Spotlight (360px height) */}
        <div className="md:col-span-5 relative h-72 sm:h-80 md:h-96 w-full flex items-center justify-center overflow-hidden bg-radial from-neutral-900/60 to-neutral-950">
          {/* Glowing Stage Halo Background */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.15),transparent_65%)] pointer-events-none" />

          {/* Render 3D Humanoid Avatar */}
          <Avatar3DStage
            animState={animState}
            isTalking={isTalking}
            speechVolumeLevel={isTalking ? 0.75 : 0}
            voiceStyle={voiceStyle}
            avatarGender={avatarGender}
            className="w-full h-full"
          />

          {/* Speaking Status Pill */}
          <div className="absolute top-3 left-3 z-10">
            {isTalking ? (
              <Badge className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold backdrop-blur-md flex items-center gap-1.5 animate-pulse">
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                Speaking...
              </Badge>
            ) : (
              <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold backdrop-blur-md flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Listening &amp; Ready
              </Badge>
            )}
          </div>
        </div>

        {/* Right Column: Subtitles, Greeting Speech, and Ask AI Panel */}
        <div className="md:col-span-7 p-4 sm:p-6 space-y-4 flex flex-col justify-between">
          {/* Live Captions / Subtitles Area */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400">
                Live Subtitles
              </span>
              <span className="text-[10px] text-neutral-400">
                {isMuted ? "Sound Off (Captions Active)" : "Voice Enabled"}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-neutral-900/90 border border-white/10 shadow-inner min-h-[76px] flex flex-col justify-center">
              <p className="text-xs sm:text-sm text-neutral-100 font-medium leading-relaxed">
                "{subtitle || defaultScript}"
              </p>
              {/* Progress bar underneath subtitles */}
              {isTalking && (
                <div className="w-full bg-neutral-800 h-1 rounded-full overflow-hidden mt-2">
                  <div
                    className="bg-gradient-to-r from-amber-400 to-orange-500 h-full transition-all duration-300"
                    style={{ width: `${Math.round(subtitleProgress * 100)}%` }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Quick Questions Chips */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-neutral-300 flex items-center gap-1">
              <HelpCircle className="h-3.5 w-3.5 text-amber-400" /> Quick Questions
            </span>
            <div className="flex flex-wrap gap-1.5">
              {quickQuestions.map((q, idx) => (
                <button
                  key={idx}
                  type="button"
                  disabled={isAnswering}
                  onClick={() => handleAskQuestion(q)}
                  className="text-[11px] font-medium px-2.5 py-1 rounded-xl bg-white/5 hover:bg-amber-500/20 border border-white/10 hover:border-amber-500/40 text-neutral-200 hover:text-white transition-all disabled:opacity-50 text-left"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Question Input Box */}
          <div className="pt-2 border-t border-white/10 space-y-2">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  value={userQuery}
                  onChange={(e) => setUserQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAskQuestion();
                    }
                  }}
                  disabled={isAnswering}
                  placeholder={`Ask me anything about ${bizName}...`}
                  className="bg-neutral-900 border-white/20 text-white placeholder:text-neutral-500 text-xs sm:text-sm rounded-xl h-10 pr-10 focus-visible:ring-amber-500/50"
                />
              </div>
              <Button
                onClick={() => handleAskQuestion()}
                disabled={!userQuery.trim() || isAnswering}
                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-90 text-neutral-950 font-black h-10 px-4 rounded-xl shrink-0"
              >
                {isAnswering ? (
                  <Sparkles className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>

            {/* Direct WhatsApp Callout */}
            {business.whatsapp && (
              <div className="flex items-center justify-between pt-1 text-[11px] text-neutral-400">
                <span>Want direct human contact?</span>
                <a
                  href={`https://wa.me/${business.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(
                    `Hello ${bizName}, I spoke with your 3D Virtual Attendant on Bethelincovibe TV and want to make an inquiry!`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-bold text-emerald-400 hover:underline"
                >
                  <MessageCircle className="h-3 w-3" /> Chat on WhatsApp
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
