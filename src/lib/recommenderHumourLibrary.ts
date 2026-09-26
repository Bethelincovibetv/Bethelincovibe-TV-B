/**
 * AI Business Match Assistant - Humour & Dialogue Library
 * 
 * Provides psychologically engaging, witty, professional, and observant dialogue
 * for the 3D Business Match Specialist ("Maya").
 * 
 * Strict Privacy & Non-Creepy Directives:
 * - Only references permitted in-platform activity (browsing, searches, categories).
 * - Never claims external device access, camera, microphone, or off-platform tracking.
 */

export type HumourStyle = "adaptive" | "playful" | "friendly" | "professional" | "curious" | "subtle" | "confident";

export interface DialogueOutput {
  hook: string;
  observation: string;
  pitch: string;
  whyExplanation: string;
  tone: HumourStyle;
  emoji: string;
  badge: string;
}

interface DialogueTemplate {
  categoryKeywords: string[];
  intents: string[];
  playful: {
    hooks: string[];
    observations: string[];
    pitches: string[];
  };
  friendly: {
    hooks: string[];
    observations: string[];
    pitches: string[];
  };
  professional: {
    hooks: string[];
    observations: string[];
    pitches: string[];
  };
  curious: {
    hooks: string[];
    observations: string[];
    pitches: string[];
  };
}

