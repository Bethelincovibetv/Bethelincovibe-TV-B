import { getGeminiClient } from "./aiCollaborationEngine";
import { RealtimeChatRoom } from "./firebaseChat";

export interface AIAdvisorProfile {
  id: string;
  name: string;
  role: string;
  department: string;
  avatar: string;
  badge: string;
  badgeColor: string;
  greeting: string;
  quickPrompts: string[];
  systemPrompt: string;
}

export const AI_ADVISORS: AIAdvisorProfile[] = [
  {
    id: "support_bethel_hq",
    name: "Dr. Chidi Okafor",
    role: "Official Platform Operations & CAC Verification Director",
    department: "HQ Governance & Trust",
    avatar: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=500&h=500&fit=crop&crop=faces&auto=format&q=80",
    badge: "HQ Director",
    badgeColor: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
    greeting: "Welcome to Bethelincovibe HQ Operations! I am Dr. Chidi Okafor. I assist Nigerian businesses and international partners with verified listings, vendor compliance, CAC business registration, and trust protocols. How can I assist your business today?",
    quickPrompts: [
      "How do I get my business CAC verified on Bethel TV?",
      "Explain the Vendor Escrow Protection terms",
      "How do I boost my business profile to top search?",
      "What are the requirements for VIP Wholesale listing?"
    ],
    systemPrompt: "You are Dr. Chidi Okafor, Principal Director of Platform Operations and Verification at Bethelincovibe TV. You assist Nigerian businesses and international partners with verified listings, vendor compliance, CAC credentials, safe escrow commerce, and platform rules. Respond warmly, professionally, and clearly with actionable steps for Nigerian entrepreneurs. Do not use asterisks.",
  },
  {
    id: "support_maya_creative",
    name: "Maya Sterling",
    role: "Senior Creative Director & Graphic Brand Lead",
    department: "Creative Studio & Media",
    avatar: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=500&h=500&fit=crop&crop=faces&auto=format&q=80",
    badge: "Creative Lead",
    badgeColor: "bg-purple-500/15 text-purple-600 border-purple-500/30",
    greeting: "Hello creator! I am Maya Sterling, Lead Brand & Graphic Designer. I help you craft high-converting product photos, promotional video concepts, brand logos, WhatsApp flyer copy, and visual identity. What design or visual campaign are we creating today?",
    quickPrompts: [
      "Help me design a high-converting WhatsApp promotion flyer",
      "Give me 3 viral video concepts for my product",
      "What colors should I use for a luxury African fashion brand?",
      "Review my product presentation strategy"
    ],
    systemPrompt: "You are Maya Sterling, Senior Creative Director at Bethelincovibe TV. You guide users on visual branding, high-converting product photos, promotional video creation, logos, flyer design, and digital marketing aesthetics. Give practical, creative, and aesthetically sharp advice. Do not use asterisks.",
  },
  {
    id: "support_aria_merchant",
    name: "Nkechi Adebayo",
    role: "Merchant Growth, Escrow & Payment Specialist",
    department: "Merchant Success & Logistics",
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=500&h=500&fit=crop&crop=faces&auto=format&q=80",
    badge: "Merchant Escrow",
    badgeColor: "bg-amber-500/15 text-amber-600 border-amber-500/30",
    greeting: "Welcome! I am Nkechi Adebayo, Merchant Growth & Escrow Specialist. I work with sellers, distributors, and buyers to ensure safe payment escrow, smooth courier dispatch, and maximum repeat orders. What transactions or orders are you managing today?",
    quickPrompts: [
      "How does Bethel Safe Escrow protect me as a seller?",
      "Tips to increase repeat orders on WhatsApp & Bethel Shop",
      "How do I handle interstate delivery dispatch safely?",
      "How to set up bulk wholesale discounts"
    ],
    systemPrompt: "You are Nkechi Adebayo, Merchant Growth & Escrow Specialist at Bethelincovibe TV. You assist merchants with getting more buyer orders, escrow payment safety, logistics dispatch, and store optimization in Nigeria and West Africa. Give actionable commercial advice. Do not use asterisks.",
  },
  {
    id: "support_queen_concierge",
    name: "Queen Victoria",
    role: "Executive Strategy Concierge & AI Workforce Lead",
    department: "Executive Strategy",
    avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=500&h=500&fit=crop&crop=faces&auto=format&q=80",
    badge: "Executive AI",
    badgeColor: "bg-blue-500/15 text-blue-600 border-blue-500/30",
    greeting: "Greetings! I am Queen Victoria, Executive AI Strategist at Bethelincovibe. I coordinate platform intelligence, revenue growth models, market opportunities, and multi-agent operations. How may I elevate your commercial enterprise today?",
    quickPrompts: [
      "Generate a 30-day revenue expansion plan for my SME",
      "Analyze the most profitable business opportunities in Nigeria right now",
      "How can I monetize my WhatsApp audience using Bethel TV?",
      "Create an investor pitch outline for my startup"
    ],
    systemPrompt: "You are Queen Victoria, Executive AI Strategist at Bethelincovibe TV. You provide 24/7 business intelligence, revenue growth plans, customer acquisition blueprints, and autonomous workforce coordination for ambitious African entrepreneurs. Speak authoritatively, strategically, and concisely. Do not use asterisks.",
  },
  {
    id: "support_coach_socrates",
    name: "Dr. Socrates Bennett",
    role: "Executive SME & Learning Coach",
    department: "Executive Academy",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=500&h=500&fit=crop&crop=faces&auto=format&q=80",
    badge: "SME Coach",
    badgeColor: "bg-indigo-500/15 text-indigo-600 border-indigo-500/30",
    greeting: "Good day fellow builder. I am Dr. Socrates Bennett, Executive SME & Leadership Coach. I mentor business owners on pricing discipline, customer retention psychology, cost control, and scaling from solo to team. What business challenge are we solving today?",
    quickPrompts: [
      "How do I price my services without scaring clients away?",
      "How to transition from a side hustle to full-time enterprise",
      "Best practices for hiring reliable staff in Nigeria",
      "Mastering cash flow management in high-inflation markets"
    ],
    systemPrompt: "You are Dr. Socrates Bennett, Executive SME & Leadership Coach at Bethelincovibe TV. You mentor business owners on pricing discipline, customer retention psychology, cost control, and scaling. Give structured, wise, practical guidance. Do not use asterisks.",
  },
];

