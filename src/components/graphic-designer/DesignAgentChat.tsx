import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Sparkles,
  Send,
  Mic,
  MicOff,
  Image as ImageIcon,
  Paperclip,
  RotateCcw,
  Zap,
  HelpCircle,
  ShieldCheck,
  Palette,
  Layers,
  Smartphone,
  Tag,
  CheckCircle2,
  Phone,
  Wand2,
  Bot,
  User,
  ArrowRight,
  Flame,
  Plus,
  Download,
  Maximize2,
  Share2,
  Copy,
  Check,
  ExternalLink,
  Eye,
  RefreshCw,
  X,
  ZoomIn,
} from "lucide-react";
import { toast } from "sonner";
import {
  AgentChatMessage,
  processAgentUserMessage,
  AGENT_INDUSTRY_STARTERS,
} from "@/lib/designAgentAssistant";
import {
  LocalGraphicOptions,
  StockPhotoAsset,
  AI_IMPROVEMENT_PRESETS,
  AIImprovementPresetKey,
  renderLocalGraphicDesign,
  GRAPHIC_FORMATS,
  GRAPHIC_THEMES,
} from "@/lib/localGraphicEngine";

interface DesignAgentChatProps {
  currentOptions: LocalGraphicOptions;
  onOptionsChange: (newOptions: LocalGraphicOptions) => void;
  onApplyImprovementPreset: (presetKey: AIImprovementPresetKey) => void;
  onCustomImageUploaded?: (dataUrl: string) => void;
  businessName?: string;
  walletBalance?: number | null;
  isRendering?: boolean;
}

