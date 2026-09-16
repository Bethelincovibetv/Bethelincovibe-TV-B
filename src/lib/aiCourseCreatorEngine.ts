import { getGeminiClient } from "./aiCollaborationEngine";

export interface CourseFlashcard {
  id: string;
  front: string; // Term or question
  back: string; // Answer, definition, or strategy
  example?: string; // Nigerian business example
}

export interface CourseQuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface CourseModule {
  id: string;
  title: string;
  durationMinutes: number;
  summary: string;
  keyTakeaways: string[];
}

export interface AICreatedCourse {
  title: string;
  category: "Marketing" | "Business" | "Finance & Grants" | "Tech & Startup" | "E-Commerce" | "Real Estate" | string;
  description: string;
  instructorName: string;
  instructorTitle: string;
  priceNaira: number;
  durationMinutes: number;
  thumbnailUrl: string;
  youtubeUrl: string;
  level: "Beginner" | "Intermediate" | "Advanced";
  modules: CourseModule[];
  flashcards: CourseFlashcard[];
  quiz: CourseQuizQuestion[];
  keyOutcomes: string[];
}

// Curated high-resolution Pexels & Unsplash images for commercial education
const PEXELS_CATEGORY_IMAGES: Record<string, string[]> = {
  Marketing: [
    "https://images.pexels.com/photos/267350/pexels-photo-267350.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/905163/pexels-photo-905163.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/7688336/pexels-photo-7688336.jpeg?auto=compress&cs=tinysrgb&w=1200",
  ],
  Business: [
    "https://images.pexels.com/photos/3183197/pexels-photo-3183197.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/3184325/pexels-photo-3184325.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1181396/pexels-photo-1181396.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/3184360/pexels-photo-3184360.jpeg?auto=compress&cs=tinysrgb&w=1200",
  ],
  "Finance & Grants": [
    "https://images.pexels.com/photos/6694543/pexels-photo-6694543.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/53621/calculator-calculation-insurance-finance-53621.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/4386442/pexels-photo-4386442.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/6863183/pexels-photo-6863183.jpeg?auto=compress&cs=tinysrgb&w=1200",
  ],
  "Tech & Startup": [
    "https://images.pexels.com/photos/1181244/pexels-photo-1181244.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/3861969/pexels-photo-3861969.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1181675/pexels-photo-1181675.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/3182812/pexels-photo-3182812.jpeg?auto=compress&cs=tinysrgb&w=1200",
  ],
  "E-Commerce": [
    "https://images.pexels.com/photos/230544/pexels-photo-230544.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/4482900/pexels-photo-4482900.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/5632402/pexels-photo-5632402.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/3944405/pexels-photo-3944405.jpeg?auto=compress&cs=tinysrgb&w=1200",
  ],
  "Real Estate": [
    "https://images.pexels.com/photos/323780/pexels-photo-323780.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1396122/pexels-photo-1396122.jpeg?auto=compress&cs=tinysrgb&w=1200",
  ],
};

// Verified educational YouTube video resources for key business domains
const CURATED_EDUCATIONAL_VIDEOS: Record<string, string[]> = {
  Marketing: [
    "https://www.youtube.com/watch?v=nU-IIXBWlS4", // Digital marketing masterclass
    "https://www.youtube.com/watch?v=wX-yA7rG8v4", // Social media sales funnel
    "https://www.youtube.com/watch?v=xV_wTjX4s_E", // WhatsApp marketing & copywriting
  ],
  Business: [
    "https://www.youtube.com/watch?v=2e6iQJ1p9R8", // Business Model Generation
    "https://www.youtube.com/watch?v=bNpx7gpSqbY", // How to Scale Small Businesses
    "https://www.youtube.com/watch?v=f60dheI4ARg", // Operations & Supply Chain
  ],
  "Finance & Grants": [
    "https://www.youtube.com/watch?v=WEDIj9JBTC8", // Small Business Accounting & Bookkeeping
    "https://www.youtube.com/watch?v=b4aYgE_fM3A", // Cash Flow Management & Margins
  ],
  "Tech & Startup": [
    "https://www.youtube.com/watch?v=5MgBikgcWnT", // AI for Business Automation
    "https://www.youtube.com/watch?v=kqtD5dpn9C8", // No-Code Tech Building
  ],
  "E-Commerce": [
    "https://www.youtube.com/watch?v=kYJ0hR9VpA4", // E-commerce Product Sourcing & Logistics
    "https://www.youtube.com/watch?v=7uK0ZkC2yJ4", // High-Converting Product Pages
  ],
  "Real Estate": [
    "https://www.youtube.com/watch?v=kO1kgl0p-Hw", // Real Estate Due Diligence & Investment
  ],
};

