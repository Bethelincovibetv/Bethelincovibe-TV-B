import { getGeminiClient } from "@/lib/aiCollaborationEngine";
import { supabase } from "@/integrations/supabase/client";

export interface BusinessQuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  category: string;
  pointsReward: number;
}

export interface UserQuizProgress {
  userId: string;
  category: string;
  totalPointsEarned: number;
  quizzesCompletedToday: number;
  streakDays: number;
  lastQuizDate: string;
  isPaidAutomatedActive: boolean;
  dailyPointsLimit: number;
  quizHistory: Array<{
    date: string;
    questionId: string;
    score: number;
    points: number;
  }>;
}

// Built-in verified high-converting Nigerian commercial knowledge questions per sector
export const CATEGORY_QUIZ_PRESETS: Record<string, BusinessQuizQuestion[]> = {
  "technology-software": [
    {
      id: "tech_q1",
      question: "Which WhatsApp Business feature drives the highest conversion for Lagos tech SMEs?",
      options: [
        "Automated Quick Replies with interactive catalogs and Paystack checkout links",
        "Sending massive bulk spam messages to random groups",
        "Changing profile picture 10 times a day",
        "Disabling message read receipts",
      ],
      correctIndex: 0,
      explanation: "Standardized catalog funnels and instant Paystack links convert up to 45% faster by reducing customer friction.",
      category: "Technology & Software",
      pointsReward: 50,
    },
    {
      id: "tech_q2",
      question: "When deploying a cloud SaaS application in Nigeria, what is the best way to handle intermittent internet latency?",
      options: [
        "Optimistic UI updates, service workers, and client-side caching",
        "Blocking the screen until all network calls finish",
        "Reloading the entire browser tab on every button click",
        "Deleting the local database on error",
      ],
      correctIndex: 0,
      explanation: "Optimistic UI and cached service workers provide instant feedback even in low-bandwidth network environments.",
      category: "Technology & Software",
      pointsReward: 50,
    },
  ],
  "fashion-luxury": [
    {
      id: "fashion_q1",
      question: "What is the key differentiator between Grade A and Cream Thrift Bales imported from the UK?",
      options: [
        "Cream bales contain nearly new designer items with original tags and zero stains",
        "Cream bales are strictly unwashed kitchen towels",
        "Grade A bales have 80% torn items",
        "There is no difference in wholesale profit margin",
      ],
      correctIndex: 0,
      explanation: "Cream bales yield the highest retail boutique markup in Lagos (up to 300% profit) because items have pristine tags and zero wear.",
      category: "Fashion & Luxury",
      pointsReward: 50,
    },
    {
      id: "fashion_q2",
      question: "What is the recommended turnaround time for bespoke native tailoring to maintain client trust?",
      options: [
        "3 to 5 business days with scheduled midpoint fitting updates",
        "6 months without answering phone calls",
        "Delivering the cloth on the morning of the wedding without fitting",
        "Only when the client complains to the police",
      ],
      correctIndex: 0,
      explanation: "Proactive communication and a 3-5 day turnaround build long-term repeat clientele and high-ticket referrals.",
      category: "Fashion & Luxury",
      pointsReward: 50,
    },
  ],
  "food-catering-events": [
    {
      id: "food_q1",
      question: "For outdoor Lagos event catering, what is the safest food temperature holding practice?",
      options: [
        "Maintaining hot dishes above 60°C in chafing fuel dishes throughout the event",
        "Leaving food exposed to direct sunlight for 8 hours",
        "Re-freezing melted ice cream twice",
        "Serving perishable salads at room temperature for 12 hours",
      ],
      correctIndex: 0,
      explanation: "Holding hot food at or above 60°C prevents bacterial growth and guarantees HACCP food safety standards.",
      category: "Food, Catering & Events",
      pointsReward: 50,
    },
  ],
  "real-estate-construction": [
    {
      id: "realestate_q1",
      question: "Which land title in Lagos State offers the highest legal security for commercial development?",
      options: [
        "Governor's Consent or Certificate of Occupancy (C of O)",
        "A verbal agreement with local youths (Omo Onile)",
        "A receipt written on a brown paper envelope",
        "A survey plan with red copy pending registration",
      ],
      correctIndex: 0,
      explanation: "A registered C of O or Governor's Consent verified at the Lagos State Lands Bureau in Alausa provides legal ownership protection.",
      category: "Real Estate & Construction",
      pointsReward: 50,
    },
  ],
  "general": [
    {
      id: "gen_q1",
      question: "What is the primary benefit of having a verified Blue-Tick listing on Bethelincovibe TV Directory?",
      options: [
        "Instant buyer trust, priority search rank, automated ad promotion, and direct WhatsApp buyer leads",
        "It hides your phone number from buyers",
        "It prevents customers from seeing your prices",
        "It forces you to close your shop on weekends",
      ],
      correctIndex: 0,
      explanation: "Blue-Tick verified merchants gain high visibility, fraud protection credibility, and automated Queen marketing boosts.",
      category: "General Commerce",
      pointsReward: 50,
    },
  ],
};

