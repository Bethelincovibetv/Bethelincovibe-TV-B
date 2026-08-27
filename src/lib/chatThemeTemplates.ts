export interface ChatTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  badge: string;
  // Background styling of the chat scrollable area
  containerBg: string;
  // AI assistant message bubble styling (thick, bold, readable)
  aiBubbleBg: string;
  aiTextColor: string;
  // Admin message bubble styling
  userBubbleBg: string;
  userTextColor: string;
  // Action proposal / preview card styling
  proposalCardBg: string;
  // Input bar background
  inputBarBg: string;
  // Visual preview classes for the template selector card
  previewGradient: string;
  accentRing: string;
}

export const CHAT_TEMPLATES: ChatTemplate[] = [
  {
    id: "executive_obsidian",
    name: "Executive Obsidian Dark",
    category: "Dark Titanium",
    description: "Deep obsidian canvas with subtle micro-dots and glowing titanium-indigo accents. Maximum readability.",
    badge: "Default Executive",
    containerBg: "bg-[#0b0f19] text-slate-100 bg-[radial-gradient(#1e293b_1.2px,transparent_1.2px)] [background-size:20px_20px]",
    aiBubbleBg: "bg-[#141b2d] border-2 border-indigo-500/40 shadow-lg",
    aiTextColor: "text-slate-100 font-bold",
    userBubbleBg: "bg-gradient-to-r from-indigo-600 to-primary text-white border-2 border-indigo-400/40 shadow-md",
    userTextColor: "text-white font-black",
    proposalCardBg: "bg-[#111726] border-2 border-indigo-500/40",
    inputBarBg: "bg-[#0f1422] border-t-2 border-indigo-500/30",
    previewGradient: "from-[#0b0f19] via-[#141b2d] to-indigo-950",
    accentRing: "border-indigo-500 text-indigo-400 bg-indigo-950/60 ring-2 ring-indigo-500/20",
  },
  {
    id: "cyber_grid",
    name: "Cyber Matrix Command",
    category: "Cyber / Tech",
    description: "High-tech slate grid with electric cyan borders, neon-glow badges, and bold phosphor-clear text.",
    badge: "High-Tech Matrix",
    containerBg: "bg-[#060a12] text-slate-100 bg-[linear-gradient(to_right,#0ea5e912_1px,transparent_1px),linear-gradient(to_bottom,#0ea5e912_1px,transparent_1px)] bg-[size:24px_24px]",
    aiBubbleBg: "bg-[#0b1325] border-2 border-cyan-500/50 shadow-xl",
    aiTextColor: "text-cyan-50 font-bold",
    userBubbleBg: "bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 text-white border-2 border-cyan-300/40 shadow-md",
    userTextColor: "text-white font-black",
    proposalCardBg: "bg-[#09101f] border-2 border-cyan-500/50",
    inputBarBg: "bg-[#070c18] border-t-2 border-cyan-500/30",
    previewGradient: "from-[#060a12] via-[#0b1325] to-cyan-950",
    accentRing: "border-cyan-500 text-cyan-400 bg-cyan-950/60 ring-2 ring-cyan-500/20",
  },
  {
    id: "royal_indigo_mesh",
    name: "Royal Executive Violet",
    category: "Royal Premium",
    description: "Rich layered midnight violet, deep purple mesh gradient with velvet tones and bold crisp white text.",
    badge: "Royal Luxury",
    containerBg: "bg-gradient-to-br from-[#0c091d] via-[#150f2e] to-[#0a1128] text-slate-100",
    aiBubbleBg: "bg-[#1c143d] border-2 border-purple-500/50 shadow-xl",
    aiTextColor: "text-purple-50 font-bold",
    userBubbleBg: "bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 text-white border-2 border-purple-400/40 shadow-md",
    userTextColor: "text-white font-black",
    proposalCardBg: "bg-[#161033] border-2 border-purple-500/50",
    inputBarBg: "bg-[#100b26] border-t-2 border-purple-500/30",
    previewGradient: "from-[#0c091d] via-[#1c143d] to-purple-950",
    accentRing: "border-purple-500 text-purple-300 bg-purple-950/60 ring-2 ring-purple-500/20",
  },
  {
    id: "emerald_command",
    name: "Emerald Sovereign Hub",
    category: "Executive Jade",
    description: "Military-grade deep emerald and dark jade command canvas with sharp emerald contrast.",
    badge: "Emerald Elite",
    containerBg: "bg-[#040f0c] text-emerald-50 bg-[radial-gradient(#10b98118_1.5px,transparent_1.5px)] [background-size:22px_22px]",
    aiBubbleBg: "bg-[#0a231d] border-2 border-emerald-500/50 shadow-xl",
    aiTextColor: "text-emerald-50 font-bold",
    userBubbleBg: "bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white border-2 border-emerald-300/40 shadow-md",
    userTextColor: "text-white font-black",
    proposalCardBg: "bg-[#071915] border-2 border-emerald-500/50",
    inputBarBg: "bg-[#051410] border-t-2 border-emerald-500/30",
    previewGradient: "from-[#040f0c] via-[#0a231d] to-emerald-950",
    accentRing: "border-emerald-500 text-emerald-400 bg-emerald-950/60 ring-2 ring-emerald-500/20",
  },
  {
    id: "warm_gold_nebula",
    name: "Golden Executive Suite",
    category: "Gold Luxury",
    description: "Opulent dark bronze, rich amber, and golden velvet backdrop with thick golden typography.",
    badge: "Golden Prestige",
    containerBg: "bg-gradient-to-br from-[#120b04] via-[#1c1207] to-[#0f0902] text-amber-50",
    aiBubbleBg: "bg-[#26190a] border-2 border-amber-500/50 shadow-xl",
    aiTextColor: "text-amber-50 font-bold",
    userBubbleBg: "bg-gradient-to-r from-amber-600 via-orange-600 to-yellow-600 text-white border-2 border-amber-300/40 shadow-md",
    userTextColor: "text-white font-black",
    proposalCardBg: "bg-[#1f1408] border-2 border-amber-500/50",
    inputBarBg: "bg-[#140c04] border-t-2 border-amber-500/30",
    previewGradient: "from-[#120b04] via-[#26190a] to-amber-950",
    accentRing: "border-amber-500 text-amber-400 bg-amber-950/60 ring-2 ring-amber-500/20",
  },
  {
    id: "clean_modern_light",
    name: "Architectural Studio Minimal",
    category: "Crisp High-Contrast",
    description: "Pure architectural off-white canvas with geometric cross-dots and ultra-thick dark charcoal lettering.",
    badge: "Clean Light",
    containerBg: "bg-slate-50 text-slate-900 bg-[radial-gradient(#94a3b8_1.2px,transparent_1.2px)] [background-size:18px_18px]",
    aiBubbleBg: "bg-white border-2 border-slate-300 shadow-md",
    aiTextColor: "text-slate-950 font-black",
    userBubbleBg: "bg-gradient-to-r from-indigo-600 via-primary to-blue-700 text-white border-2 border-indigo-300 shadow-md",
    userTextColor: "text-white font-black",
    proposalCardBg: "bg-white border-2 border-slate-300",
    inputBarBg: "bg-white border-t-2 border-slate-200",
    previewGradient: "from-slate-100 via-white to-slate-200",
    accentRing: "border-slate-800 text-slate-900 bg-slate-100 ring-2 ring-slate-400",
  }
];

const STORAGE_KEY = "admin_executive_chat_template_id";

export function loadSavedChatTemplate(): ChatTemplate {
  if (typeof window === "undefined") return CHAT_TEMPLATES[0];
  try {
    const savedId = localStorage.getItem(STORAGE_KEY);
    const found = CHAT_TEMPLATES.find((t) => t.id === savedId);
    return found || CHAT_TEMPLATES[0];
  } catch {
    return CHAT_TEMPLATES[0];
  }
}

export function saveChatTemplateChoice(templateId: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, templateId);
  } catch (e) {
    console.error("Failed to save chat template choice", e);
  }
}