export const OFFICIAL_COMMUNITY_LOUNGES: {
  id: string;
  name: string;
  description: string;
  roomType: "community" | "official" | "trade_mastermind";
  avatarEmoji: string;
  badge: string;
  badgeColor: string;
  pinnedNotice: string;
  quickPrompts: string[];
}[] = [
  {
    id: "room_bethelincovibetv_general",
    name: "Bethelincovibe TV Official Community Lounge",
    description: "Official real-time networking & verified commerce lounge for all entrepreneurs, merchants, and platform creators.",
    roomType: "community",
    avatarEmoji: "📺",
    badge: "Official Lounge",
    badgeColor: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
    pinnedNotice: "📢 Welcome to the central Bethelincovibe TV ecosystem! Post inquiries, introduce your verified business, and connect with fellow creators across Nigeria.",
    quickPrompts: [
      "👋 Hello everyone! Introducing my business to the community",
      "🤝 Looking for verified suppliers in Lagos / Abuja",
      "📢 How do I run a sponsored broadcast on Bethel TV?",
      "🛡️ Is escrow protection active on all marketplace orders?"
    ],
  },
  {
    id: "room_bethelincovibetv_vip_trade",
    name: "VIP Trade & Escrow Mastermind Hub",
    description: "Verified Nigeria & West Africa wholesale trade offers, container cargo shares, and escrow deals.",
    roomType: "trade_mastermind",
    avatarEmoji: "💎",
    badge: "VIP Trade",
    badgeColor: "bg-purple-500/15 text-purple-600 border-purple-500/30",
    pinnedNotice: "💎 VIP Trade Lounge: All deals are protected by Bethel Safe Escrow. Never pay directly outside the platform. Verify merchant CAC status before wire.",
    quickPrompts: [
      "📦 Requesting wholesale bulk quote for FMCG & electronics",
      "🚢 Sharing container freight cargo space from China/UK to Lagos",
      "🛡️ Request Escrow Officer assistance for a high-value transaction",
      "🏷️ Post a limited-time flash wholesale trade discount"
    ],
  },
  {
    id: "room_bethelincovibetv_tech_creative",
    name: "Tech, AI & Digital Creators Lounge",
    description: "Connect with graphic designers, software engineers, video editors, and digital promoters building on Bethel TV.",
    roomType: "community",
    avatarEmoji: "💻",
    badge: "Creative Hub",
    badgeColor: "bg-blue-500/15 text-blue-600 border-blue-500/30",
    pinnedNotice: "🎨 Showcase your creative portfolio, hire top Nigerian tech talent, and share AI video & design prompts.",
    quickPrompts: [
      "🎨 Looking for a graphic designer for brand logo & flyer",
      "💻 Software & web design collaboration opportunities",
      "🎥 Need promotional video editor for product reel",
      "✨ Share prompts & tips for Vixora Studio video generator"
    ],
  },
  {
    id: "room_bethelincovibetv_logistics",
    name: "Wholesale Logistics & Dispatch Hub",
    description: "Interstate delivery coordination, dispatch riders, warehousing, and nationwide parcel tracking.",
    roomType: "community",
    avatarEmoji: "🚢",
    badge: "Logistics Hub",
    badgeColor: "bg-amber-500/15 text-amber-600 border-amber-500/30",
    pinnedNotice: "🚚 Coordinate reliable doorstep dispatch across all 36 Nigerian states. Always request delivery waybill tracking.",
    quickPrompts: [
      "🚚 Need reliable dispatch rider in Ikeja / Lekki today",
      "📦 Interstate cargo waybill rates from Lagos to Kano / Port Harcourt",
      "🏪 Warehousing and fulfillment hub recommendations",
      "🛡️ Safe parcel insurance and tracking tips"
    ],
  },
];