/**
 * Generate 3-5 category-specific quiz questions using AI or curated business presets
 */
export async function getDailyQuizForCategory(
  categoryName: string,
  userPreferredCategorySlug?: string
): Promise<BusinessQuizQuestion[]> {
  try {
    const gemini = await getGeminiClient();
    if (gemini) {
      const prompt = `Generate 3 interactive, highly practical multiple-choice business growth quiz questions specifically tailored for a Nigerian entrepreneur in the "${categoryName || "Commercial Business"}" industry.

Format as STRICT JSON array:
[
  {
    "id": "q_${Date.now()}_1",
    "question": "Clear, practical commercial question relating to growth, pricing, sales or operations in ${categoryName}",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctIndex": 0,
    "explanation": "1-sentence why the correct answer wins in the real market.",
    "category": "${categoryName}",
    "pointsReward": 50
  }
]`;

      const response = await gemini.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: { temperature: 0.6 },
      });

      const raw = response.text || "";
      const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].question) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn("Quiz AI generation notice, falling back to curated presets:", err);
  }

  // Fallback to presets
  const presetKey = userPreferredCategorySlug || "general";
  const matched = CATEGORY_QUIZ_PRESETS[presetKey] || CATEGORY_QUIZ_PRESETS["technology-software"] || CATEGORY_QUIZ_PRESETS["general"];
  return [...matched, ...CATEGORY_QUIZ_PRESETS["general"]];
}

/**
 * Load user quiz progress and points balance
 */
export async function getUserQuizProgress(userId: string): Promise<UserQuizProgress> {
  const defaultState: UserQuizProgress = {
    userId,
    category: "technology-software",
    totalPointsEarned: 0,
    quizzesCompletedToday: 0,
    streakDays: 1,
    lastQuizDate: new Date().toISOString().split("T")[0],
    isPaidAutomatedActive: false,
    dailyPointsLimit: 250,
    quizHistory: [],
  };

  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("social_links")
      .eq("user_id", userId)
      .maybeSingle();

    if (profile?.social_links?.quiz_progress) {
      return { ...defaultState, ...profile.social_links.quiz_progress };
    }
  } catch (err) {
    console.warn("Could not load user quiz progress:", err);
  }

  return defaultState;
}

/**
 * Save user quiz score, update wallet points, and record completion
 */
export async function submitQuizAnswer(
  userId: string,
  questionId: string,
  isCorrect: boolean,
  points: number,
  category: string
): Promise<{ success: boolean; earnedPoints: number; totalPoints: number }> {
  try {
    const current = await getUserQuizProgress(userId);
    const today = new Date().toISOString().split("T")[0];

    const earned = isCorrect ? points : 0;
    const newTotal = (current.totalPointsEarned || 0) + earned;
    const isNewDay = current.lastQuizDate !== today;

    const updatedProgress: UserQuizProgress = {
      ...current,
      category,
      totalPointsEarned: newTotal,
      quizzesCompletedToday: isNewDay ? 1 : (current.quizzesCompletedToday || 0) + 1,
      streakDays: isNewDay ? (current.streakDays || 0) + 1 : current.streakDays || 1,
      lastQuizDate: today,
      quizHistory: [
        {
          date: today,
          questionId,
          score: isCorrect ? 100 : 0,
          points: earned,
        },
        ...(current.quizHistory || []).slice(0, 30),
      ],
    };

    // Update profile social_links
    const { data: prof } = await supabase
      .from("profiles")
      .select("social_links")
      .eq("user_id", userId)
      .maybeSingle();

    const social = (prof?.social_links as Record<string, any>) || {};
    await supabase
      .from("profiles")
      .update({
        social_links: {
          ...social,
          quiz_progress: updatedProgress,
          reward_points: newTotal,
        },
      })
      .eq("user_id", userId);

    return {
      success: true,
      earnedPoints: earned,
      totalPoints: newTotal,
    };
  } catch (err) {
    console.error("Error submitting quiz answer:", err);
    return { success: false, earnedPoints: 0, totalPoints: 0 };
  }
}
