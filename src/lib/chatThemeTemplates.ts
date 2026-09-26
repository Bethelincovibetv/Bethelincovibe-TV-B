export interface ChatTemplate {
  id: string;
  name: string;
  badge: string;
  description: string;
  bgClass: string;
  bubbleAi: string;
  bubbleUser: string;
  accentRing: string;
  doodleColor?: string;
  headerGradient?: string;
}

export const CHAT_TEMPLATES: ChatTemplate[] = [
  {
    id: "executive_navy",
    name: "Executive Royal Navy",
    badge: "Official Executive",
    description: "Deep luxury midnight navy with gold accents and high-clarity contrast.",
    bgClass: "bg-slate-950 text-slate-100",
    bubbleAi: "bg-slate-900 border border-slate-700 text-slate-100 shadow-md",
    bubbleUser: "bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-medium shadow-md",
    accentRing: "ring-purple-500/30 border-purple-500/40 text-purple-400",
    headerGradient: "from-slate-900 via-indigo-950 to-slate-900",
  },
  {
    id: "lagos_emerald",
    name: "Lagos Emerald Mastermind",
    badge: "Commerce Edition",
    description: "Deep emerald green designed for high-focus merchant business strategy.",
    bgClass: "bg-zinc-950 text-zinc-100",
    bubbleAi: "bg-zinc-900 border border-emerald-800/40 text-emerald-50 shadow-md",
    bubbleUser: "bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-medium shadow-md",
    accentRing: "ring-emerald-500/30 border-emerald-500/40 text-emerald-400",
    headerGradient: "from-zinc-900 via-emerald-950 to-zinc-900",
  },
  {
    id: "crystal_minimal",
    name: "Crystal Light Minimal",
    badge: "Clean Modern",
    description: "Ultra-clean, high-legibility light theme for daytime strategic reviews.",
    bgClass: "bg-slate-50 text-slate-900",
    bubbleAi: "bg-white border border-slate-200 text-slate-900 shadow-sm",
    bubbleUser: "bg-primary text-primary-foreground font-medium shadow-md",
    accentRing: "ring-primary/20 border-primary/30 text-primary",
    headerGradient: "from-white via-slate-100 to-white",
  },
  {
    id: "cyber_violet",
    name: "Cyberpunk Violet",
    badge: "AI Studio",
    description: "Vibrant neon purple and fuchsia accents for innovative brainstorming.",
    bgClass: "bg-neutral-950 text-neutral-100",
    bubbleAi: "bg-neutral-900 border border-fuchsia-900/40 text-fuchsia-50 shadow-md",
    bubbleUser: "bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white font-medium shadow-md",
    accentRing: "ring-fuchsia-500/30 border-fuchsia-500/40 text-fuchsia-400",
    headerGradient: "from-neutral-900 via-fuchsia-950 to-neutral-900",
  },
];

export const DEFAULT_CHAT_TEMPLATE = CHAT_TEMPLATES[0];

const STORAGE_KEY = "btv_executive_chat_template_id";

export function loadSavedChatTemplate(): ChatTemplate {
  if (typeof window === "undefined") return DEFAULT_CHAT_TEMPLATE;
  try {
    const savedId = localStorage.getItem(STORAGE_KEY);
    if (savedId) {
      const found = CHAT_TEMPLATES.find((t) => t.id === savedId);
      if (found) return found;
    }
  } catch {}
  return DEFAULT_CHAT_TEMPLATE;
}

export function saveChatTemplateChoice(templateId: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, templateId);
  } catch {}
}
