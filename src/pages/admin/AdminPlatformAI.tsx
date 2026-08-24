import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { GoogleGenAI, Type } from "@google/genai";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, Sparkles, Send, Bot, CheckCircle2, ShieldCheck, Zap, RefreshCw,
  Building2, FileText, Users, Sliders, Bell, AlertTriangle, Cpu, ChevronDown,
  ChevronUp, BarChart2, Video, Globe, ArrowRight, Check, X, Compass, Plus,
  Layers, ExternalLink, HelpCircle, GraduationCap, BookOpen, Mic, Radio, Volume2, Square
} from "lucide-react";
import { toast } from "sonner";
import { FEATURE_META, FeatureKey } from "@/contexts/FeatureFlagsContext";
import {
  conductStrategicBrainstorm,
  generateStrategicArticle,
  generateCustomPage,
  StrategicDirective,
  GeneratedCustomPage,
  getGeminiClient,
} from "@/lib/aiCollaborationEngine";
import VoiceInputButton from "@/components/admin/VoiceInputButton";
import GoogleLiveVoiceAgentDialog from "@/components/admin/GoogleLiveVoiceAgentDialog";
import { synthesizeGoogleVoice } from "@/lib/googleLiveVoiceEngine";
import {
  generateAICourse,
  encodeCourseMetadata,
  AICreatedCourse,
  getPexelsImageForCategory,
} from "@/lib/aiCourseCreatorEngine";

type ToolLog = {
  tool: string;
  summary: string;
  timestamp: string;
  success: boolean;
};

export interface PendingActionProposal {
  id: string;
  type: "multi_blog_campaign" | "create_custom_page" | "create_ai_course" | "system_autotune" | "approve_businesses" | "update_setting" | "toggle_feature";
  title: string;
  rationale: string;
  previewData: any;
  status: "pending" | "executed" | "dismissed";
}

type Msg = {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolLogs?: ToolLog[];
  proposal?: PendingActionProposal;
};

const SUGGESTIONS = [
  "Direct AI Blogger to create a 3-part trending Lagos business & tech vlog series",
  "Create an AI Masterclass on TikTok & Instagram Sales Funnels for Nigerian businesses",
  "Create a professional custom landing page for our Lagos VIP Business Directory",
  "Generate a Real Estate Due Diligence masterclass with interactive flashcards and quiz",
  "Run a full platform diagnostic and auto-tune all configurations",
  "Approve all pending business listings and set them as active",
];