export function getPexelsImageForCategory(category: string, indexSeed = 0): string {
  const normCat = Object.keys(PEXELS_CATEGORY_IMAGES).find(
    (k) => k.toLowerCase() === (category || "").toLowerCase()
  ) || "Marketing";

  const list = PEXELS_CATEGORY_IMAGES[normCat] || PEXELS_CATEGORY_IMAGES["Marketing"];
  return list[Math.abs(indexSeed) % list.length];
}

export function getCuratedVideoForCategory(category: string, indexSeed = 0): string {
  const normCat = Object.keys(CURATED_EDUCATIONAL_VIDEOS).find(
    (k) => k.toLowerCase() === (category || "").toLowerCase()
  ) || "Marketing";

  const list = CURATED_EDUCATIONAL_VIDEOS[normCat] || CURATED_EDUCATIONAL_VIDEOS["Marketing"];
  return list[Math.abs(indexSeed) % list.length];
}

export interface GenerateCourseParams {
  topic: string;
  category?: string;
  priceNaira?: number;
  level?: "Beginner" | "Intermediate" | "Advanced";
  targetAudience?: string;
  customVideoUrl?: string;
  videoContextOrTranscript?: string;
  flashcardCount?: number;
  quizCount?: number;
}

/**
 * AI Course Creator Agent
 * Generates a full masterclass course complete with modules, high-yield interactive flashcards (8-15 cards),
 * multiple choice quizzes with scoring and explanations, and Pexels cover imagery.
 */