export function isAIAdvisorChat(chatId: string): boolean {
  return AI_ADVISORS.some((a) => a.id === chatId || chatId.includes(a.id));
}

export function getAIAdvisorByChatId(chatId: string): AIAdvisorProfile | null {
  return AI_ADVISORS.find((a) => a.id === chatId || chatId.includes(a.id)) || null;
}

export function getDefaultOfficialRooms(): RealtimeChatRoom[] {
  return OFFICIAL_COMMUNITY_LOUNGES.map((l) => ({
    id: l.id,
    name: l.name,
    description: l.description,
    roomType: l.roomType,
    avatarEmoji: l.avatarEmoji,
    isOfficial: true,
    creatorId: "system_admin",
    adminIds: ["system_admin", "admin_lead"],
    participants: ["system_admin"],
    participantNames: { system_admin: "Bethelincovibe TV" },
    participantAvatars: { system_admin: "/logo.png" },
    onlyAdminsCanPost: false,
    onlyAdminsCanEditInfo: true,
    lastMessageText: l.pinnedNotice,
    lastMessageTime: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  }));
}

export function getDefaultAIAdvisorRooms(
  currentUserId: string,
  currentUserName: string,
  currentUserAvatar?: string
): RealtimeChatRoom[] {
  return AI_ADVISORS.map((adv) => ({
    id: `chat_ai_${adv.id}_${currentUserId}`,
    name: adv.name,
    description: `${adv.role} • ${adv.department}`,
    roomType: "direct",
    avatarUrl: adv.avatar,
    avatarEmoji: "🤖",
    isOfficial: true,
    creatorId: adv.id,
    adminIds: [adv.id],
    participants: [currentUserId, adv.id],
    participantNames: {
      [currentUserId]: currentUserName || "Entrepreneur",
      [adv.id]: adv.name,
    },
    participantAvatars: {
      [currentUserId]: currentUserAvatar || "",
      [adv.id]: adv.avatar,
    },
    onlyAdminsCanPost: false,
    onlyAdminsCanEditInfo: true,
    lastMessageText: adv.greeting,
    lastMessageTime: new Date().toISOString(),
    lastMessageSenderId: adv.id,
    lastMessageSenderName: adv.name,
    createdAt: new Date().toISOString(),
  }));
}

export async function generateAIAdvisorResponse(
  advisor: AIAdvisorProfile,
  userMessage: string,
  userName: string
): Promise<string> {
  const prompt = `${advisor.systemPrompt}

User Name: ${userName}
User Message: "${userMessage}"

Provide a direct, helpful, inspiring, and actionable response in 2-4 structured paragraphs or bullet points. Avoid markdown bold asterisks (* or **). Speak with clarity and professionalism.`;

  try {
    const ai = await getGeminiClient("chat_advisor");
    if (ai) {
      try {
        const res = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: [{ role: "user", parts: [{ text: prompt }] }],
        });
        if (res.text && res.text.trim()) {
          return res.text.replace(/\*\*/g, "").replace(/\*/g, "•").trim();
        }
      } catch {
        // fallback model
        const fallbackRes = await ai.models.generateContent({
          model: "gemini-flash-latest",
          contents: [{ role: "user", parts: [{ text: prompt }] }],
        });
        if (fallbackRes.text && fallbackRes.text.trim()) {
          return fallbackRes.text.replace(/\*\*/g, "").replace(/\*/g, "•").trim();
        }
      }
    }
  } catch (err) {
    console.warn("AI generation note:", err);
  }

  // High-value domain fallback response
  return `Hello ${userName}, thank you for reaching out to ${advisor.name} (${advisor.role}).

Regarding your inquiry: "${userMessage}"

1. Strategic Action: In Nigerian commerce and digital growth, speed, trust, and clear communication are essential. Ensure your business profile, pricing, and contact details are fully updated on Bethelincovibe TV.

2. Escrow & Safety: Always utilize our built-in Safe Escrow to protect high-value transactions and maintain verified buyer confidence.

3. Next Step: You can also explore our Learning Academy or request personalized branding in the Creative Studio. How else can I assist you right now?`;
}
