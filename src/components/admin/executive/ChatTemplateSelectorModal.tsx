import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Palette, Check, Sparkles, Bot, User } from "lucide-react";
import { CHAT_TEMPLATES, ChatTemplate } from "@/lib/chatThemeTemplates";

interface ChatTemplateSelectorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentTemplate: ChatTemplate;
  onSelectTemplate: (template: ChatTemplate) => void;
}

export default function ChatTemplateSelectorModal({
  open,
  onOpenChange,
  currentTemplate,
  onSelectTemplate,
}: ChatTemplateSelectorModalProps) {
  const [hoveredTemplate, setHoveredTemplate] = useState<ChatTemplate | null>(null);

  const previewTemplate = hoveredTemplate || currentTemplate;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 rounded-3xl border-2 border-primary/30">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
              <Palette className="h-5 w-5" />
            </div>
            <DialogTitle className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
              Select Executive Chat Template
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs sm:text-sm text-muted-foreground font-medium">
            Customize the visual background theme and high-contrast styling for the Executive AI Strategy Director.
          </DialogDescription>
        </DialogHeader>

        {/* Live Mini Preview Window */}
        <div className="mt-4 p-4 rounded-2xl border-2 border-border/80 shadow-md relative overflow-hidden transition-all duration-300">
          <div className="flex items-center justify-between mb-3 border-b pb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary animate-pulse" />
              <span className="text-xs font-black uppercase tracking-wider text-foreground">
                Live Preview: {previewTemplate.name}
              </span>
            </div>
            <Badge variant="outline" className={`text-xs font-black px-2.5 py-0.5 ${previewTemplate.accentRing}`}>
              {previewTemplate.badge}
            </Badge>
          </div>

          <div className={`p-4 rounded-xl min-h-[140px] flex flex-col gap-3 transition-all duration-300 ${previewTemplate.containerBg}`}>
            {/* User message sample */}
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-1 text-[10px] font-black uppercase opacity-80">
                <User className="h-3 w-3" />
                <span>You (Admin)</span>
              </div>
              <div className={`px-4 py-2.5 rounded-2xl rounded-tr-none text-xs sm:text-sm leading-relaxed max-w-[85%] ${previewTemplate.userBubbleBg}`}>
                Generate high-impact growth strategy for Lagos tech hubs.
              </div>
            </div>

            {/* AI message sample */}
            <div className="flex flex-col items-start gap-1">
              <div className="flex items-center gap-1 text-[10px] font-black uppercase opacity-80">
                <Bot className="h-3 w-3 text-primary" />
                <span>AI Strategy Director</span>
              </div>
              <div className={`px-4 py-2.5 rounded-2xl rounded-tl-none text-xs sm:text-sm leading-relaxed max-w-[85%] ${previewTemplate.aiBubbleBg} ${previewTemplate.aiTextColor}`}>
                Here is the verified executive directive: Initiating multi-pillar promotion across Eko Innovation Centre & Yaba ecosystem.
              </div>
            </div>
          </div>
        </div>

        {/* Template Grid Selection */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {CHAT_TEMPLATES.map((tmpl) => {
            const isSelected = tmpl.id === currentTemplate.id;
            return (
              <div
                key={tmpl.id}
                onMouseEnter={() => setHoveredTemplate(tmpl)}
                onMouseLeave={() => setHoveredTemplate(null)}
                onClick={() => {
                  onSelectTemplate(tmpl);
                  onOpenChange(false);
                }}
                className={`group cursor-pointer p-4 rounded-2xl border-2 transition-all duration-200 flex flex-col justify-between gap-3 text-left relative overflow-hidden ${
                  isSelected
                    ? "border-primary bg-primary/5 shadow-md ring-2 ring-primary/30"
                    : "border-border/70 hover:border-primary/50 hover:bg-muted/40"
                }`}
              >
                {/* Visual Header swatch */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className={`h-8 w-8 rounded-xl bg-gradient-to-br ${tmpl.previewGradient} border border-white/20 shadow-inner flex items-center justify-center shrink-0`} />
                    <div>
                      <p className="font-black text-sm text-foreground leading-tight">{tmpl.name}</p>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-0.5">
                        {tmpl.category}
                      </p>
                    </div>
                  </div>
                  {isSelected && (
                    <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-sm">
                      <Check className="h-3.5 w-3.5 stroke-[3]" />
                    </div>
                  )}
                </div>

                <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                  {tmpl.description}
                </p>

                <div className="pt-2 border-t flex items-center justify-between">
                  <Badge variant="outline" className={`text-[10px] font-bold px-2 py-0.5 ${tmpl.accentRing}`}>
                    {tmpl.badge}
                  </Badge>
                  <Button
                    size="sm"
                    variant={isSelected ? "default" : "secondary"}
                    className="h-7 text-xs font-black rounded-xl px-3"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectTemplate(tmpl);
                      onOpenChange(false);
                    }}
                  >
                    {isSelected ? "Active" : "Apply"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
