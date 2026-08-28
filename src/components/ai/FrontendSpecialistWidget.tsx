import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles, Send, Copy, Check, ChevronDown, ChevronUp,
  Headphones, MessageSquare, GraduationCap, Megaphone, Store,
  FileText, ShieldCheck, RefreshCw, Bot, User, ArrowRight, CornerDownLeft
} from "lucide-react";
import {
  DigitalEmployeeProfile,
  getAgentProfile,
  querySpecialistAgent,
  cleanAndFormatAgentResponse,
  INITIAL_DIGITAL_WORKFORCE
} from "@/lib/aiWorkforceRegistry";
import { copyToClipboard } from "@/lib/clipboard";
import { toast } from "sonner";

interface FrontendSpecialistWidgetProps {
  agentId: string;
  mode?: "embedded" | "floating" | "banner";
  title?: string;
  subtitle?: string;
  contextData?: Record<string, any>;
  customPrompts?: string[];
  initialOpen?: boolean;
  className?: string;
  onResultGenerated?: (result: string) => void;
}

const ICON_MAP: Record<string, any> = {
  Headphones,
  MessageSquare,
  GraduationCap,
  Megaphone,
  Store,
  FileText,
  ShieldCheck,
  Sparkles,
};

export default function FrontendSpecialistWidget({
  agentId,
  mode = "embedded",
  title,
  subtitle,
  contextData,
  customPrompts,
  initialOpen = true,
  className = "",
  onResultGenerated,
}: FrontendSpecialistWidgetProps) {
  const agent: DigitalEmployeeProfile =
    getAgentProfile(agentId) ||
    INITIAL_DIGITAL_WORKFORCE.find((a) => a.id === agentId) ||
    INITIAL_DIGITAL_WORKFORCE[1];

  const [isOpen, setIsOpen] = useState(initialOpen);
  const [messages, setMessages] = useState<Array<{ id: string; role: "agent" | "user"; text: string; time: string }>>([
    {
      id: "welcome_msg",
      role: "agent",
      text: cleanAndFormatAgentResponse(agent.workplaceGreeting),
      time: "Just now",
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const IconComponent = ICON_MAP[agent.iconName] || Sparkles;
  const prompts = customPrompts || agent.quickPrompts || [];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputText).trim();
    if (!query || loading) return;

    const userMsgId = `user_${Date.now()}`;
    const newMessages = [
      ...messages,
      {
        id: userMsgId,
        role: "user" as const,
        text: query,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ];
    setMessages(newMessages);
    setInputText("");
    setLoading(true);

    try {
      const response = await querySpecialistAgent(agent, query, contextData);
      const agentMsgId = `agent_${Date.now()}`;
      setMessages([
        ...newMessages,
        {
          id: agentMsgId,
          role: "agent" as const,
          text: response,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
      if (onResultGenerated) {
        onResultGenerated(response);
      }
    } catch (err) {
      toast.error("Could not reach specialist assistant right now.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (id: string, text: string) => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopiedId(id);
      toast.success("Response copied to clipboard");
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  if (mode === "banner") {
    return (
      <div className={`p-4 sm:p-5 rounded-2xl sm:rounded-3xl border-2 border-primary/20 bg-gradient-to-br from-card via-card to-primary/5 shadow-sm ${className}`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="relative shrink-0">
              <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl overflow-hidden border-2 border-primary/40 shadow-md bg-muted">
                <img
                  src={agent.profilePhotoUrl}
                  alt={agent.name}
                  className="h-full w-full object-cover"
                />
              </div>
              <span className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-emerald-500 border-2 border-card ring-2 ring-emerald-500/20 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-sm sm:text-base font-black text-foreground">{agent.name}</h4>
                <Badge variant="outline" className="text-[10px] font-black bg-primary/10 text-primary border-primary/30">
                  {agent.jobTitle}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{title || agent.role}</p>
            </div>
          </div>

          <Button
            size="sm"
            onClick={() => setIsOpen(!isOpen)}
            className="rounded-xl font-bold text-xs h-9 px-4 gap-1.5 bg-primary text-primary-foreground shadow-xs shrink-0"
          >
            <IconComponent className="h-3.5 w-3.5" />
            <span>{isOpen ? "Hide Assistant" : "Ask Specialist"}</span>
            {isOpen ? <ChevronUp className="h-3.5 w-3.5 ml-1" /> : <ChevronDown className="h-3.5 w-3.5 ml-1" />}
          </Button>
        </div>

        {isOpen && (
          <div className="mt-4 pt-4 border-t border-border/80 space-y-3">
            <div className="max-h-60 overflow-y-auto space-y-2.5 pr-1">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`p-3 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                    m.role === "agent"
                      ? "bg-muted/80 text-foreground border border-border/60"
                      : "bg-primary text-primary-foreground ml-6"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.text}</p>
                </div>
              ))}
              {loading && (
                <div className="p-3 rounded-2xl bg-muted/60 text-xs text-muted-foreground flex items-center gap-2">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin text-primary" />
                  <span>{agent.name} is writing guidance...</span>
                </div>
              )}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <Input
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={`Ask ${agent.name.split(" ")[0]} anything...`}
                className="h-10 text-xs sm:text-sm rounded-xl"
                disabled={loading}
              />
              <Button type="submit" size="sm" disabled={loading || !inputText.trim()} className="h-10 px-4 rounded-xl font-bold text-xs">
                <Send className="h-3.5 w-3.5" />
              </Button>
            </form>
          </div>
        )}
      </div>
    );
  }

  return (
    <Card className={`rounded-2xl sm:rounded-3xl border-2 border-border/80 bg-card shadow-md overflow-hidden transition-all duration-200 ${className}`}>
      {/* Header Bar */}
      <CardHeader className="p-3.5 sm:p-4 bg-muted/30 border-b border-border/60 flex flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative shrink-0">
            <div className="h-11 w-11 sm:h-12 sm:w-12 rounded-2xl overflow-hidden border-2 border-primary/30 shadow-sm bg-muted">
              <img
                src={agent.profilePhotoUrl}
                alt={agent.name}
                className="h-full w-full object-cover"
              />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-card ring-2 ring-emerald-500/20" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm font-black text-foreground truncate">{agent.name}</h4>
              <Badge variant="outline" className="text-[10px] font-bold bg-primary/10 text-primary border-primary/25">
                {agent.workplace}
              </Badge>
            </div>
            <p className="text-[11px] font-semibold text-muted-foreground truncate">
              {subtitle || agent.jobTitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(!isOpen)}
            className="h-8 px-2.5 rounded-xl font-bold text-xs text-muted-foreground hover:text-foreground"
          >
            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>

      {isOpen && (
        <CardContent className="p-3.5 sm:p-4 space-y-3.5">
          {/* Quick Action Prompt Chips */}
          {prompts.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                Suggested Actions
              </p>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                {prompts.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(prompt)}
                    disabled={loading}
                    className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-secondary hover:bg-primary/15 text-secondary-foreground hover:text-primary transition-colors whitespace-nowrap border border-border/60 text-left shrink-0 active:scale-95"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Conversation Thread */}
          <div className="space-y-3 max-h-72 sm:max-h-80 overflow-y-auto pr-1 no-scrollbar">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}
              >
                <div
                  className={`max-w-[90%] sm:max-w-[85%] p-3 sm:p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-2xs ${
                    m.role === "agent"
                      ? "bg-muted/70 text-foreground border border-border/70 rounded-tl-sm"
                      : "bg-primary text-primary-foreground rounded-tr-sm"
                  }`}
                >
                  <p className="whitespace-pre-wrap font-medium">{m.text}</p>
                </div>

                <div className="flex items-center gap-2 mt-1 px-1">
                  <span className="text-[10px] text-muted-foreground">{m.time}</span>
                  {m.role === "agent" && (
                    <button
                      onClick={() => handleCopy(m.id, m.text)}
                      className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                      title="Copy response"
                    >
                      {copiedId === m.id ? (
                        <Check className="h-3 w-3 text-emerald-500" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                      <span>{copiedId === m.id ? "Copied" : "Copy"}</span>
                    </button>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 p-3 rounded-2xl bg-muted/40 border border-border/50 text-xs text-muted-foreground w-fit animate-pulse">
                <RefreshCw className="h-3.5 w-3.5 animate-spin text-primary" />
                <span>{agent.name.split(" ")[0]} is preparing response...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2 pt-1 border-t border-border/60"
          >
            <Input
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={`Message ${agent.name.split(" ")[0]}...`}
              disabled={loading}
              className="h-10 text-xs sm:text-sm rounded-xl bg-background border-border/80 focus-visible:ring-primary"
            />
            <Button
              type="submit"
              disabled={loading || !inputText.trim()}
              size="sm"
              className="h-10 px-3.5 rounded-xl font-bold text-xs gap-1.5 shrink-0 bg-primary text-primary-foreground shadow-xs"
            >
              <Send className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Send</span>
            </Button>
          </form>
        </CardContent>
      )}
    </Card>
  );
}