export async function generateAICourse(params: GenerateCourseParams): Promise<AICreatedCourse> {
  const ai = await getGeminiClient("ai_course_creator");
  const category = params.category || "Marketing";
  const price = params.priceNaira ?? 0;
  const level = params.level || "Beginner";
  const requestedCards = Math.max(8, Math.min(15, params.flashcardCount || 10));
  const requestedQuizzes = Math.max(5, Math.min(10, params.quizCount || 6));

  const systemInstruction = `You are the Lead Curriculum Architect & Masterclass AI Engine for Bethelincovibe TV Learning Hub.
Your role is to design elite, highly structured, comprehensive masterclasses for African and Nigerian entrepreneurs, creators, marketers, and business owners.

MANDATORY GENERATION STANDARDS:
1. Video Grounding & Real Context: Ground all lessons, flashcards, and quizzes deeply in the provided video URL or topic context: "${params.customVideoUrl || params.topic}".
2. High-Yield Flashcards (Generate EXACTLY ${requestedCards} distinct flashcards):
   - Do NOT generate just 3 or generic definitions.
   - Each flashcard must contain:
     * "front": A clear, high-impact concept, strategic question, or formula from the video curriculum.
     * "back": An in-depth, actionable explanation (2-4 sentences) outlining the core mechanism, strategy, or execution rule.
     * "example": A concrete, realistic Nigerian / African commercial market application (e.g. Lagos retail, WhatsApp orders, Alaba electronics, Abuja logistics, Naira pricing, POS cash flows).
3. Comprehensive Quiz (Generate EXACTLY ${requestedQuizzes} multiple-choice scenario questions):
   - 4 distinct options per question.
   - Realistic situational dilemma or case study testing real decision-making.
   - 0-indexed correct answer.
   - In-depth, educational explanation detailing WHY the right answer works in practice.
4. Structured Modules:
   - Provide 3 to 5 clear, sequential learning modules with durations in minutes, actionable summaries, and bulleted takeaways.
5. Tone: Energetic, authoritative, professional, and practical. Avoid generic fluff.

Schema Requirements:
{
  "title": "string",
  "category": "Marketing" | "Business" | "Finance & Grants" | "Tech & Startup" | "E-Commerce" | "Real Estate",
  "description": "string (2-3 structured paragraphs explaining the masterclass value proposition and target learners)",
  "instructorName": "string (e.g. Chioma Adebayo, Emeka Okafor, Babatunde Adeleke)",
  "instructorTitle": "string (e.g. Lead Growth Strategist & E-Commerce Director)",
  "durationMinutes": number (between 45 and 180),
  "level": "Beginner" | "Intermediate" | "Advanced",
  "keyOutcomes": ["string", "string", "string", "string", "string"],
  "modules": [
    {
      "id": "mod_1",
      "title": "string",
      "durationMinutes": number,
      "summary": "string",
      "keyTakeaways": ["string", "string", "string"]
    }
  ],
  "flashcards": [
    {
      "id": "card_1",
      "front": "string",
      "back": "string",
      "example": "string"
    }
  ],
  "quiz": [
    {
      "id": "quiz_1",
      "question": "string",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": number,
      "explanation": "string"
    }
  ]
}`;

  const prompt = `Create a world-class, comprehensive masterclass course on: "${params.topic}".
Category: ${category}
Experience Level: ${level}
Target Audience: ${params.targetAudience || "Nigerian entrepreneurs, SMEs, sales professionals, tech founders, and online creators"}
Price: ₦${price.toLocaleString()}
${params.customVideoUrl ? `Grounding Video URL: ${params.customVideoUrl}` : ""}
${params.videoContextOrTranscript ? `Video Context / Key Notes:\n${params.videoContextOrTranscript}` : ""}

Please generate exactly ${requestedCards} high-quality flashcards and ${requestedQuizzes} scenario quiz questions matching this course.`;

  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          temperature: 0.7,
        },
      });

      const text = response.text || "{}";
      const parsed = JSON.parse(text);

      const seed = Math.floor(Math.random() * 10);
      const chosenThumbnail = getPexelsImageForCategory(parsed.category || category, seed);
      const chosenVideo = params.customVideoUrl || getCuratedVideoForCategory(parsed.category || category, seed);

      // Validate flashcards count, ensuring high quality
      const flashcards: CourseFlashcard[] = Array.isArray(parsed.flashcards) && parsed.flashcards.length >= 6
        ? parsed.flashcards.map((fc: any, idx: number) => ({
            id: fc.id || `fc_${idx + 1}`,
            front: fc.front || `Core Principle #${idx + 1}`,
            back: fc.back || "Strategic execution guideline for this concept.",
            example: fc.example || "Apply this strategy to optimize your product positioning and Naira cash flows.",
          }))
        : getHighQualityFallbackFlashcards(params.topic, category);

      const quiz: CourseQuizQuestion[] = Array.isArray(parsed.quiz) && parsed.quiz.length >= 4
        ? parsed.quiz.map((q: any, idx: number) => ({
            id: q.id || `qz_${idx + 1}`,
            question: q.question || `Scenario Question #${idx + 1}`,
            options: Array.isArray(q.options) && q.options.length === 4 ? q.options : ["Option A", "Option B", "Option C", "Option D"],
            correctIndex: typeof q.correctIndex === "number" ? q.correctIndex : 0,
            explanation: q.explanation || "This is the optimal strategic decision based on core business fundamentals.",
          }))
        : getHighQualityFallbackQuiz(params.topic);

      return {
        title: parsed.title || params.topic,
        category: parsed.category || category,
        description: parsed.description || `Comprehensive masterclass on ${params.topic}.`,
        instructorName: parsed.instructorName || "Adaeze Nwachukwu",
        instructorTitle: parsed.instructorTitle || "Growth & Operations Director",
        priceNaira: price,
        durationMinutes: parsed.durationMinutes || 75,
        thumbnailUrl: chosenThumbnail,
        youtubeUrl: chosenVideo,
        level: parsed.level || level,
        modules: Array.isArray(parsed.modules) && parsed.modules.length > 0 ? parsed.modules : [
          {
            id: "mod_1",
            title: "Market Fundamentals & Opportunity Blueprint",
            durationMinutes: 25,
            summary: "Comprehensive framework for identifying customer willingness to pay and establishing dominant positioning.",
            keyTakeaways: ["Customer persona mapping", "Validation without high upfront burn", "Naira margin optimization"],
          },
          {
            id: "mod_2",
            title: "Customer Acquisition & Conversion Funnels",
            durationMinutes: 30,
            summary: "Building predictable sales channels using direct-response video, WhatsApp automation, and retargeting.",
            keyTakeaways: ["Direct-response copy hooks", "WhatsApp catalog workflows", "Social proof integration"],
          },
          {
            id: "mod_3",
            title: "Operational Scaling & Cash Flow Defense",
            durationMinutes: 25,
            summary: "Protecting margins against FX shifts, managing inventory velocity, and scaling repeat transactions.",
            keyTakeaways: ["Supplier payment terms", "Cash buffer management", "Customer lifetime value acceleration"],
          },
        ],
        flashcards,
        quiz,
        keyOutcomes: Array.isArray(parsed.keyOutcomes) && parsed.keyOutcomes.length > 0
          ? parsed.keyOutcomes
          : [
              "Master end-to-end execution with zero guesswork",
              "Deploy practical frameworks that drive real profit in Naira",
              "Avoid expensive trial-and-error mistakes common in African markets",
              "Establish predictable customer acquisition channels",
            ],
      };
    } catch (apiErr: any) {
      console.warn("[AICourseCreator] API Generation warning, using high-yield fallback:", apiErr);
    }
  }

  // High quality offline / resilient fallback with 8+ flashcards and structured modules
  const seed = Math.floor(Math.random() * 5);
  return {
    title: params.topic,
    category: category,
    description: `Comprehensive masterclass on ${params.topic} designed specifically for African and Nigerian entrepreneurs, with step-by-step video frameworks, ${requestedCards} active-recall flashcards, and interactive knowledge testing.`,
    instructorName: "Chinedu Okafor",
    instructorTitle: "Senior Commercial Strategy Advisor",
    priceNaira: price,
    durationMinutes: 80,
    thumbnailUrl: getPexelsImageForCategory(category, seed),
    youtubeUrl: params.customVideoUrl || getCuratedVideoForCategory(category, seed),
    level: level,
    modules: [
      {
        id: "mod_1",
        title: "Market Fundamentals & Value Proposition",
        durationMinutes: 25,
        summary: "How to identify customer willingness to pay and position your offering to dominate the market.",
        keyTakeaways: ["Customer persona mapping", "Validation without upfront capital", "Competitive differentiation"],
      },
      {
        id: "mod_2",
        title: "High-Margin Execution & Sales Funnels",
        durationMinutes: 30,
        summary: "Streamlining operations, pricing for high gross margins, and driving continuous online and offline sales.",
        keyTakeaways: ["Value-based pricing formulas", "WhatsApp & social selling loops", "Lead conversion rate optimization"],
      },
      {
        id: "mod_3",
        title: "Risk Management & Longevity",
        durationMinutes: 25,
        summary: "Shielding your cash flow against inflation, FX volatility, and logistics bottlenecks in Nigeria.",
        keyTakeaways: ["Supplier diversification", "Cash buffer management", "Repeat customer retention"],
      },
    ],
    flashcards: getHighQualityFallbackFlashcards(params.topic, category),
    quiz: getHighQualityFallbackQuiz(params.topic),
    keyOutcomes: [
      "Construct an airtight go-to-market strategy for this domain",
      "Implement repeatable customer acquisition and retention channels",
      "Protect cash flow and maintain healthy gross profit margins",
      "Deploy systematic frameworks directly from the video course",
    ],
  };
}