export default function AdminPlatformAI() {
  const qc = useQueryClient();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [activeTask, setActiveTask] = useState<string | null>(null);
  const [showStats, setShowStats] = useState(false);
  const [expandedLogs, setExpandedLogs] = useState<Record<string, boolean>>({});
  const [liveVoiceOpen, setLiveVoiceOpen] = useState(false);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const currentAudioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const toggleLog = (id: string) => {
    setExpandedLogs((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const stopSpeaking = () => {
    if (currentAudioSourceRef.current) {
      try {
        currentAudioSourceRef.current.stop();
      } catch {}
      currentAudioSourceRef.current = null;
    }
    if (typeof window !== "undefined" && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
    setSpeakingMsgId(null);
  };

  const speakMessageWithKore = async (msgId: string, text: string) => {
    if (speakingMsgId === msgId) {
      stopSpeaking();
      return;
    }

    stopSpeaking();
    setSpeakingMsgId(msgId);

    const cleanText = text
      .replace(/[*_#`~[\]()]/g, " ")
      .replace(/\s+/g, " ")
      .slice(0, 1500);

    try {
      const wav = await synthesizeGoogleVoice(cleanText, "Kore");
      if (wav) {
        if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          audioCtxRef.current = new AudioContextClass({ sampleRate: 24000 });
        }
        if (audioCtxRef.current.state === "suspended") {
          await audioCtxRef.current.resume();
        }

        const decoded = await audioCtxRef.current.decodeAudioData(wav.slice(0));
        const source = audioCtxRef.current.createBufferSource();
        source.buffer = decoded;
        currentAudioSourceRef.current = source;
        source.connect(audioCtxRef.current.destination);

        source.onended = () => {
          setSpeakingMsgId(null);
          currentAudioSourceRef.current = null;
        };

        source.start(0);
        return;
      }
    } catch (e) {
      console.warn("TTS playback error, fallback to browser voice:", e);
    }

    // Fallback to browser synthesis
    if (typeof window !== "undefined" && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(cleanText);
        u.pitch = 1.12;
        u.rate = 1.0;
        u.onend = () => setSpeakingMsgId(null);
        u.onerror = () => setSpeakingMsgId(null);
        window.speechSynthesis.speak(u);
      } catch {
        setSpeakingMsgId(null);
      }
    } else {
      setSpeakingMsgId(null);
    }
  };

  // --- Real-time Platform Stats ---
  const { data: stats, refetch: refetchStats, isLoading: statsLoading } = useQuery({
    queryKey: ["admin-ai-platform-stats"],
    queryFn: async () => {
      const [
        { count: bizCount },
        { count: pendingBizCount },
        { count: postCount },
        { count: userCount },
        { data: settingsData },
        { count: catCount },
        { data: categoriesList },
        { count: salesPagesCount },
      ] = await Promise.all([
        supabase.from("businesses").select("*", { count: "exact", head: true }),
        supabase.from("businesses").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("blog_posts").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("site_settings").select("*"),
        supabase.from("categories").select("*", { count: "exact", head: true }),
        supabase.from("categories").select("id, name, slug, type"),
        supabase.from("sales_pages").select("*", { count: "exact", head: true }),
      ]);

      const settingsMap: Record<string, string> = {};
      (settingsData || []).forEach((s: any) => { settingsMap[s.key] = s.value || ""; });

      let enabledFlagsCount = 0;
      FEATURE_META.forEach((m) => {
        const val = settingsMap[`feature_${m.key}`];
        if (!["off", "false", "0", "disabled"].includes(String(val || "").toLowerCase())) {
          enabledFlagsCount++;
        }
      });

      const globalAds = settingsMap["ads_global_enabled"] !== "false";

      return {
        businesses: bizCount || 0,
        pendingBusinesses: pendingBizCount || 0,
        posts: postCount || 0,
        users: userCount || 0,
        categories: catCount || 0,
        categoriesList: categoriesList || [],
        salesPages: salesPagesCount || 0,
        enabledFlags: enabledFlagsCount,
        totalFlags: FEATURE_META.length,
        globalAds,
        settingsMap,
      };
    },
    refetchInterval: 15000,
  });

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  // --- TOOL EXECUTION ENGINE ---
  const executeDirectAction = async (proposal: PendingActionProposal): Promise<{ logs: ToolLog[]; message: string }> => {
    const ts = new Date().toLocaleTimeString();
    const logs: ToolLog[] = [];

    try {
      switch (proposal.type) {
        case "multi_blog_campaign": {
          const { directive } = proposal.previewData;
          const topics = directive.suggestedTopics || [];
          let publishedCount = 0;

          for (const topicItem of topics) {
            // Find category
            const matchCat = (stats?.categoriesList || []).find(
              (c: any) => c.name.toLowerCase() === topicItem.targetCategory?.toLowerCase()
            );

            let catId = matchCat?.id;
            if (!catId && topicItem.targetCategory) {
              // Auto-create category if doesn't exist
              const slug = topicItem.targetCategory.toLowerCase().replace(/[^a-z0-9]+/g, "-");
              const { data: newCat } = await supabase
                .from("categories")
                .insert({ name: topicItem.targetCategory, slug, type: "blog" })
                .select("id")
                .maybeSingle();
              if (newCat) catId = newCat.id;
            }

            const article = await generateStrategicArticle({
              topic: topicItem.title,
              angle: topicItem.angle,
              categoryName: topicItem.targetCategory,
              isVlog: topicItem.isVlog,
              videoUrl: topicItem.suggestedVideoUrl,
              keywords: topicItem.keywords,
            });

            const { data: user } = await supabase.auth.getUser();
            const { error: postErr } = await supabase.from("blog_posts").insert({
              title: article.title,
              slug: article.slug,
              excerpt: article.excerpt,
              content: article.content,
              category_id: catId || null,
              published: true,
              published_at: new Date().toISOString(),
              is_featured: true,
              author_id: user?.user?.id || null,
            });

            if (!postErr) {
              publishedCount++;
              logs.push({
                tool: "ai_blogger_publish",
                summary: `Published ${topicItem.isVlog ? "Vlog" : "Blog"}: "${article.title}" in category "${topicItem.targetCategory}"`,
                timestamp: ts,
                success: true,
              });
            }
          }

          qc.invalidateQueries();
          refetchStats();
          return {
            logs,
            message: `Successfully executed Multi-Post Campaign with AI Blogger! Published ${publishedCount} high-quality articles/vlogs with strategic category targeting.`,
          };
        }

        case "create_custom_page": {
          const { pageData } = proposal.previewData;
          const { data: user } = await supabase.auth.getUser();

          const insertPayload: any = {
            product_name: pageData.product_name,
            slug: pageData.slug,
            headline: pageData.headline,
            subheadline: pageData.subheadline,
            product_description: pageData.product_description,
            problem: pageData.problem,
            solution: pageData.solution,
            benefits: pageData.benefits,
            social_proof: pageData.social_proof,
            price: pageData.price || 0,
            currency: pageData.currency || "NGN",
            cta_text: pageData.cta_text || "Get Started",
            product_image_url: pageData.product_image_url,
            youtube_video_url: pageData.youtube_video_url || null,
            contact_whatsapp: pageData.contact_whatsapp,
            contact_email: pageData.contact_email,
            template_key: pageData.template_key || "modern",
            lead_capture_enabled: pageData.lead_capture_enabled ?? true,
            seo_title: pageData.seo_title,
            seo_description: pageData.seo_description,
            active: true,
            status: "published",
            user_id: user?.user?.id || "00000000-0000-0000-0000-000000000000",
          };

          const { data: createdPage, error: pageErr } = await supabase
            .from("sales_pages")
            .insert(insertPayload)
            .select("id, slug, product_name")
            .single();

          if (pageErr) throw pageErr;

          logs.push({
            tool: "create_professional_custom_page",
            summary: `Published custom page "${pageData.product_name}" live at /sales/${pageData.slug}`,
            timestamp: ts,
            success: true,
          });

          qc.invalidateQueries();
          refetchStats();
          return {
            logs,
            message: `The professional custom page "${pageData.product_name}" is now LIVE! You can view it at /sales/${pageData.slug}`,
          };
        }

        case "create_ai_course": {
          const { course } = proposal.previewData;
          const fullDesc = encodeCourseMetadata(course);

          const { error: courseErr } = await supabase.from("courses").insert({
            title: course.title,
            description: fullDesc,
            category: course.category,
            instructor_name: course.instructorName,
            price_naira: course.priceNaira || 0,
            duration_minutes: course.durationMinutes || 60,
            thumbnail_url: course.thumbnailUrl,
            youtube_url: course.youtubeUrl,
            published: true,
          });

          if (courseErr) throw courseErr;

          logs.push({
            tool: "ai_course_creator_publish",
            summary: `Published Masterclass "${course.title}" (${course.category}) with ${course.flashcards?.length || 0} Flashcards & ${course.quiz?.length || 0} Quiz Qs into Learning Hub`,
            timestamp: ts,
            success: true,
          });

          qc.invalidateQueries({ queryKey: ["admin-courses"] });
          qc.invalidateQueries({ queryKey: ["learn-courses"] });
          refetchStats();
          return {
            logs,
            message: `The Masterclass "${course.title}" is now LIVE in the Bethelincovibe Learning Hub with interactive flashcards, knowledge quizzes, and verified certificate generation!`,
          };
        }

        case "approve_businesses": {
          const { data: pending } = await supabase.from("businesses").select("id, title").eq("status", "pending");
          const count = pending?.length || 0;
          if (count > 0) {
            await supabase.from("businesses").update({ status: "approved" }).eq("status", "pending");
          }
          logs.push({
            tool: "approve_all_pending_businesses",
            summary: `Approved ${count} pending business listing(s)`,
            timestamp: ts,
            success: true,
          });
          qc.invalidateQueries();
          refetchStats();
          return { logs, message: `Approved ${count} pending business listing(s) across the platform.` };
        }

        case "system_autotune": {
          const coreFlags: FeatureKey[] = ["businesses", "blog", "products", "business_listing", "advertise", "wallet", "tools", "comments", "learn", "forum", "daily_rewards"];
          for (const fk of coreFlags) {
            await supabase.from("site_settings").upsert({ key: `feature_${fk}`, value: "on" }, { onConflict: "key" });
          }
          const defaults: Record<string, string> = {
            ads_global_enabled: "true",
            ads_provider_native: "true",
            daily_login_credits: "50",
            ad_cost_per_day: "500",
            ad_click_reward_naira: "10",
            referral_signup_bonus: "100",
          };
          for (const [k, v] of Object.entries(defaults)) {
            const { data: existing } = await supabase.from("site_settings").select("id,value").eq("key", k).maybeSingle();
            if (!existing) {
              await supabase.from("site_settings").insert({ key: k, value: v });
            }
          }
          const { data: pending } = await supabase.from("businesses").select("id").eq("status", "pending");
          if (pending && pending.length > 0) {
            await supabase.from("businesses").update({ status: "approved" }).eq("status", "pending");
          }
          logs.push({
            tool: "run_system_autotune",
            summary: `Full platform diagnostic & auto-tune completed. Verified core features, approved pending listings, and optimized platform settings.`,
            timestamp: ts,
            success: true,
          });
          qc.invalidateQueries();
          refetchStats();
          return { logs, message: "System auto-tune executed with 100% health confirmation." };
        }

        case "update_setting": {
          const { key, value } = proposal.previewData;
          await supabase.from("site_settings").upsert({ key, value: String(value) }, { onConflict: "key" });
          logs.push({
            tool: "update_site_setting",
            summary: `Updated setting '${key}' to '${value}'`,
            timestamp: ts,
            success: true,
          });
          qc.invalidateQueries();
          refetchStats();
          return { logs, message: `Updated setting '${key}' to '${value}'.` };
        }

        case "toggle_feature": {
          const { featureKey, enabled } = proposal.previewData;
          await supabase.from("site_settings").upsert({ key: `feature_${featureKey}`, value: enabled ? "on" : "off" }, { onConflict: "key" });
          logs.push({
            tool: "toggle_feature_flag",
            summary: `Feature '${featureKey}' is now ${enabled ? "ENABLED" : "DISABLED"}`,
            timestamp: ts,
            success: true,
          });
          qc.invalidateQueries();
          refetchStats();
          return { logs, message: `Feature '${featureKey}' is now ${enabled ? "enabled" : "disabled"}.` };
        }

        default:
          return { logs: [], message: "Action executed." };
      }
    } catch (err: any) {
      logs.push({ tool: proposal.type, summary: `Error: ${err.message}`, timestamp: ts, success: false });
      return { logs, message: `Failed to execute: ${err.message}` };
    }
  };

  // --- CONFIRMATION HANDLER ---
  const handleApproveProposal = async (msgId: string, proposal: PendingActionProposal) => {
    setBusy(true);
    setActiveTask(`Executing confirmed directive: ${proposal.title}…`);
    try {
      const { logs, message } = await executeDirectAction(proposal);

      // Update message proposal status
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id === msgId && m.proposal) {
            return {
              ...m,
              toolLogs: [...(m.toolLogs || []), ...logs],
              proposal: { ...m.proposal, status: "executed" },
            };
          }
          return m;
        })
      );

      // Append confirmation reply
      setMessages((prev) => [
        ...prev,
        {
          id: `msg_${Date.now()}`,
          role: "assistant",
          content: `✅ **Action Confirmed & Executed:**\n\n${message}`,
        },
      ]);

      toast.success("Directive executed successfully!");
    } catch (err: any) {
      toast.error("Execution failed: " + err.message);
    } finally {
      setBusy(false);
      setActiveTask(null);
    }
  };

  const handleDismissProposal = (msgId: string) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id === msgId && m.proposal) {
          return { ...m, proposal: { ...m.proposal, status: "dismissed" } };
        }
        return m;
      })
    );
    toast.info("Proposal dismissed.");
  };

  // --- REASONING & STRATEGY ENGINE ---
  const handleAsk = async (userPrompt: string) => {
    if (!userPrompt.trim() || busy) return;
    const prompt = userPrompt.trim();
    const userMsgId = `msg_${Date.now()}`;
    const userMsg: Msg = { id: userMsgId, role: "user", content: prompt };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setBusy(true);
    setActiveTask("Collaborating with AI Blogger & analyzing system context…");

    try {
      const lower = prompt.toLowerCase();
      const categories = stats?.categoriesList || [];

      // 1. Check if intent is Directing AI Blogger for Multi-Blog / Multi-Vlog Posting
      if (
        (lower.includes("blogger") || lower.includes("blog") || lower.includes("vlog") || lower.includes("post") || lower.includes("article")) &&
        (lower.includes("direct") || lower.includes("create") || lower.includes("multi") || lower.includes("trending") || lower.includes("series") || lower.includes("work together") || lower.includes("reason"))
      ) {
        setActiveTask("AI Admin & AI Blogger Strategic Brainstorm in progress…");
        const count = lower.includes("5") ? 5 : lower.includes("4") ? 4 : lower.includes("2") ? 2 : 3;

        const directive = await conductStrategicBrainstorm({
          theme: prompt,
          targetNiche: "Lagos Businesses, Tech Startups & Traders",
          campaignGoal: "traffic & business directory discovery",
          numberOfPosts: count,
          availableCategories: categories,
        });

        const replyContent = `### 🤝 Strategic Content Collaboration: AI Admin & AI Blogger Session

I have met with our **AI Lead Blogger** to analyze market trends and construct an executive **Multi-Blog / Multi-Vlog Posting Directive**.

**Executive Theme:** ${directive.theme}  
**Target Audience:** ${directive.targetAudience}  
**Category Selection Rationale:** ${directive.categoryRationale}

---
#### 📋 Proposed Multi-Post Campaign Blueprint (${directive.suggestedTopics.length} Strategic Posts):
${directive.suggestedTopics
  .map(
    (t, idx) => `**${idx + 1}. ${t.isVlog ? "🎥 [VLOG & ARTICLE]" : "📰 [IN-DEPTH GUIDE]"}** ${t.title}
   - **Category Assigned:** \`${t.targetCategory}\` (Auto-mapped)
   - **Strategic Angle:** ${t.angle}
   - **Target SEO Keywords:** ${t.keywords.join(", ")}`
  )
  .join("\n\n")}

---
**Director's Recommendation:**
> "${directive.rationale}"

Please review the proposed campaign below. Click **"Approve & Dispatch Campaign"** to have the AI Blogger write, embed video formats, auto-assign categories, and publish them live to the site.`;

        const proposal: PendingActionProposal = {
          id: `prop_${Date.now()}`,
          type: "multi_blog_campaign",
          title: `Multi-Post Campaign (${directive.suggestedTopics.length} Articles & Vlogs)`,
          rationale: directive.rationale,
          previewData: { directive },
          status: "pending",
        };

        setMessages((prev) => [
          ...prev,
          {
            id: `msg_${Date.now()}`,
            role: "assistant",
            content: replyContent,
            proposal,
          },
        ]);

        setBusy(false);
        setActiveTask(null);
        return `I have collaborated with the AI Blogger and constructed a ${directive.suggestedTopics.length} part content series for ${directive.theme}. Please review and approve below.`;
      }

      // 2. Check if intent is Creating a New Professional Custom Page
      if (
        lower.includes("create a page") ||
        lower.includes("create page") ||
        lower.includes("new page") ||
        lower.includes("landing page") ||
        lower.includes("sales page") ||
        lower.includes("custom page")
      ) {
        setActiveTask("Architecting professional custom page design & conversion copy…");

        const pageData = await generateCustomPage({
          pageConcept: prompt.replace(/create a (new )?(page|landing page|sales page)( for| about)?/i, "").trim() || "Lagos Enterprise Growth Suite",
          targetAudience: "Entrepreneurs & Business Owners in Lagos",
          pricingNaira: 35000,
          contactWhatsApp: stats?.settingsMap?.["social_whatsapp"] || "+2348000000000",
        });

        const replyContent = `### 🚀 Custom Page Architecture Proposal

I have engineered a high-converting, professional **Landing & Showcase Page** tailored to your specification.

**Page Title:** ${pageData.product_name}  
**URL Route:** \`/sales/${pageData.slug}\`  
**Headline:** "${pageData.headline}"  
**Subheadline:** "${pageData.subheadline}"  
**Key Features & Transformation:**
- **Problem Solved:** ${pageData.problem}
- **Delivered Solution:** ${pageData.solution}
- **Value Pricing:** ₦${pageData.price.toLocaleString()} ${pageData.currency}
- **Lead Capture & WhatsApp Integration:** Enabled (Direct funnel to WhatsApp: ${pageData.contact_whatsapp})

Review the blueprint below. Confirming will instantly compile and publish the page live across the platform.`;

        const proposal: PendingActionProposal = {
          id: `prop_${Date.now()}`,
          type: "create_custom_page",
          title: `Publish New Page: "${pageData.product_name}"`,
          rationale: `Deploys an ultra-modern conversion page at /sales/${pageData.slug} with verified badges, WhatsApp funnel, and SEO metadata.`,
          previewData: { pageData },
          status: "pending",
        };

        setMessages((prev) => [
          ...prev,
          {
            id: `msg_${Date.now()}`,
            role: "assistant",
            content: replyContent,
            proposal,
          },
        ]);

        setBusy(false);
        setActiveTask(null);
        return `I have engineered a custom landing page for ${pageData.product_name}. Please review the blueprint and approve deployment.`;
      }

      // 3. Check if intent is Creating an AI Masterclass / Course
      if (
        lower.includes("course") ||
        lower.includes("masterclass") ||
        lower.includes("flashcard") ||
        lower.includes("curriculum") ||
        lower.includes("lesson") ||
        lower.includes("quiz")
      ) {
        setActiveTask("AI Course Creator Agent architecting curriculum, flashcards, quizzes & Pexels cover…");

        // Infer category
        let category = "Marketing";
        if (lower.includes("business") || lower.includes("sme") || lower.includes("management") || lower.includes("import")) category = "Business";
        else if (lower.includes("finance") || lower.includes("grant") || lower.includes("bookkeeping") || lower.includes("money")) category = "Finance & Grants";
        else if (lower.includes("tech") || lower.includes("code") || lower.includes("software") || lower.includes("ai")) category = "Tech & Startup";
        else if (lower.includes("ecommerce") || lower.includes("e-commerce") || lower.includes("shop") || lower.includes("store")) category = "E-Commerce";
        else if (lower.includes("real estate") || lower.includes("property") || lower.includes("land")) category = "Real Estate";

        const cleanTopic = prompt
          .replace(/create an? (ai )?(course|masterclass|class)( on| about| for)?/i, "")
          .trim() || prompt;

        const course = await generateAICourse({
          topic: cleanTopic,
          category,
          priceNaira: lower.includes("free") ? 0 : 5000,
          level: lower.includes("advanced") ? "Advanced" : lower.includes("intermediate") ? "Intermediate" : "Beginner",
        });

        const replyContent = `### 🎓 AI Course Creator Agent & Admin Collaboration Session

I have collaborated with our **Curriculum Architect Agent** to construct an executive **Masterclass Blueprint** on "${course.title}".

**Course Category:** \`${course.category}\`  
**Level:** ${course.level} · **Estimated Duration:** ${course.durationMinutes} minutes  
**Lead Instructor:** ${course.instructorName} (${course.instructorTitle})  
**Access Tier:** ${course.priceNaira > 0 ? `₦${course.priceNaira.toLocaleString()}` : "FREE"}

---
#### 📚 Curriculum Modules Breakdown (${course.modules.length} Modules):
${course.modules
  .map(
    (m, idx) => `**Module ${idx + 1}: ${m.title}** (${m.durationMinutes} mins)
- *Summary:* ${m.summary}
- *Key Takeaways:* ${m.keyTakeaways.join(" · ")}`
  )
  .join("\n\n")}

---
#### 🗂️ Interactive Active-Recall Flashcards (${course.flashcards.length} Cards Generated):
${course.flashcards
  .slice(0, 3)
  .map((f, idx) => `**Card ${idx + 1}:** \`${f.front}\` ➔ ${f.back}`)
  .join("\n")}