export const HUMOUR_DIALOGUE_TEMPLATES: Record<string, DialogueTemplate> = {
  events: {
    categoryKeywords: ["event", "wedding", "cater", "party", "cake", "decor", "dj", "birthday", "food", "hospitality", "celebration"],
    intents: ["Planning an event", "Organizing a celebration", "Sourcing catering & decor"],
    playful: {
      hooks: [
        "Do you know what I've noticed? 👀",
        "Hold on... someone has a celebration in the works! 🎉",
        "You've visited enough event businesses to make me suspicious. 😂",
        "I'm detecting heavy party-planning energy over here! 🥳",
      ],
      observations: [
        "You've been checking out catering, decor, and celebration services like a master planner.",
        "Between the menus, decorators, and venues you've explored, the pattern is crystal clear.",
        "Don't worry, I'm not judging! 😂 I'm just very good at connecting the dots.",
      ],
      pitches: [
        "I found an exceptional verified business that can take the stress off your plate.",
        "Check out this top-rated vendor — they might just be the missing piece of your event.",
        "Here is a verified specialist ready to make your event unforgettable.",
      ],
    },
    friendly: {
      hooks: [
        "Planning something special? ✨",
        "I think I found your kind of event partner! 🎈",
        "Quick suggestion from your AI Match Specialist! 👋",
      ],
      observations: [
        "I noticed you've been exploring event and catering businesses on the platform.",
        "Based on your recent interest in party planning and celebration services...",
        "Finding reliable event vendors in Nigeria takes time, so I did some digging for you.",
      ],
      pitches: [
        "I matched you with a trusted business with great reviews and direct WhatsApp support.",
        "Take a look at this verified merchant — they specialize in exactly what you need.",
        "This business has proven delivery and excellent customer ratings.",
      ],
    },
    professional: {
      hooks: [
        "Recommended Business Match 💼",
        "Curated Vendor Introduction 🤝",
        "Specialist Recommendation 🎯",
      ],
      observations: [
        "Based on your recent navigation across event management, catering, and hospitality listings...",
        "In response to your browsing patterns in event production and vendor services...",
        "Our intelligent matchmaking engine identified a strong alignment with your recent requirements.",
      ],
      pitches: [
        "We recommend this accredited enterprise for quality execution and certified standards.",
        "This verified provider offers competitive pricing and vetted buyer protection.",
        "Review their portfolio and direct contact channels below.",
      ],
    },
    curious: {
      hooks: [
        "Okay… I think I know what you're looking for. 👀",
        "Interesting… you've been spending some quality time in event services.",
        "Psst! Let me guess — a big event is around the corner? 🧐",
      ],
      observations: [
        "You've been exploring decoration, culinary masters, and celebration experts.",
        "The pattern in your recent searches points straight to an upcoming event.",
      ],
      pitches: [
        "Skip the endless searching — this verified business is ready to deliver.",
        "I pulled up this verified partner because their service matches your current focus.",
      ],
    },
  },

  tech: {
    categoryKeywords: ["tech", "software", "website", "app", "developer", "coding", "it", "cloud", "digital", "branding", "seo", "cyber"],
    intents: ["Building a website or digital product", "Upgrading business tech & systems", "Scaling online infrastructure"],
    playful: {
      hooks: [
        "Building the next tech unicorn? 🦄",
        "I see you looking at tech solutions like someone with big digital plans. 💻",
        "Do you know what I've noticed? 👀 Tech innovation mode activated!",
      ],
      observations: [
        "You've been inspecting developer portfolios, app specialists, and IT services.",
        "You've browsed through several digital agencies and software builders today.",
        "I can tell you're looking for someone who actually writes clean code and delivers on time. 😂",
      ],
      pitches: [
        "I found a vetted tech powerhouse that can build your product without the headache.",
        "Here is a verified development team with a proven track record.",
        "Take a look at this business — they build scalable digital solutions with zero fluff.",
      ],
    },
    friendly: {
      hooks: [
        "Looking for reliable tech talent? 🚀",
        "Smart match for your tech project! 💡",
        "Here's a developer & tech agency you might like! 🛠️",
      ],
      observations: [
        "I noticed you've been browsing software development and digital agencies.",
        "Based on your searches for tech services and digital infrastructure...",
      ],
      pitches: [
        "This verified software company has top ratings and fast project turnaround.",
        "Connect directly with their team for a quote or project breakdown.",
      ],
    },
    professional: {
      hooks: [
        "Verified Technology Partner Match 🖥️",
        "Enterprise Digital Solution 📈",
      ],
      observations: [
        "Synthesizing your activity across technology, software engineering, and cloud services...",
        "Based on your demonstrated requirement for IT and software consulting...",
      ],
      pitches: [
        "This accredited technology firm meets platform verification criteria for enterprise delivery.",
        "Review their technical capabilities, case studies, and verified credentials.",
      ],
    },
    curious: {
      hooks: [
        "Hmm… looks like a major tech upgrade is underway. 🧐",
        "I noticed a clear focus on digital systems in your session.",
      ],
      observations: [
        "You've looked at multiple software and web development listings today.",
      ],
      pitches: [
        "This business specializes in custom web and mobile development for Nigerian businesses.",
      ],
    },
  },

  fashion: {
    categoryKeywords: ["fashion", "tailor", "dress", "luxury", "fabric", "jewelry", "shoes", "wear", "bespoke", "styling", "agbada", "suit"],
    intents: ["Looking for bespoke fashion & styling", "Sourcing luxury accessories", "Wardrobe upgrade"],
    playful: {
      hooks: [
        "Someone is about to step out in style! 👗✨",
        "I see that refined taste in bespoke fashion! 🕶️",
        "You've checked enough fashion houses to make Lagos Fashion Week jealous! 😂",
      ],
      observations: [
        "You've been admiring bespoke tailoring, traditional outfits, and luxury styling.",
        "Between the fabrics and styling services you've explored, your standard is clearly top-tier.",
      ],
      pitches: [
        "I found a verified designer whose craft matches your aesthetic perfectly.",
        "Check out this fashion house — pristine fitting and timely delivery guaranteed.",
      ],
    },
    friendly: {
      hooks: [
        "Found your next fashion designer! ✂️",
        "Elevate your wardrobe with this verified stylist! 🌟",
      ],
      observations: [
        "I noticed you've been checking out bespoke tailoring and fashion listings.",
      ],
      pitches: [
        "This fashion house specializes in custom fits with exceptional client reviews.",
      ],
    },
    professional: {
      hooks: [
        "Curated Fashion & Apparel Match 👔",
      ],
      observations: [
        "Based on your interest in bespoke apparel, luxury accessories, and styling...",
      ],
      pitches: [
        "This accredited fashion brand offers verified craftsmanship and buyer-protected orders.",
      ],
    },
    curious: {
      hooks: [
        "Curating a fresh look? 👀",
      ],
      observations: [
        "Your recent visits across fashion and tailoring listings show a clear eye for detail.",
      ],
      pitches: [
        "Here is a verified designer known for sharp tailoring and premium fabrics.",
      ],
    },
  },

  finance_legal: {
    categoryKeywords: ["cac", "tax", "legal", "lawyer", "accounting", "audit", "bookkeeping", "finance", "registration", "compliance"],
    intents: ["Registering a business or ensuring compliance", "Structuring business accounting", "Legal advisory"],
    playful: {
      hooks: [
        "Getting the paperwork locked down? Smart move! 📜",
        "Doing business the proper way — I respect the hustle! 💼",
      ],
      observations: [
        "You've been researching CAC registration, corporate law, and accounting experts.",
        "I can tell you're setting up solid legal foundations for your enterprise.",
      ],
      pitches: [
        "I found an accredited firm that handles filings and compliance smoothly.",
        "Skip the registration bottlenecks with this verified corporate specialist.",
      ],
    },
    friendly: {
      hooks: [
        "Need legal or accounting assistance? 📊",
        "Verified corporate services for your business! 🏛️",
      ],
      observations: [
        "I noticed you've been looking into business registration, tax, or legal consulting.",
      ],
      pitches: [
        "This accredited consultant helps Nigerian businesses navigate CAC and tax compliance easily.",
      ],
    },
    professional: {
      hooks: [
        "Certified Legal & Financial Advisory Match ⚖️",
      ],
      observations: [
        "Analysis of your browsing in regulatory compliance, corporate law, and accounting...",
      ],
      pitches: [
        "This verified professional firm provides verified audit, CAC, and advisory services.",
      ],
    },
    curious: {
      hooks: [
        "Setting up a new venture? 🏢",
      ],
      observations: [
        "Your recent activity indicates an interest in business registration and financial structuring.",
      ],
      pitches: [
        "Here is a verified firm with top compliance ratings on the platform.",
      ],
    },
  },

  solar_energy: {
    categoryKeywords: ["solar", "inverter", "battery", "power", "energy", "generator", "electricity", "panel"],
    intents: ["Setting up solar power & energy backup", "Upgrading commercial inverter systems", "Reducing power costs"],
    playful: {
      hooks: [
        "Saying goodbye to power outages forever? ⚡",
        "24/7 uninterrupted power incoming! ☀️",
      ],
      observations: [
        "You've been browsing solar panels, hybrid inverters, and lithium battery setups.",
        "No more generator noise — I see the clean energy vision! 😂",
      ],
      pitches: [
        "Here is a certified solar engineer with genuine warranty and fast installation.",
        "Check out this verified solar supplier for authentic tier-1 equipment.",
      ],
    },
    friendly: {
      hooks: [
        "Looking for dependable solar & power solutions? 🔋",
      ],
      observations: [
        "I noticed you've been exploring solar inverters and energy solutions on the platform.",
      ],
      pitches: [
        "This verified installer provides genuine warranties and nationwide setup.",
      ],
    },
    professional: {
      hooks: [
        "Certified Clean Energy & Inverter Match ⚡",
      ],
      observations: [
        "Based on your browsing across renewable energy and electrical infrastructure...",
      ],
      pitches: [
        "This accredited solar partner offers tier-1 components and certified installation.",
      ],
    },
    curious: {
      hooks: [
        "Upgrading your power setup? ☀️",
      ],
      observations: [
        "Your recent visits show strong intent toward solar and battery storage systems.",
      ],
      pitches: [
        "Here is a verified solar engineering business with proven installations.",
      ],
    },
  },

  logistics: {
    categoryKeywords: ["delivery", "dispatch", "logistics", "courier", "haulage", "shipping", "freight", "transport", "cargo"],
    intents: ["Sourcing dispatch & delivery", "Interstate freight & haulage", "Supply chain logistics"],
    playful: {
      hooks: [
        "Goods need to move fast? 🚚💨",
        "Need delivery without the drama? I got you! 📦",
      ],
      observations: [
        "You've been checking out dispatch riders, interstate trucks, and haulage services.",
      ],
      pitches: [
        "I matched you with a verified logistics partner known for speed and real-time tracking.",
      ],
    },
    friendly: {
      hooks: [
        "Reliable delivery partner match! 📦",
      ],
      observations: [
        "I noticed you've been looking into shipping and courier services on Bethelincovibe.",
      ],
      pitches: [
        "This courier service offers prompt pickup, verified riders, and safe transit.",
      ],
    },
    professional: {
      hooks: [
        "Verified Logistics & Freight Match 🚛",
      ],
      observations: [
        "Based on your requirements in supply chain, haulage, and dispatch services...",
      ],
      pitches: [
        "This verified logistics operator provides reliable transit across Nigerian routes.",
      ],
    },
    curious: {
      hooks: [
        "Moving inventory across town or state? 🛣️",
      ],
      observations: [
        "You've explored several transport and courier listings recently.",
      ],
      pitches: [
        "Check out this verified dispatch partner with excellent delivery ratings.",
      ],
    },
  },

  general: {
    categoryKeywords: [],
    intents: ["Discovering top verified businesses", "Exploring quality services", "Finding trusted partners"],
    playful: {
      hooks: [
        "Do you know what I've noticed? 👀",
        "I think I found exactly what you've been looking for! 🎯",
        "Don't worry, I'm not judging! 😂 I'm just good at noticing patterns.",
      ],
      observations: [
        "You've been exploring businesses in this category like someone who has a solid plan.",
        "Based on what you've been checking out on the platform today...",
        "I connected a few dots from your recent browsing, and this stood out.",
      ],
      pitches: [
        "I found a verified business that might actually make your life 10x easier.",
        "Check out this top-rated provider — they specialize in exactly what you need.",
        "Take a look at their verified profile and direct inquiry options.",
      ],
    },
    friendly: {
      hooks: [
        "Handpicked business recommendation! ✨",
        "Found something that might help you today! 🤝",
        "Quick introduction to a verified merchant! 👋",
      ],
      observations: [
        "Based on the businesses, products, and services you've been exploring here...",
        "I noticed you've spent time checking out providers in this field...",
      ],
      pitches: [
        "This verified partner has great reviews and active customer support.",
        "I think you'll appreciate the quality of service this merchant provides.",
      ],
    },
    professional: {
      hooks: [
        "Personalised Business Match 💼",
        "Accredited Enterprise Introduction 🌟",
      ],
      observations: [
        "Based on your recent navigation patterns across our business directory...",
        "Our matching algorithm identified high relevance between your activity and this listing...",
      ],
      pitches: [
        "We recommend reviewing their verified credentials, customer ratings, and service list.",
        "This business meets all platform quality and verification standards.",
      ],
    },
    curious: {
      hooks: [
        "Okay… I think I know what you're looking for. 👀",
        "Interesting… you've been spending some time in this category.",
      ],
      observations: [
        "You've explored multiple listings with similar offerings recently.",
      ],
      pitches: [
        "Here is a standout business that matches your current focus.",
      ],
    },
  },
};