/**
 * Returns a comprehensive set of 8 to 10 high-quality flashcards for fallback
 */
function getHighQualityFallbackFlashcards(topic: string, category: string): CourseFlashcard[] {
  return [
    {
      id: "fc_1",
      front: "Value-Based Pricing Model",
      back: "Setting prices primarily on the perceived economic and emotional value delivered to the buyer, rather than merely marking up cost.",
      example: "Charging ₦150,000 for emergency same-day cold-room repair because saving the client ₦2,500,000 in perishable seafood makes the fee an obvious bargain.",
    },
    {
      id: "fc_2",
      front: "Direct-Response Conversion Hook",
      back: "A compelling opening hook designed to grab attention within 3 seconds and drive the viewer to take an immediate, measurable action.",
      example: "An Instagram video opening with 'Stop losing 30% of your sales at checkout—here is how top Lagos brands fix cart abandonment,' with a link to WhatsApp.",
    },
    {
      id: "fc_3",
      front: "Customer Lifetime Value (LTV)",
      back: "The total gross profit generated by a single customer relationship across all repeat purchases over their entire lifespan with your business.",
      example: "A customer who spends ₦30,000 every month on skincare products over 2 years generates an LTV of ₦720,000.",
    },
    {
      id: "fc_4",
      front: "Minimum Viable Offer (MVO)",
      back: "The simplest, fastest package of your product or service that solves a painful problem for a paying customer, allowing you to validate demand before heavy capital investment.",
      example: "Taking 10 pre-orders for an imported luxury blender via WhatsApp before committing funds to ship a full 20ft container from Guangzhou.",
    },
    {
      id: "fc_5",
      front: "Conversion Rate Optimization (CRO)",
      back: "The continuous process of testing and improving page headlines, proof elements, and checkout friction to convert more visitors into paying buyers.",
      example: "Adding video proof of unboxing and customer voice notes to an e-commerce page, lifting conversion from 1.5% to 4.2% on the same ad budget.",
    },
    {
      id: "fc_6",
      front: "Gross Margin Shielding",
      back: "Calculating and protecting the margin buffer required to absorb sudden foreign exchange shifts, shipping surges, and local inflation without running at a loss.",
      example: "Pricing imported inventory with a minimum 45% gross margin buffer so an unexpected 10% currency devaluation doesn't wipe out business profit.",
    },
    {
      id: "fc_7",
      front: "Customer Acquisition Cost (CAC)",
      back: "The total marketing and sales expense required to convince a new lead to make their first purchase.",
      example: "Spending ₦50,000 on Facebook and Instagram ads to acquire 20 new customers gives a CAC of ₦2,500 per customer.",
    },
    {
      id: "fc_8",
      front: "Lead Nurture & WhatsApp Broadcast Cadence",
      back: "A structured follow-up sequence that provides educational value and social proof before making a direct, limited-time promotion.",
      example: "Sending 2 helpful market insights per week on WhatsApp status followed by a Friday exclusive discount code for verified subscribers.",
    },
    {
      id: "fc_9",
      front: "Risk Reversal (Guarantees & Proof)",
      back: "Removing the customer's perceived purchase risk through money-back guarantees, clear replacement policies, or pay-on-delivery in select locations.",
      example: "Offering a '7-Day No-Hassle Exchange Guarantee' on fashion items in Lagos, which dramatically increases conversion rates among first-time buyers.",
    },
  ];
}