export default function DesignAgentChat({
  currentOptions,
  onOptionsChange,
  onApplyImprovementPreset,
  onCustomImageUploaded,
  businessName,
  walletBalance,
  isRendering,
}: DesignAgentChatProps) {
  const [messages, setMessages] = useState<AgentChatMessage[]>([
    {
      id: "welcome",
      sender: "agent",
      text: `Hello! I'm Maya Sterling, your Senior AI Creative Director. 🎨\n\nI can design and edit your commercial flyer, WhatsApp story, or marketing banner in seconds. You don't need any design experience — simply type or talk to me like a human!`,
      timestamp: Date.now(),
      actionBadges: [
        { label: "Maya AI Creative Director", type: "layout" },
        { label: "Zero Design Skills Needed", type: "theme" },
      ],
      suggestedActions: [
        { label: "👗 Fashion Boutique Sale", prompt: "Make a luxury fashion flyer for designer dresses with 30% discount" },
        { label: "🍲 Food & Restaurant Promo", prompt: "Create a food flyer for Smoky Jollof & Turkey combos at ₦6,500" },
        { label: "🏢 Real Estate Duplex", prompt: "Design a luxury real estate flyer for a 4-Bedroom Duplex in Lekki" },
        { label: "⚡ 5kVA Solar Package", prompt: "Create a tech flyer for 5kVA Solar Inverter installation at ₦1,250,000" },
      ],
    },
  ]);

  const [inputVal, setInputVal] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isAgentTyping, setIsAgentTyping] = useState(false);
  const [typingStatus, setTypingStatus] = useState("Maya is analyzing your brief...");
  const [enlargedImageUrl, setEnlargedImageUrl] = useState<string | null>(null);
  const [enlargedTitle, setEnlargedTitle] = useState<string>("Commercial Graphic Preview");

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const recognitionRef = useRef<any>(null);

  // Generate initial preview image for the welcome message if not already present
  useEffect(() => {
    let isMounted = true;
    async function loadInitialWelcomePreview() {
      try {
        const previewUrl = await renderLocalGraphicDesign(currentOptions);
        if (isMounted) {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === "welcome" && !msg.previewImage
                ? {
                    ...msg,
                    previewImage: previewUrl,
                    formatKey: currentOptions.formatKey,
                    layoutArchetype: currentOptions.layoutArchetype,
                    themeStyle: currentOptions.themeStyle,
                    headline: currentOptions.headline,
                  }
                : msg
            )
          );
        }
      } catch (e) {
        console.error("Initial preview render error:", e);
      }
    }
    loadInitialWelcomePreview();
    return () => {
      isMounted = false;
    };
  }, []);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isAgentTyping]);

  // Web Speech API for voice dictation
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recog = new SpeechRecognition();
      recog.continuous = false;
      recog.interimResults = false;
      recog.lang = "en-NG"; // Nigerian English dialect preference
      recog.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInputVal(transcript);
          handleSend(transcript);
        }
        setIsListening(false);
      };
      recog.onerror = () => {
        setIsListening(false);
      };
      recog.onend = () => {
        setIsListening(false);
      };
      recognitionRef.current = recog;
    }
  }, [currentOptions]);

  const toggleVoiceDictation = () => {
    if (!recognitionRef.current) {
      toast.info("Voice input is not supported in this browser. Please type your message.");
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
        toast.info("🎙️ Listening... speak your design request!");
      } catch (e) {
        setIsListening(false);
      }
    }
  };

  // Download high-resolution flyer image from chat
  const handleDownloadPreview = (dataUrl: string, title?: string) => {
    try {
      const link = document.createElement("a");
      const safeTitle = (title || "flyer")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-")
        .slice(0, 30);
      link.download = `${safeTitle}-${Date.now()}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Downloaded High-Res Graphic Flyer (PNG)!");
    } catch (e) {
      toast.error("Failed to download image.");
    }
  };

  // Handle Send Message & render graphic into the chat
  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || inputVal).trim();
    if (!query) return;

    // 1. Add user message
    const userMsg: AgentChatMessage = {
      id: `user_${Date.now()}`,
      sender: "user",
      text: query,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputVal("");
    setIsAgentTyping(true);
    setTypingStatus("Maya is understanding your design brief...");

    try {
      // Step 1: Process with Maya Intelligent Agent
      const result = processAgentUserMessage(query, currentOptions, businessName);

      setTypingStatus("Applying optical layout, typography & color hierarchy...");

      // Step 2: Render full high-resolution canvas preview directly
      const renderedPreviewUrl = await renderLocalGraphicDesign(result.updatedOptions);

      // Step 3: Apply changes to parent state for studio sync
      onOptionsChange(result.updatedOptions);

      // Step 4: Add Agent reply with embedded graphic preview
      const agentMsg: AgentChatMessage = {
        id: `agent_${Date.now()}`,
        sender: "agent",
        text: result.agentReply,
        timestamp: Date.now(),
        previewImage: renderedPreviewUrl,
        formatKey: result.updatedOptions.formatKey,
        layoutArchetype: result.updatedOptions.layoutArchetype,
        themeStyle: result.updatedOptions.themeStyle,
        headline: result.updatedOptions.headline,
        priceTag: result.updatedOptions.priceTag,
        actionBadges: result.actionBadges,
        suggestedActions: result.suggestedActions,
        appliedChanges: result.appliedChanges,
      };

      setMessages((prev) => [...prev, agentMsg]);
    } catch (error) {
      console.error("Agent process error:", error);
      toast.error("Could not complete design rendering. Please try again.");
    } finally {
      setIsAgentTyping(false);
    }
  };

  // Handle Photo / Logo Upload via Chat
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const dataUrl = evt.target?.result as string;
      if (onCustomImageUploaded) {
        onCustomImageUploaded(dataUrl);
      }

      // Add as conversation event
      const userMsg: AgentChatMessage = {
        id: `upload_${Date.now()}`,
        sender: "user",
        text: `Attached custom image file: "${file.name}"`,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setIsAgentTyping(true);
      setTypingStatus(`Mounting "${file.name}" into active design mask...`);

      const updated = {
        ...currentOptions,
        stockImageUrl: dataUrl,
        stockAsset: undefined,
      };

      try {
        const previewUrl = await renderLocalGraphicDesign(updated);
        onOptionsChange(updated);

        const agentReply: AgentChatMessage = {
          id: `agent_upload_${Date.now()}`,
          sender: "agent",
          text: `Got your photo! 📸 I've mounted "${file.name}" into the active design pipeline mask. Here is your updated flyer preview! How would you like me to adjust the text or theme around it?`,
          timestamp: Date.now(),
          previewImage: previewUrl,
          formatKey: updated.formatKey,
          layoutArchetype: updated.layoutArchetype,
          themeStyle: updated.themeStyle,
          headline: updated.headline,
          actionBadges: [{ label: "Custom Photo Loaded", type: "asset" }],
          suggestedActions: [
            { label: "👑 24K Royal Gold", prompt: "Make the theme 24K Royal Gold" },
            { label: "⚡ Add 20% Discount", prompt: "Add a 20% discount tag" },
            { label: "📰 Magazine Vogue Style", prompt: "Apply luxury magazine editorial layout" },
            { label: "📱 Story 9:16 Format", prompt: "Make this a WhatsApp Status (9:16)" },
          ],
        };

        setMessages((prev) => [...prev, agentReply]);
        toast.success("Uploaded custom photo into AI design pipeline!");
      } catch (err) {
        console.error(err);
      } finally {
        setIsAgentTyping(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleStarterPromptClick = (prompt: string) => {
    handleSend(prompt);
  };

  return (
    <div className="flex flex-col h-full bg-card border rounded-3xl overflow-hidden shadow-lg">
      {/* Agent Header */}
      <div className="p-3.5 sm:p-4 border-b bg-gradient-to-r from-primary/15 via-amber-500/10 to-card flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar className="h-10 w-10 border-2 border-primary shadow-xs">
              <AvatarImage
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
                alt="Maya Sterling"
              />
              <AvatarFallback className="bg-primary text-primary-foreground font-black text-xs">
                MS
              </AvatarFallback>
            </Avatar>
            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-background animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-black text-foreground">Maya Sterling</h3>
              <Badge
                variant="outline"
                className="text-[10px] bg-primary/10 text-primary border-primary/20 font-bold py-0"
              >
                <Sparkles className="h-2.5 w-2.5 mr-0.5" /> AI Creative Director
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Conversational Design Engine • Renders Directly in Chat
            </p>
          </div>
        </div>

        {/* Quick Clear / Reset */}
        <Button
          variant="ghost"
          size="sm"
          onClick={async () => {
            const previewUrl = await renderLocalGraphicDesign(currentOptions);
            setMessages([
              {
                id: "reset",
                sender: "agent",
                text: "Chat refreshed! What new design would you like to build today?",
                timestamp: Date.now(),
                previewImage: previewUrl,
                suggestedActions: [
                  { label: "👗 Fashion Sale", prompt: "Make a luxury fashion flyer" },
                  { label: "🍲 Food Promo", prompt: "Create a restaurant food flyer" },
                  { label: "🏢 Real Estate", prompt: "Design a luxury duplex flyer" },
                ],
              },
            ]);
            toast.info("Conversation reset");
          }}
          className="h-8 px-2 text-xs font-bold text-muted-foreground hover:text-foreground rounded-xl"
          title="Reset conversation"
        >
          <RotateCcw className="h-3.5 w-3.5 mr-1" /> Clear
        </Button>
      </div>

      {/* Quick AI Presets Bar */}
      <div className="px-3 py-2 border-b bg-muted/30 overflow-x-auto scrollbar-none flex items-center gap-1.5">
        <span className="text-[11px] font-bold text-muted-foreground whitespace-nowrap pl-1 flex items-center gap-1">
          <Wand2 className="h-3 w-3 text-primary" /> Polish:
        </span>
        {AI_IMPROVEMENT_PRESETS.slice(0, 5).map((preset) => (
          <button
            key={preset.key}
            onClick={() => onApplyImprovementPreset(preset.key)}
            className="text-[11px] font-bold px-2.5 py-1 rounded-xl bg-background border border-border/80 hover:border-primary/50 hover:bg-primary/5 text-foreground whitespace-nowrap transition-all shadow-2xs shrink-0 flex items-center gap-1"
          >
            <Sparkles className="h-3 w-3 text-amber-500" />
            {preset.label}
          </button>
        ))}
      </div>

      {/* Chat Messages Area */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4 min-h-[360px] max-h-[560px]">
        {messages.map((msg) => {
          const isAgent = msg.sender === "agent";
          return (
            <div
              key={msg.id}
              className={`flex gap-2.5 sm:gap-3 ${isAgent ? "justify-start" : "justify-end"}`}
            >
              {isAgent && (
                <Avatar className="h-7 w-7 mt-1 border border-primary/40 shrink-0">
                  <AvatarImage src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80" />
                  <AvatarFallback className="text-[10px] font-black bg-primary text-white">
                    MS
                  </AvatarFallback>
                </Avatar>
              )}

              <div className={`max-w-[92%] sm:max-w-[85%] space-y-2.5`}>
                {/* Text Bubble */}
                <div
                  className={`p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-xs ${
                    isAgent
                      ? "bg-muted/70 text-foreground border border-border/80 rounded-tl-xs"
                      : "bg-primary text-primary-foreground font-medium rounded-tr-xs"
                  }`}
                >
                  <p className="whitespace-pre-line">{msg.text}</p>

                  {/* Action Badges on what was changed */}
                  {msg.actionBadges && msg.actionBadges.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-2.5 mt-2 border-t border-border/60">
                      {msg.actionBadges.map((badge, idx) => (
                        <Badge
                          key={idx}
                          variant="outline"
                          className="text-[10px] font-bold bg-background/90 text-foreground border-primary/30 py-0.5 px-2 rounded-lg"
                        >
                          <CheckCircle2 className="h-2.5 w-2.5 mr-1 text-emerald-500" />
                          {badge.label}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* THE RENDERED GRAPHIC PREVIEW CARD DIRECTLY IN CHAT */}
                {isAgent && msg.previewImage && (
                  <div className="rounded-2xl border-2 border-primary/30 bg-background/95 overflow-hidden shadow-md p-2.5 space-y-2 animate-in fade-in-50 zoom-in-95 duration-300">
                    <div className="flex items-center justify-between px-1">
                      <div className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[11px] font-black text-foreground uppercase tracking-wider">
                          Generated Graphic
                        </span>
                        {msg.formatKey && (
                          <Badge variant="outline" className="text-[9px] py-0 px-1.5 font-bold">
                            {GRAPHIC_FORMATS.find((f) => f.key === msg.formatKey)?.label || msg.formatKey}
                          </Badge>
                        )}
                      </div>

                      <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                        HD 300 DPI Ready
                      </span>
                    </div>

                    {/* Flyer Graphic Thumbnail Container */}
                    <div
                      onClick={() => {
                        setEnlargedImageUrl(msg.previewImage!);
                        setEnlargedTitle(msg.headline || "Commercial Graphic Preview");
                      }}
                      className="relative group cursor-pointer rounded-xl overflow-hidden bg-muted/40 border border-border/60 flex items-center justify-center max-h-[380px]"
                    >
                      <img
                        src={msg.previewImage}
                        alt="Generated Flyer Preview"
                        className="w-full h-auto object-contain max-h-[360px] rounded-lg group-hover:scale-[1.01] transition-transform duration-200"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-2xs">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="font-bold text-xs h-8 rounded-xl shadow-lg gap-1"
                        >
                          <ZoomIn className="h-3.5 w-3.5" /> Enlarge
                        </Button>
                      </div>
                    </div>

                    {/* Quick Action Toolbar on the Preview Card */}
                    <div className="flex items-center justify-between gap-1.5 pt-1">
                      <Button
                        size="sm"
                        onClick={() => handleDownloadPreview(msg.previewImage!, msg.headline)}
                        className="h-8 flex-1 text-xs font-bold rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 shadow-xs"
                      >
                        <Download className="h-3.5 w-3.5" /> Download HD
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEnlargedImageUrl(msg.previewImage!);
                          setEnlargedTitle(msg.headline || "Commercial Graphic Preview");
                        }}
                        className="h-8 px-2.5 text-xs font-bold rounded-xl"
                        title="Enlarge fullscreen"
                      >
                        <Maximize2 className="h-3.5 w-3.5" />
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          handleSend("Make this a WhatsApp Status (9:16)");
                        }}
                        className="h-8 px-2.5 text-xs font-bold rounded-xl"
                        title="Convert to WhatsApp Story"
                      >
                        <Smartphone className="h-3.5 w-3.5 text-emerald-500" />
                        <span className="hidden sm:inline text-[10px]">Story</span>
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          handleSend("Switch theme to 24K Royal Gold");
                        }}
                        className="h-8 px-2.5 text-xs font-bold rounded-xl"
                        title="Try Royal Gold Theme"
                      >
                        <Palette className="h-3.5 w-3.5 text-amber-500" />
                        <span className="hidden sm:inline text-[10px]">Gold</span>
                      </Button>
                    </div>
                  </div>
                )}

                {/* Suggested Action Chips from Maya */}
                {isAgent && msg.suggestedActions && msg.suggestedActions.length > 0 && (
                  <div className="space-y-1 pt-1">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                      Quick Refinements:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.suggestedActions.map((action, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleStarterPromptClick(action.prompt)}
                          className="text-xs font-semibold px-2.5 py-1 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 transition-all text-left flex items-center gap-1 group active:scale-95"
                        >
                          <span>{action.label}</span>
                          <ArrowRight className="h-3 w-3 opacity-60 group-hover:translate-x-0.5 transition-transform" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Agent Typing Indicator */}
        {isAgentTyping && (
          <div className="flex gap-2.5 items-center text-xs text-muted-foreground">
            <Avatar className="h-7 w-7 border border-primary/40">
              <AvatarFallback className="text-[10px] font-black bg-primary text-white">
                MS
              </AvatarFallback>
            </Avatar>
            <div className="bg-muted/70 px-4 py-2.5 rounded-2xl rounded-tl-xs border border-border/80 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
              <span className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
              <span className="h-2 w-2 rounded-full bg-primary animate-bounce" />
              <span className="ml-1 text-[11px] font-bold text-foreground">
                {typingStatus}
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Industry Starter Prompts Carousel (Non-Tech friendly) */}
      <div className="px-3 py-2 border-t bg-muted/20">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-bold text-muted-foreground flex items-center gap-1">
            <Flame className="h-3 w-3 text-amber-500" /> Instant Business Starters:
          </span>
          <span className="text-[10px] text-muted-foreground">Tap any to auto-generate</span>
        </div>
        <div className="overflow-x-auto scrollbar-none flex gap-1.5 pb-1">
          {AGENT_INDUSTRY_STARTERS.map((st) => (
            <button
              key={st.id}
              onClick={() => handleStarterPromptClick(st.prompt)}
              className="text-left p-2 rounded-xl bg-background border border-border/80 hover:border-primary/60 hover:bg-muted/50 transition-all shrink-0 w-44 sm:w-48 shadow-2xs group"
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-sm">{st.icon}</span>
                <span className="text-[11px] font-bold text-foreground truncate group-hover:text-primary transition-colors">
                  {st.title}
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground line-clamp-2 leading-tight">
                {st.prompt}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Input Composer */}
      <div className="p-3 border-t bg-background space-y-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-1.5 sm:gap-2"
        >
          {/* File / Photo Upload */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/*"
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            className="h-10 w-10 rounded-2xl shrink-0 text-muted-foreground hover:text-foreground"
            title="Upload photo or logo"
          >
            <Paperclip className="h-4 w-4" />
          </Button>

          {/* Voice Input Button */}
          <Button
            type="button"
            variant={isListening ? "destructive" : "outline"}
            size="icon"
            onClick={toggleVoiceDictation}
            className={`h-10 w-10 rounded-2xl shrink-0 ${isListening ? "animate-pulse" : "text-muted-foreground hover:text-foreground"}`}
            title={isListening ? "Listening... click to stop" : "Voice dictation (Speak your request)"}
          >
            {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>

          {/* Text Input */}
          <div className="relative flex-1">
            <Input
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder={
                isListening
                  ? "🎙️ Listening... speak now..."
                  : "Tell Maya: 'Change price to ₦20k', 'Make it luxury gold'..."
              }
              className="h-10 text-xs sm:text-sm rounded-2xl pr-3 pl-3.5 border-2 focus-visible:border-primary w-full"
            />
          </div>

          {/* Send Button */}
          <Button
            type="submit"
            disabled={!inputVal.trim() || isAgentTyping}
            className="h-10 px-3.5 sm:px-4 rounded-2xl font-bold text-xs shrink-0 shadow-md gap-1"
          >
            <Send className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Send</span>
          </Button>
        </form>

        <div className="flex items-center justify-between text-[10px] text-muted-foreground px-1">
          <span>💡 Tip: Say &quot;Change color to green&quot;, &quot;Add WhatsApp 080...&quot;, or &quot;Make it story size&quot;</span>
          <span className="font-semibold text-emerald-600 dark:text-emerald-400">Live AI Assistant</span>
        </div>
      </div>

      {/* Enlarged Lightbox Modal */}
      <Dialog open={!!enlargedImageUrl} onOpenChange={(open) => !open && setEnlargedImageUrl(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] p-4 sm:p-6 overflow-hidden flex flex-col items-center">
          <DialogHeader className="w-full text-left">
            <DialogTitle className="text-base sm:text-lg font-black truncate">
              {enlargedTitle}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Commercial High-Resolution Export Preview • 300 DPI Print & Digital Calibrated
            </DialogDescription>
          </DialogHeader>

          {enlargedImageUrl && (
            <div className="w-full flex-1 flex items-center justify-center p-2 overflow-auto">
              <img
                src={enlargedImageUrl}
                alt="Enlarged Flyer"
                className="max-h-[70vh] w-auto max-w-full rounded-2xl shadow-2xl border"
              />
            </div>
          )}

          <div className="w-full flex items-center justify-between pt-3 border-t mt-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEnlargedImageUrl(null)}
              className="rounded-xl text-xs font-bold"
            >
              Close
            </Button>

            {enlargedImageUrl && (
              <Button
                size="sm"
                onClick={() => handleDownloadPreview(enlargedImageUrl, enlargedTitle)}
                className="rounded-xl text-xs font-bold gap-1.5 shadow-md"
              >
                <Download className="h-4 w-4" />
                Download High-Resolution (PNG)
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