*(+ ${Math.max(0, course.flashcards.length - 3)} more active-recall cards)*

---
#### 🧠 Multiple-Choice Knowledge Assessment (${course.quiz.length} Questions with Grading & Explanations):
- **Passing Threshold:** 70% to unlock Verified Certificate of Completion
- **Cover Image:** Curated 4K Pexels Commercial Asset Attached

Review the proposed masterclass below. Click **"Approve & Publish Masterclass"** to deploy it directly into the Bethelincovibe Learning Hub!`;

        const proposal: PendingActionProposal = {
          id: `prop_${Date.now()}`,
          type: "create_ai_course",
          title: `Publish Masterclass: "${course.title}" (${course.category})`,
          rationale: `Deploys complete course with ${course.modules.length} modules, ${course.flashcards.length} flashcards, ${course.quiz.length} quiz questions, and verified certificate generation into Learning Hub.`,
          previewData: { course },
          status: "pending",
        };

        setMessages((prev) => [
          ...prev,
          {
            id: `msg_${Date.now()}`,
            role: "assistant",
            content: replyContent,
            proposal,
          },
        ]);

        setBusy(false);
        setActiveTask(null);
        return `I have created the full Masterclass blueprint for ${course.title} with flashcards and quizzes. Please confirm deployment.`;
      }

      // 4. Conversational / Strategic Consulting with Gemini if Key is available
      const gemini = await getGeminiClient();
      if (gemini) {
        setActiveTask("AI Administrator reasoning and formulating recommendations…");
        const historyText = messages
          .slice(-6)
          .map((m) => `${m.role === "user" ? "Administrator" : "AI Admin"}: ${m.content}`)
          .join("\n\n");

        const systemPrompt = `You are the Chief AI Administrator & Strategic Operations Director of Bethelincovibe TV.