/**
 * Returns scenario-based quiz questions for fallback
 */
function getHighQualityFallbackQuiz(topic: string): CourseQuizQuestion[] {
  return [
    {
      id: "qz_1",
      question: "When launching a new business or product in Nigeria, what is the primary purpose of an MVP (Minimum Viable Product)?",
      options: [
        "To build the most complex and expensive software platform upfront",
        "To validate customer demand and real willingness to pay with minimal financial exposure",
        "To hire a massive sales team before securing a single customer",
        "To purchase long-term commercial lease space immediately",
      ],
      correctIndex: 1,
      explanation: "An MVP validates core value propositions with actual paying customers before you risk large capital investments.",
    },
    {
      id: "qz_2",
      question: "Which pricing strategy provides the greatest margin defense against local inflation and currency volatility?",
      options: [
        "Fixed prices that never adjust even when supplier wholesale costs increase",
        "Value-based pricing tied to quantifiable customer ROI combined with flexible supplier terms",
        "Selling at a loss hoping to win market share by being the cheapest seller",
        "Under-cutting every competitor by 50% regardless of your cost of goods sold",
      ],
      correctIndex: 1,
      explanation: "Value-based pricing aligns your fee with the value delivered to the buyer rather than cost markups, preserving healthy profitability.",
    },
    {
      id: "qz_3",
      question: "What is the most critical metric to verify before scaling advertising spend on a social media sales funnel?",
      options: [
        "The number of likes and comments on your promotional video",
        "That Customer Lifetime Value (LTV) substantially exceeds Customer Acquisition Cost (CAC)",
        "The length of the video description text",
        "The number of followers your page gained this week",
      ],
      correctIndex: 1,
      explanation: "When LTV is significantly higher than CAC (ideally 3x+), every Naira invested in advertising produces sustainable, scalable profit.",
    },
    {
      id: "qz_4",
      question: "How can an online retailer in Lagos reduce cart abandonment and increase checkout conversion most effectively?",
      options: [
        "Hiding delivery fees until the final confirmation page",
        "Adding clear video product demonstrations, customer reviews, and responsive WhatsApp instant support",
        "Making registration mandatory with a 15-field form",
        "Removing all photos from the checkout page",
      ],
      correctIndex: 1,
      explanation: "Social proof, visual clarity, and fast real-time chat remove hesitation and friction at the crucial moment of purchase.",
    },
    {
      id: "qz_5",
      question: "What is the primary advantage of building an owned WhatsApp broadcast list over relying solely on social media algorithms?",
      options: [
        "Direct, uninhibited communication with high open rates that algorithm changes cannot suppress",
        "You never have to create any marketing content again",
        "It guarantees 100% of subscribers will purchase every item",
        "WhatsApp allows unlimited spam messaging with no rules",
      ],
      correctIndex: 0,
      explanation: "An owned contact list gives your business direct customer access without paying platforms repeatedly to reach your own audience.",
    },
  ];
}