/**
 * Generate context-aware dialogue for the AI Assistant
 */
export function generateMatchDialogue(params: {
  categoryName?: string;
  categorySlug?: string;
  keywords?: string[];
  inferredIntent?: string;
  businessName: string;
  style?: HumourStyle;
  signalsCount?: number;
}): DialogueOutput {
  const {
    categoryName = "Services",
    categorySlug = "",
    keywords = [],
    inferredIntent = "Exploring verified businesses",
    businessName,
    style = "adaptive",
    signalsCount = 3,
  } = params;

  // 1. Identify best category template
  let templateKey = "general";
  const searchStr = `${categoryName} ${categorySlug} ${keywords.join(" ")} ${inferredIntent}`.toLowerCase();

  for (const [key, tpl] of Object.entries(HUMOUR_DIALOGUE_TEMPLATES)) {
    if (key === "general") continue;
    if (tpl.categoryKeywords.some((kw) => searchStr.includes(kw))) {
      templateKey = key;
      break;
    }
  }

  const tpl = HUMOUR_DIALOGUE_TEMPLATES[templateKey] || HUMOUR_DIALOGUE_TEMPLATES.general;

  // 2. Select tone based on config / signals
  let effectiveTone: "playful" | "friendly" | "professional" | "curious" = "playful";
  if (style === "professional") {
    effectiveTone = "professional";
  } else if (style === "friendly") {
    effectiveTone = "friendly";
  } else if (style === "playful") {
    effectiveTone = "playful";
  } else if (style === "curious") {
    effectiveTone = "curious";
  } else {
    // Adaptive: switch based on category context
    if (templateKey === "finance_legal") {
      effectiveTone = Math.random() > 0.4 ? "professional" : "friendly";
    } else if (signalsCount >= 5) {
      effectiveTone = "playful"; // high confidence playfully calls out patterns
    } else {
      effectiveTone = Math.random() > 0.5 ? "playful" : "friendly";
    }
  }

  const tonePack = tpl[effectiveTone] || tpl.friendly;

  const randomItem = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)] || arr[0];

  const hook = randomItem(tonePack.hooks);
  const observation = randomItem(tonePack.observations);
  const pitch = randomItem(tonePack.pitches);

  // Transparent explanation for "Why am I seeing this?"
  const whyExplanation = `You're seeing this recommendation because you recently explored ${categoryName.toLowerCase()} and related verified listings with strong interest signals on the platform.`;

  const emojis: Record<string, string> = {
    events: "🎉",
    tech: "💻",
    fashion: "✨",
    finance_legal: "⚖️",
    solar_energy: "⚡",
    logistics: "🚚",
    general: "👀",
  };

  const badges: Record<string, string> = {
    playful: "Smart Pattern Match",
    friendly: "Assistant Recommendation",
    professional: "Verified Match",
    curious: "Intent Detection",
  };

  return {
    hook,
    observation,
    pitch,
    whyExplanation,
    tone: effectiveTone,
    emoji: emojis[templateKey] || "👀",
    badge: badges[effectiveTone] || "AI Smart Match",
  };
}