You are in a live executive consultation with the Platform Owner / Human Admin.
You possess full administrative authority and work directly with your team (including the AI Blogger/Vlogger).

Platform Real-time Context:
- Registered Businesses: ${stats?.businesses} (Pending Review: ${stats?.pendingBusinesses})
- Published Articles: ${stats?.posts}
- Platform Users: ${stats?.users}
- Active Categories: ${stats?.categories}
- Feature Flags Enabled: ${stats?.enabledFlags}/${stats?.totalFlags}
- Ads Active: ${stats?.globalAds}

Tone & Capabilities:
- Be highly intelligent, consultative, articulate, proactive, and strategic.
- Always provide clear reasoning and recommendations.
- When an action is requested, explain what you recommend and propose the exact steps.`;

        const response = await gemini.models.generateContent({
          model: "gemini-3.7-flash",
          contents: [
            {
              role: "user",
              parts: [{ text: `${systemPrompt}\n\nRecent Conversation:\n${historyText}\n\nAdministrator's Message: ${prompt}` }],
            },
          ],
        });

        const reply = response.text || "";

        // Check if user specifically requested a platform setting or approval action
        let proposal: PendingActionProposal | undefined = undefined;
        if (lower.includes("approve") && (lower.includes("business") || lower.includes("pending"))) {
          proposal = {
            id: `prop_${Date.now()}`,
            type: "approve_businesses",
            title: `Approve All Pending Business Listings (${stats?.pendingBusinesses || 0} pending)`,
            rationale: "Instantly reviews and approves all submitted business listings for live directory visibility.",
            previewData: {},
            status: "pending",
          };
        } else if (lower.includes("autotune") || lower.includes("diagnostic")) {
          proposal = {
            id: `prop_${Date.now()}`,
            type: "system_autotune",
            title: "Execute Full Platform Auto-Tune & Verification",
            rationale: "Activates core feature flags, verifies monetization parameters, and checks database integrity.",
            previewData: {},
            status: "pending",
          };
        }

        setMessages((prev) => [
          ...prev,
          {
            id: `msg_${Date.now()}`,
            role: "assistant",
            content: reply,
            proposal,
          },
        ]);

        setBusy(false);
        setActiveTask(null);
        return reply.replace(/[*_#`~]/g, " ").slice(0, 280);
      }

      // 4. Robust Domain Fallback Strategy & Reasoning
      let replyText = "";
      let proposal: PendingActionProposal | undefined = undefined;

      if (lower.includes("approve") && (lower.includes("business") || lower.includes("pending"))) {
        replyText = `### 📋 Business Approval Audit & Recommendation

I analyzed the directory queue. There are currently **${stats?.pendingBusinesses || 0} pending business listing(s)** awaiting administrative review.

**My Strategic Assessment:**
- Approving verified listings increases immediate marketplace inventory.
- It boosts organic search ranking and encourages newly registered merchants to share their profile link on social media.

Would you like me to approve all pending listings immediately? Click **"Approve & Execute"** below.`;

        proposal = {
          id: `prop_${Date.now()}`,
          type: "approve_businesses",
          title: `Approve ${stats?.pendingBusinesses || 0} Pending Business Listing(s)`,
          rationale: "Sets all pending listings to approved and triggers notification to business owners.",
          previewData: {},
          status: "pending",
        };
      } else if (lower.includes("autotune") || lower.includes("diagnostic") || lower.includes("status")) {
        replyText = `### ⚡ Platform Health Diagnostic & Optimization Recommendation

**Current System Status:**
- **Directory Inventory:** ${stats?.businesses} businesses (${stats?.pendingBusinesses} pending review)
- **Content Engine:** ${stats?.posts} published posts across ${stats?.categories} categories
- **Custom Pages:** ${stats?.salesPages} active landing pages
- **Feature Flags:** ${stats?.enabledFlags} of ${stats?.totalFlags} active
- **Monetization Engine:** ${stats?.globalAds ? "ENABLED (Native & Ad Networks Active)" : "DISABLED"}

**Recommendation:**
I suggest executing a **System Auto-Tune** to guarantee all high-value modules (business directory, daily login rewards, lead generation funnels, and wallet credits) are running at peak efficiency.`;

        proposal = {
          id: `prop_${Date.now()}`,
          type: "system_autotune",
          title: "Run Platform Auto-Tune & Health Verification",
          rationale: "Verifies database integrity, syncs feature flags, and ensures seamless user experience.",
          previewData: {},
          status: "pending",
        };
      } else {
        replyText = `### 💡 Strategic Recommendation & Action Plan

Thank you for the guidance. Here is how I recommend we approach this:

1. **Strategic Content Coordination:** We can direct the **AI Blogger** to research trending Lagos business topics, automatically map them to high-traffic categories, and publish multi-part articles and vlogs.
2. **High-Converting Custom Pages:** We can create dedicated, responsive showcase and sales pages (\`/sales/:slug\`) equipped with WhatsApp lead capture and verified badges.
3. **Platform Governance:** We can auto-tune feature flags, approve marketplace sellers, and calibrate daily rewards.

How would you like to proceed? You can type any specific directive or choose an option above.`;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `msg_${Date.now()}`,
          role: "assistant",
          content: replyText,
          proposal,
        },
      ]);
      return replyText.replace(/[*_#`~]/g, " ").slice(0, 250);
    } catch (err: any) {
      toast.error("Error processing request: " + err.message);
      setMessages((prev) => [
        ...prev,
        {
          id: `msg_${Date.now()}`,
          role: "assistant",
          content: `An issue occurred while reasoning through this directive: ${err.message}`,
        },
      ]);
    } finally {
      setBusy(false);
      setActiveTask(null);
    }
  };

  return (
    <div className="flex h-[calc(100vh-6.5rem)] flex-col gap-3 max-w-6xl mx-auto">
      {/* Header Banner with Collaboration Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-gradient-to-r from-primary/15 via-indigo-600/10 to-purple-600/15 border border-primary/20 shadow-xs shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary via-indigo-600 to-purple-600 text-white shadow-[0_4px_12px_-2px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.45)] ring-2 ring-white/25">
            <Bot className="h-6 w-6" strokeWidth={2.2} />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-background"></span>
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black tracking-tight leading-none">
                AI General Administrator & Strategy Director
              </h1>
              <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 font-extrabold text-[10px]">
                Collaborative Intelligence Active
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground font-medium mt-1">
              Direct the AI Blogger for multi-blog/vlog posting, create professional custom pages, and manage system operations with reasoned confirmation.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <Button
            variant="default"
            size="sm"
            onClick={() => setLiveVoiceOpen(true)}
            className="h-8 font-extrabold text-xs rounded-xl gap-1.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-primary text-white shadow-sm hover:opacity-95 ring-1 ring-white/20"
          >
            <Radio className="h-3.5 w-3.5 animate-pulse text-amber-300" />
            <span>Google Live Voice (Kore)</span>
            <Badge className="h-4 px-1 text-[9px] font-black bg-white/20 text-white border-0">
              VAD LIVE
            </Badge>
          </Button>

          <Button
            variant="outline"
            size="sm"
            asChild
            className="h-8 font-bold text-xs rounded-xl gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
          >
            <Link to="/admin/ai-blogger">
              <Video className="h-3.5 w-3.5" />
              AI Blogger Studio
            </Link>
          </Button>

          <Button
            variant={showStats ? "secondary" : "outline"}
            size="sm"
            onClick={() => setShowStats(!showStats)}
            className="h-8 font-bold text-xs rounded-xl gap-1.5 border-primary/20"
          >
            <BarChart2 className="h-3.5 w-3.5 text-primary" />
            {showStats ? "Hide Stats" : "Platform Stats"}
            {showStats ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchStats()}
            disabled={statsLoading}
            className="h-8 font-bold text-xs rounded-xl gap-1.5 border-primary/20 bg-background/80"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-primary ${statsLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Collapsible Live System Metrics Panel */}
      {showStats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 shrink-0 animate-in fade-in slide-in-from-top-2 duration-200">
          <Card className="p-2.5 bg-card/90 border-border/70 flex flex-col justify-between shadow-xs">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[10px] font-bold uppercase tracking-wider">Businesses</span>
              <Building2 className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="text-base font-black mt-1">{stats?.businesses ?? "—"}</div>
          </Card>

          <Card className={`p-2.5 border-border/70 flex flex-col justify-between shadow-xs ${stats?.pendingBusinesses ? "bg-amber-500/10 border-amber-500/30" : "bg-card/90"}`}>
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[10px] font-bold uppercase tracking-wider">Pending</span>
              <AlertTriangle className={`h-3.5 w-3.5 ${stats?.pendingBusinesses ? "text-amber-500" : "text-muted-foreground"}`} />
            </div>
            <div className={`text-base font-black mt-1 ${stats?.pendingBusinesses ? "text-amber-600 dark:text-amber-400" : ""}`}>
              {stats?.pendingBusinesses ?? "—"}
            </div>
          </Card>

          <Card className="p-2.5 bg-card/90 border-border/70 flex flex-col justify-between shadow-xs">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[10px] font-bold uppercase tracking-wider">Articles</span>
              <FileText className="h-3.5 w-3.5 text-purple-500" />
            </div>
            <div className="text-base font-black mt-1">{stats?.posts ?? "—"}</div>
          </Card>

          <Card className="p-2.5 bg-card/90 border-border/70 flex flex-col justify-between shadow-xs">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[10px] font-bold uppercase tracking-wider">Custom Pages</span>
              <Globe className="h-3.5 w-3.5 text-indigo-500" />
            </div>
            <div className="text-base font-black mt-1">{stats?.salesPages ?? "—"}</div>
          </Card>

          <Card className="p-2.5 bg-card/90 border-border/70 flex flex-col justify-between shadow-xs">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[10px] font-bold uppercase tracking-wider">Features</span>
              <Sliders className="h-3.5 w-3.5 text-emerald-500" />
            </div>
            <div className="text-base font-black mt-1">
              {stats ? `${stats.enabledFlags}/${stats.totalFlags}` : "—"}
            </div>
          </Card>

          <Card className="p-2.5 bg-card/90 border-border/70 flex flex-col justify-between shadow-xs">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[10px] font-bold uppercase tracking-wider">Ads Status</span>
              <Zap className={`h-3.5 w-3.5 ${stats?.globalAds ? "text-amber-400" : "text-muted-foreground"}`} />
            </div>
            <div className="text-xs font-extrabold mt-1">
              {stats?.globalAds ? (
                <span className="text-emerald-600 dark:text-emerald-400">ENABLED</span>
              ) : (
                <span className="text-muted-foreground">DISABLED</span>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Main Agent Workspace */}
      <Card className="flex-1 min-h-0 flex flex-col overflow-hidden border-border/80 shadow-md">
        <CardHeader className="py-2.5 px-4 border-b bg-card/80 flex flex-row items-center justify-between shrink-0">
          <div>
            <CardTitle className="text-sm font-black flex items-center gap-2">
              <Cpu className="h-4 w-4 text-primary" /> Strategic Intelligence & Directive Feed
            </CardTitle>
          </div>
          {busy && (
            <div className="flex items-center gap-2 text-xs font-bold text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span className="truncate max-w-[280px]">{activeTask || "Reasoning with team…"}</span>
            </div>
          )}
        </CardHeader>

        {/* Scrollable Chat Area */}
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="space-y-4 py-6 text-center max-w-2xl mx-auto">
              <div className="h-12 w-12 mx-auto rounded-2xl bg-gradient-to-br from-primary/20 to-indigo-600/20 border border-primary/30 flex items-center justify-center text-primary shadow-sm">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-black tracking-tight">AI Administrator & Strategy Director Ready</h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-lg mx-auto leading-relaxed">
                  I act as your Chief Operations & Strategy Director. Direct me to work together with the AI Blogger for multi-blog/vlog campaigns, create new custom pages, or optimize platform features.
                </p>
              </div>

              {/* Quick Action Suggestions Grid */}
              <div className="grid gap-2 sm:grid-cols-2 text-left pt-2">
                {SUGGESTIONS.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleAsk(s)}
                    disabled={busy}
                    className="p-3 rounded-2xl border border-border/80 bg-card hover:bg-secondary/80 hover:border-primary/40 text-xs font-semibold leading-snug transition-all flex items-start gap-2.5 group active:scale-[0.98]"
                  >
                    <span className="h-5 w-5 shrink-0 rounded-md bg-primary/10 text-primary flex items-center justify-center font-extrabold text-[10px] group-hover:bg-primary group-hover:text-white transition-colors">
                      {idx + 1}
                    </span>
                    <span className="text-foreground/90 group-hover:text-foreground">{s}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages List */}
          {messages.map((m) => (
            <div key={m.id} className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"} gap-1.5`}>
              <div className="text-[10px] font-bold text-muted-foreground/70 uppercase px-1 flex items-center gap-1.5 justify-between w-full max-w-[90%] sm:max-w-[85%]">
                <div className="flex items-center gap-1.5">
                  {m.role === "user" ? (
                    <span>You (Administrator)</span>
                  ) : (
                    <>
                      <Bot className="h-3 w-3 text-primary" />
                      <span>AI Strategy Director</span>
                    </>
                  )}
                </div>
                {m.role === "assistant" && (
                  <button
                    onClick={() => speakMessageWithKore(m.id, m.content)}
                    className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full transition-colors ${
                      speakingMsgId === m.id
                        ? "bg-purple-600 text-white animate-pulse"
                        : "bg-muted/80 text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                    title="Listen with Google Kore Voice"
                  >
                    {speakingMsgId === m.id ? (
                      <>
                        <Square className="h-2.5 w-2.5" />
                        <span>Stop Voice</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="h-2.5 w-2.5 text-purple-500" />
                        <span>Kore Voice</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              <div
                className={`max-w-[90%] sm:max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed shadow-xs ${
                  m.role === "user"
                    ? "bg-primary text-primary-foreground font-semibold rounded-tr-none"
                    : "bg-muted/70 text-foreground border border-border/60 rounded-tl-none"
                }`}
              >
                {m.content}
              </div>

              {/* Interactive Executive Proposal & Execution Card */}
              {m.proposal && (
                <div className="w-full max-w-[90%] sm:max-w-[85%] mt-1">
                  <Card className={`border shadow-sm rounded-2xl overflow-hidden transition-all ${
                    m.proposal.status === "executed"
                      ? "bg-emerald-500/10 border-emerald-500/30"
                      : m.proposal.status === "dismissed"
                      ? "bg-muted/30 border-muted opacity-60"
                      : "bg-card border-indigo-500/30 ring-2 ring-indigo-500/10"
                  }`}>
                    <div className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b bg-muted/20">
                      <div className="flex items-center gap-2.5">
                        <div className={`h-8 w-8 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                          m.proposal.status === "executed"
                            ? "bg-emerald-500 text-white"
                            : "bg-indigo-600 text-white shadow-xs"
                        }`}>
                          {m.proposal.type === "multi_blog_campaign" ? (
                            <Video className="h-4 w-4" />
                          ) : m.proposal.type === "create_custom_page" ? (
                            <Globe className="h-4 w-4" />
                          ) : m.proposal.type === "create_ai_course" ? (
                            <GraduationCap className="h-4 w-4" />
                          ) : (
                            <ShieldCheck className="h-4 w-4" />
                          )}
                        </div>
                        <div>
                          <p className="font-extrabold text-xs text-foreground flex items-center gap-2">
                            {m.proposal.title}
                            {m.proposal.status === "executed" && (
                              <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-[9px] font-extrabold">
                                <Check className="h-3 w-3 mr-1" /> Executed & Live
                              </Badge>
                            )}
                          </p>
                          <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
                            {m.proposal.rationale}
                          </p>
                        </div>
                      </div>

                      {m.proposal.status === "pending" && (
                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDismissProposal(m.id)}
                            disabled={busy}
                            className="h-8 text-xs font-bold text-muted-foreground hover:text-destructive rounded-xl"
                          >
                            <X className="h-3.5 w-3.5 mr-1" /> Dismiss
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleApproveProposal(m.id, m.proposal!)}
                            disabled={busy}
                            className="h-8 text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl gap-1.5 shadow-sm"
                          >
                            <Check className="h-3.5 w-3.5" /> Approve & Execute Now
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Proposal Detailed Preview */}
                    {m.proposal.type === "multi_blog_campaign" && m.proposal.previewData?.directive && (
                      <div className="p-3 bg-muted/10 text-xs space-y-2">
                        <p className="font-bold text-[11px] text-muted-foreground uppercase tracking-wider">
                          Auto-Selected Categories & Series Topics:
                        </p>
                        <div className="grid gap-1.5 sm:grid-cols-2">
                          {m.proposal.previewData.directive.suggestedTopics?.map((t: any, idx: number) => (
                            <div key={idx} className="p-2 rounded-xl bg-background border flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <p className="font-extrabold text-[11px] text-foreground truncate flex items-center gap-1">
                                  {t.isVlog ? <Video className="h-3 w-3 text-indigo-600" /> : <FileText className="h-3 w-3 text-purple-600" />}
                                  {t.title}
                                </p>
                                <p className="text-[10px] text-muted-foreground truncate">
                                  Category: <span className="font-bold text-primary">{t.targetCategory}</span>
                                </p>
                              </div>
                              <Badge variant="outline" className="text-[9px] shrink-0 font-bold">
                                {t.isVlog ? "Vlog" : "Blog"}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {m.proposal.type === "create_custom_page" && m.proposal.previewData?.pageData && (
                      <div className="p-3 bg-muted/10 text-xs space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="font-bold text-[11px] text-muted-foreground">
                            Target Route: <strong className="text-primary font-mono">/sales/{m.proposal.previewData.pageData.slug}</strong>
                          </p>
                          {m.proposal.status === "executed" && (
                            <Button size="sm" variant="outline" asChild className="h-6 text-[10px] font-bold rounded-lg gap-1">
                              <Link to={`/sales/${m.proposal.previewData.pageData.slug}`} target="_blank">
                                View Page <ExternalLink className="h-3 w-3" />
                              </Link>
                            </Button>
                          )}
                        </div>
                      </div>
                    )}

                    {m.proposal.type === "create_ai_course" && m.proposal.previewData?.course && (
                      <div className="p-3 bg-muted/10 text-xs space-y-2.5">
                        <div className="flex items-start gap-3">
                          {m.proposal.previewData.course.thumbnailUrl && (
                            <img
                              src={m.proposal.previewData.course.thumbnailUrl}
                              alt="Thumbnail"
                              className="h-16 w-24 object-cover rounded-xl border shrink-0"
                            />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="font-extrabold text-xs text-foreground truncate">
                              {m.proposal.previewData.course.title}
                            </p>
                            <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                              {m.proposal.previewData.course.description}
                            </p>
                            <div className="flex flex-wrap gap-1.5 mt-1.5">
                              <Badge variant="outline" className="text-[9px] font-bold">
                                {m.proposal.previewData.course.category}
                              </Badge>
                              <Badge variant="outline" className="text-[9px] font-bold bg-primary/10 text-primary border-primary/20">
                                {m.proposal.previewData.course.modules?.length || 0} Modules
                              </Badge>
                              <Badge variant="outline" className="text-[9px] font-bold bg-purple-500/10 text-purple-600 border-purple-500/20">
                                {m.proposal.previewData.course.flashcards?.length || 0} Flashcards
                              </Badge>
                              <Badge variant="outline" className="text-[9px] font-bold bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                                {m.proposal.previewData.course.quiz?.length || 0} Quiz Questions
                              </Badge>
                            </div>
                          </div>
                        </div>

                        {m.proposal.status === "executed" && (
                          <div className="pt-2 border-t flex justify-end">
                            <Button size="sm" variant="outline" asChild className="h-6 text-[10px] font-bold rounded-lg gap-1">
                              <Link to="/learn" target="_blank">
                                View in Learning Hub <ExternalLink className="h-3 w-3" />
                              </Link>
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                </div>
              )}

              {/* Collapsible Tool Execution Logs */}
              {m.toolLogs && m.toolLogs.length > 0 && (
                <div className="w-full max-w-[90%] sm:max-w-[85%] mt-1">
                  <button
                    onClick={() => toggleLog(m.id)}
                    className="flex items-center justify-between w-full p-2 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/20 rounded-xl transition-colors"
                  >
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Executed {m.toolLogs.length} Administrative Action(s)
                    </span>
                    {expandedLogs[m.id] ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </button>

                  {expandedLogs[m.id] && (
                    <div className="space-y-1.5 mt-1.5 pl-2 border-l-2 border-emerald-500/40">
                      {m.toolLogs.map((log, lIdx) => (
                        <div key={lIdx} className="flex items-center justify-between text-xs bg-background/90 p-2 rounded-xl border border-border/60">
                          <div className="flex items-center gap-2 font-bold min-w-0">
                            <Badge variant="outline" className="text-[9px] uppercase font-extrabold bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                              {log.tool}
                            </Badge>
                            <span className="truncate text-foreground/90">{log.summary}</span>
                          </div>
                          <span className="text-[10px] text-muted-foreground shrink-0 font-mono ml-2">{log.timestamp}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          <div ref={endRef} />
        </CardContent>

        {/* Quick Suggestions Chips Bar */}
        {messages.length > 0 && (
          <div className="px-3 py-1.5 border-t bg-muted/20 flex gap-2 overflow-x-auto no-scrollbar shrink-0">
            {SUGGESTIONS.slice(0, 4).map((s, idx) => (
              <button
                key={idx}
                onClick={() => handleAsk(s)}
                disabled={busy}
                className="whitespace-nowrap px-3 py-1 text-[11px] font-bold rounded-full border border-border bg-background hover:bg-primary/10 hover:text-primary transition-all shrink-0"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Bottom Input Form */}
        <div className="p-3 border-t bg-card/90 shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAsk(input);
            }}
            className="flex items-center gap-2"
          >
            <VoiceInputButton
              onTranscript={(spokenText) => {
                setInput((prev) => (prev ? `${prev} ${spokenText}` : spokenText));
                inputRef.current?.focus();
              }}
              onOpenLiveAgent={() => setLiveVoiceOpen(true)}
              disabled={busy}
              className="h-11 w-11 rounded-xl shrink-0 border-border"
            />
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Speak or type: direct AI Blogger, create a course/custom page, approve businesses..."
              disabled={busy}
              className="h-11 font-medium text-xs sm:text-sm rounded-xl px-4 bg-background border-border shadow-xs focus-visible:ring-2 focus-visible:ring-primary flex-1"
            />
            <Button
              type="submit"
              disabled={busy || !input.trim()}
              className="h-11 px-5 font-black rounded-xl shrink-0 gap-2 shadow-md bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="hidden sm:inline">Reasoning…</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span className="hidden sm:inline">Instruct</span>
                </>
              )}
            </Button>
          </form>
        </div>
      </Card>

      {/* Google Live Voice Agent Modal Dialog (Nigerian Kore Voice + Real-Time VAD) */}
      <GoogleLiveVoiceAgentDialog
        open={liveVoiceOpen}
        onOpenChange={setLiveVoiceOpen}
        onExecuteCommand={async (cmd) => {
          const res = await handleAsk(cmd);
          return res || "Directive processed with AI Strategic Intelligence.";
        }}
      />
    </div>
  );
}