/**
 * Helper to encode course metadata (modules, flashcards, quiz, outcomes)
 * safely into the database description string while keeping clean readable markdown.
 */
export function encodeCourseMetadata(course: AICreatedCourse): string {
  const metadata = {
    modules: course.modules,
    flashcards: course.flashcards,
    quiz: course.quiz,
    keyOutcomes: course.keyOutcomes,
    instructorTitle: course.instructorTitle,
    level: course.level,
  };

  const jsonBlock = `\n\n<!--COURSE_METADATA:${JSON.stringify(metadata)}-->`;
  return `${course.description}${jsonBlock}`;
}

/**
 * Helper to decode course metadata from description string.
 */
export function decodeCourseMetadata(description: string | null): {
  cleanDescription: string;
  modules: CourseModule[];
  flashcards: CourseFlashcard[];
  quiz: CourseQuizQuestion[];
  keyOutcomes: string[];
  instructorTitle: string;
  level: string;
} {
  if (!description) {
    return {
      cleanDescription: "",
      modules: [],
      flashcards: [],
      quiz: [],
      keyOutcomes: [],
      instructorTitle: "Instructor",
      level: "All Levels",
    };
  }

  const match = description.match(/<!--COURSE_METADATA:(.*?)-->/);
  if (!match) {
    return {
      cleanDescription: description,
      modules: [
        {
          id: "m1",
          title: "Course Overview & Core Framework",
          durationMinutes: 45,
          summary: "Complete breakdown of key principles and strategies.",
          keyTakeaways: ["Core execution principles", "Practical application"],
        },
      ],
      flashcards: [
        {
          id: "fc_default",
          front: "Core Concept",
          back: "Key lesson principle to apply in your business.",
          example: "Apply this directly to improve customer retention and profit margins.",
        },
      ],
      quiz: [
        {
          id: "qz_default",
          question: "What is the most important step after completing this course module?",
          options: [
            "Take immediate action and apply the framework to real business scenarios",
            "Wait 6 months before trying anything",
            "Ignore all lessons",
            "Delete your business plan",
          ],
          correctIndex: 0,
          explanation: "Consistent immediate implementation is what transforms knowledge into revenue.",
        },
      ],
      keyOutcomes: ["Master practical real-world execution", "Gain actionable skills you can use today"],
      instructorTitle: "Industry Specialist",
      level: "All Levels",
    };
  }

  try {
    const meta = JSON.parse(match[1]);
    const clean = description.replace(/<!--COURSE_METADATA:.*?-->/, "").trim();
    return {
      cleanDescription: clean,
      modules: meta.modules || [],
      flashcards: meta.flashcards || [],
      quiz: meta.quiz || [],
      keyOutcomes: meta.keyOutcomes || [],
      instructorTitle: meta.instructorTitle || "Instructor",
      level: meta.level || "Beginner",
    };
  } catch (e) {
    return {
      cleanDescription: description,
      modules: [],
      flashcards: [],
      quiz: [],
      keyOutcomes: [],
      instructorTitle: "Instructor",
      level: "All Levels",
    };
  }
}
