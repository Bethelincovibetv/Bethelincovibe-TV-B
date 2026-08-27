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
}

/**
 * AI Course Creator Agent
 * Generates a full masterclass course complete with modules, interactive flashcards,
 * multiple choice quizzes with scoring and explanations, and Pexels cover imagery.
 */
export async function generateAICourse(params: GenerateCourseParams): Promise<AICreatedCourse> {
  const ai = getGeminiClient();
  const category = params.category || "Marketing";
  const price = params.priceNaira ?? 0;
  const level = params.level || "Beginner";

  const systemInstruction = `You are the Lead Curriculum Architect & AI Course Creator Agent for Bethelincovibe TV Learning Hub.
Your role is to craft high-impact, practical, and highly engaging masterclass courses for Nigerian and African entrepreneurs, creators, marketers, and business owners.

When creating a course, you MUST return a valid JSON object matching the schema below:
- Include 3 to 4 modular lessons.
- Include 5 to 6 interactive flashcards for active recall (term, concise definition, and a practical Nigerian business example).
- Include 4 to 5 multiple-choice quiz questions with 4 distinct options, the 0-indexed correct answer, and an in-depth educational explanation.
- Include 4 specific actionable key outcomes.
- Keep the language energetic, highly practical, Naira-conscious, and tailored to market realities in Lagos, Nigeria.

Schema:
{
  "title": "string",
  "category": "Marketing" | "Business" | "Finance & Grants" | "Tech & Startup" | "E-Commerce" | "Real Estate",
  "description": "string (2-3 paragraphs explaining the masterclass and who it helps)",
  "instructorName": "string (e.g. Chioma Adebayo or Emeka Okafor)",
  "instructorTitle": "string (e.g. Senior Digital Strategist & Growth Lead)",
  "durationMinutes": number (between 45 and 180),
  "level": "Beginner" | "Intermediate" | "Advanced",
  "keyOutcomes": ["string", "string", "string", "string"],
  "modules": [
    {
      "id": "mod_1",
      "title": "string",
      "durationMinutes": number,
      "summary": "string",
      "keyTakeaways": ["string", "string"]
    }
  ],
  "flashcards": [
    {
      "id": "card_1",
      "front": "string (Key Concept or Question)",
      "back": "string (Clear Strategy / Definition)",
      "example": "string (Practical Lagos market case)"
    }
  ],
  "quiz": [
    {
      "id": "quiz_1",
      "question": "string",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": number (0-3),
      "explanation": "string"
    }
  ]
}`;

  const prompt = `Create a world-class, practical course on: "${params.topic}".
Category: ${category}
Experience Level: ${level}
Target Audience: ${params.targetAudience || "Nigerian entrepreneurs, SMEs, sales professionals, and startup founders"}
Price: ₦${price.toLocaleString()}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
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

    return {
      title: parsed.title || params.topic,
      category: parsed.category || category,
      description: parsed.description || `Comprehensive masterclass on ${params.topic}.`,
      instructorName: parsed.instructorName || "Adaeze Nwachukwu",
      instructorTitle: parsed.instructorTitle || "Growth & Operations Director",
      priceNaira: price,
      durationMinutes: parsed.durationMinutes || 60,
      thumbnailUrl: chosenThumbnail,
      youtubeUrl: chosenVideo,
      level: parsed.level || level,
      modules: parsed.modules || [
        {
          id: "mod_1",
          title: "Foundations & Strategy Blueprint",
          durationMinutes: 20,
          summary: "Core framework for mastering this topic in the Nigerian market.",
          keyTakeaways: ["Clear market positioning", "Naira margin optimization"],
        },
      ],
      flashcards: parsed.flashcards || [
        {
          id: "fc_1",
          front: "What is Customer Lifetime Value (LTV)?",
          back: "The total revenue a business can reasonably expect from a single customer account throughout their relationship.",
          example: "In a Lagos fashion boutique, a repeat shopper spending ₦50,000 every quarter has an annual LTV of ₦200,000.",
        },
      ],
      quiz: parsed.quiz || [
        {
          id: "qz_1",
          question: "Which of the following is the most effective way to validate customer demand before mass purchasing inventory?",
          options: [
            "Order 1,000 units immediately to get wholesale discount",
            "Run a test pre-order campaign on WhatsApp or Instagram with a small deposit",
            "Rely only on family opinions",
            "Wait until competitors sell out",
          ],
          correctIndex: 1,
          explanation: "Collecting pre-orders or intent deposits confirms real willingness to pay with zero unsold dead inventory risk.",
        },
      ],
      keyOutcomes: parsed.keyOutcomes || [
        "Master end-to-end execution with zero guesswork",
        "Deploy practical formulas that drive real profit in Naira",
        "Avoid high-cost mistakes common in the Nigerian ecosystem",
      ],
    };
  } catch (err: any) {
    // Intelligent fallback creation if offline/error
    const seed = Math.floor(Math.random() * 5);
    return {
      title: params.topic,
      category: category,
      description: `Comprehensive masterclass on ${params.topic} designed specifically for African and Nigerian entrepreneurs, with step-by-step video frameworks, active-recall flashcards, and interactive knowledge testing.`,
      instructorName: "Chinedu Okafor",
      instructorTitle: "Commercial Strategy Advisor",
      priceNaira: price,
      durationMinutes: 75,
      thumbnailUrl: getPexelsImageForCategory(category, seed),
      youtubeUrl: params.customVideoUrl || getCuratedVideoForCategory(category, seed),
      level: level,
      modules: [
        {
          id: "mod_1",
          title: "Market Fundamentals & Validation",
          durationMinutes: 25,
          summary: "How to identify customer willingness to pay and position your offering.",
          keyTakeaways: ["Customer persona mapping", "Validation without upfront capital"],
        },
        {
          id: "mod_2",
          title: "High-Margin Execution & Scaling",
          durationMinutes: 30,
          summary: "Streamlining operations, pricing for profit, and driving continuous sales.",
          keyTakeaways: ["Pricing psychology", "WhatsApp & social selling loops"],
        },
        {
          id: "mod_3",
          title: "Risk Management & Longevity",
          durationMinutes: 20,
          summary: "Shielding your cash flow against inflation, FX volatility, and logistics bottlenecks.",
          keyTakeaways: ["Supplier diversification", "Cash buffer management"],
        },
      ],
      flashcards: [
        {
          id: "fc_1",
          front: "Value-Based Pricing",
          back: "Setting prices primarily on the perceived or estimated value of a product/service to the customer rather than on cost of production.",
          example: "Charging ₦150,000 for emergency same-day cold-room repair because saving the client ₦2,000,000 in spoiled seafood makes the price a bargain.",
        },
        {
          id: "fc_2",
          front: "Direct-Response Marketing",
          back: "Marketing designed to elicit an instant response by encouraging prospects to take a specific action (e.g. Chat on WhatsApp, Buy Now).",
          example: "An Instagram video showing a waterproof shoe demo with a direct link to a WhatsApp catalog for immediate order.",
        },
        {
          id: "fc_3",
          front: "Conversion Rate Optimization (CRO)",
          back: "The systematic process of increasing the percentage of website or sales page visitors who take a desired action.",
          example: "Adding video proof and customer testimonials that lifts conversion from 2% to 5%, doubling revenue with same ad spend.",
        },
      ],
      quiz: [
        {
          id: "qz_1",
          question: "When launching a new business in Nigeria, what is the primary goal of your Minimum Viable Product (MVP)?",
          options: [
            "To build the most expensive app possible",
            "To test key business hypotheses and validate customer willingness to pay with minimal resources",
            "To hire 50 employees before getting a single customer",
            "To purchase 2 years of office space",
          ],
          correctIndex: 1,
          explanation: "An MVP exists to validate demand rapidly with lowest possible financial exposure.",
        },
        {
          id: "qz_2",
          question: "Which pricing strategy protects profitability best in an inflationary environment?",
          options: [
            "Fixed prices that never change regardless of supply cost",
            "Value-based pricing tied to client ROI combined with agile supplier renegotiation",
            "Selling at a loss hoping for volume",
            "Under-cutting all competitors by 50%",
          ],
          correctIndex: 1,
          explanation: "Value-based pricing aligns your fees with the outcome you deliver while allowing margin resilience.",
        },
      ],
      keyOutcomes: [
        "Construct an airtight go-to-market strategy",
        "Implement repeatable sales acquisition channels",
        "Protect cash flow and maintain healthy gross margins",
      ],
    };
  }
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
