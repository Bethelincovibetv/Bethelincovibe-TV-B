import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Mail, MapPin, MessageSquare, Send, Sparkles, Phone, HelpCircle,
  Headphones, ShieldCheck, CheckCircle2, MessageCircle, Clock, Zap, ArrowRight,
  AlertCircle, Search, ChevronDown, ChevronUp
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import FrontendSpecialistWidget from "@/components/ai/FrontendSpecialistWidget";
import { WORKFORCE_HEADSHOTS } from "@/lib/aiWorkforceRegistry";
import SEO from "@/components/SEO";
import { PAGE_OG_IMAGES, SITE_NAME } from "@/lib/seo";

const FAQS = [
  {
    q: "How do I get my business verified on Bethelincovibe TV?",
    a: "Go to your Business Profile in the Dashboard. Fill in your official business registration details, store location, phone numbers, and product photos. Once submitted, our team and Sentinel Security AI will audit and approve your verified badge within 24 hours.",
  },
  {
    q: "How do custom sales pages and direct WhatsApp funnels work?",
    a: "In your Dashboard under 'Sales Pages', you can create standalone high-converting product pages with direct WhatsApp buy buttons. Atlas Mercer (Marketplace AI) can even draft the sales copy for you!",
  },
  {
    q: "How do wallet reward credits and daily bonuses work?",
    a: "You earn wallet credits through daily logins, referring other founders, and completing interactive masterclass quizzes in the Learning Hub. Wallet credits can be used to purchase sponsored banner ads and directory spotlights.",
  },
  {
    q: "How can I advertise my products across the platform?",
    a: "Visit the 'Sponsored Ads' section in your dashboard. You can upload custom banners, target specific business categories, and set your daily budget using your wallet balance or Paystack.",
  },
  {
    q: "What should I do if a buyer or seller does not respond on WhatsApp?",
    a: "Ensure the merchant has a verified badge. If you encounter an unresponsive or suspicious contact, submit a priority ticket using the form below or chat directly with Aria Chen.",
  },
];

export default function Support() {
  const [loading, setLoading] = useState(false);
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(0);
  const [searchFaq, setSearchFaq] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    const { error } = await supabase.from("contact_submissions").insert({
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      subject: formData.get("subject") as string,
      message: formData.get("message") as string,
    });

    if (error) {
      toast.error("Failed to submit support ticket. Please try again or email us directly.");
    } else {
      toast.success("Support ticket received! Aria Chen & our support team will respond promptly.");
      form.reset();
    }
    setLoading(false);
  };

  const filteredFaqs = FAQS.filter(
    (f) =>
      f.q.toLowerCase().includes(searchFaq.toLowerCase()) ||
      f.a.toLowerCase().includes(searchFaq.toLowerCase())
  );

  return (
    <>
      <SEO
        title={`Support & Help Center — 24/7 Merchant Care | ${SITE_NAME}`}
        description="Bethelincovibe TV Support & Help Center. Get 24/7 AI-assisted merchant onboarding, dispute resolution, business verification, and direct customer care in Lagos, Nigeria."
        url="/support"
        type="website"
        image={PAGE_OG_IMAGES.support()}
      />

      <div className="min-h-screen bg-background pb-16">
        {/* Top Hero Banner */}
        <div className="relative py-12 sm:py-16 bg-gradient-to-b from-primary/10 via-background to-background border-b border-border/60">
          <div className="container mx-auto px-4 max-w-5xl text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/25 text-primary text-xs font-black uppercase tracking-wider">
              <Headphones className="h-3.5 w-3.5" />
              <span>Bethelincovibe Support Center</span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-foreground">
              How can we assist your business today?
            </h1>

            <p className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-2xl mx-auto font-medium leading-relaxed">
              24/7 dedicated assistance for merchants, founders, buyers, and creators. Connect directly with our Customer Support AI Specialist or submit a priority inquiry.
            </p>

            {/* Quick Channel Badges */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Aria Chen (AI Specialist): Online 24/7
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/30">
                <Clock className="h-3 w-3" />
                Human Support SLA: Under 2 Hours
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/30">
                <ShieldCheck className="h-3 w-3" />
                Verified Merchant Protection
              </span>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 max-w-5xl pt-8 space-y-10">
          {/* Main Grid: AI Specialist Chat & Contact Channels */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: AI Support Specialist (Aria Chen) */}
            <div className="lg:col-span-7 space-y-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <h2 className="text-xl font-black text-foreground">Meet Your AI Support Specialist</h2>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground font-medium">
                  Aria Chen is trained on the complete Bethelincovibe TV ecosystem to answer questions, troubleshoot listings, and guide your growth.
                </p>
              </div>

              {/* Embedded Frontend Specialist Widget */}
              <FrontendSpecialistWidget
                agentId="support_ai"
                mode="embedded"
                title="Customer Experience & Onboarding Specialist"
                subtitle="Resolves merchant queries, WhatsApp funnels, and account issues."
                contextData={{
                  page: "support_hub",
                  ecosystem: "Bethelincovibe TV",
                  helpTopics: ["Business Verification", "WhatsApp Funnels", "Wallet Credits", "Ad Campaigns"],
                }}
                customPrompts={[
                  "How do I verify my business listing?",
                  "Troubleshoot WhatsApp lead button",
                  "Explain wallet reward credits",
                  "Guide to creating custom sales pages"
                ]}
              />

              {/* Direct Support Channels */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <Card className="rounded-2xl border-2 border-border/80 bg-card shadow-2xs hover:border-primary/40 transition-colors">
                  <CardContent className="p-4 sm:p-5 flex items-start gap-3.5">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Mail className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">Official Email</p>
                      <a
                        href="mailto:bethelincovibetv@gmail.com"
                        className="text-xs sm:text-sm font-bold text-foreground hover:text-primary transition-colors block truncate mt-0.5"
                      >
                        bethelincovibetv@gmail.com
                      </a>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Checked continuously</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-2 border-border/80 bg-card shadow-2xs hover:border-primary/40 transition-colors">
                  <CardContent className="p-4 sm:p-5 flex items-start gap-3.5">
                    <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">Headquarters &amp; Hub</p>
                      <p className="text-xs sm:text-sm font-bold text-foreground mt-0.5">Lagos, Nigeria</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Operating across West Africa</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Right Column: Direct Ticket Submission Form */}
            <div className="lg:col-span-5 space-y-6">
              <Card className="rounded-3xl border-2 border-border/80 shadow-md bg-card overflow-hidden">
                <CardHeader className="p-5 sm:p-6 pb-3 border-b bg-muted/30">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    <CardTitle className="text-base sm:text-lg font-black">Submit a Priority Ticket</CardTitle>
                  </div>
                  <CardDescription className="text-xs">
                    Need technical investigation, billing audit, or partnership review? Leave your details below.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-5 sm:p-6 pt-5">
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="name" className="text-xs font-bold uppercase tracking-wider text-foreground">
                        Your Full Name
                      </Label>
                      <Input
                        id="name"
                        name="name"
                        required
                        placeholder="e.g. Tunde Balogun"
                        className="h-10 rounded-xl text-xs sm:text-sm"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-foreground">
                        Email Address
                      </Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        required
                        placeholder="you@business.com"
                        className="h-10 rounded-xl text-xs sm:text-sm"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="subject" className="text-xs font-bold uppercase tracking-wider text-foreground">
                        Inquiry Topic / Subject
                      </Label>
                      <Input
                        id="subject"
                        name="subject"
                        required
                        placeholder="e.g. Business verification status, Ad campaign assistance"
                        className="h-10 rounded-xl text-xs sm:text-sm"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="message" className="text-xs font-bold uppercase tracking-wider text-foreground">
                        Detailed Message
                      </Label>
                      <Textarea
                        id="message"
                        name="message"
                        required
                        placeholder="Describe what you need assistance with..."
                        rows={4}
                        className="rounded-xl text-xs sm:text-sm resize-y"
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full h-11 rounded-xl font-black text-xs sm:text-sm gap-2 bg-primary text-primary-foreground shadow-md hover:opacity-95"
                    >
                      {loading ? (
                        "Submitting Ticket..."
                      ) : (
                        <>
                          <Send className="h-4 w-4" />
                          <span>Dispatch Support Ticket</span>
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Section: Frequently Asked Questions (Accordion) */}
          <div className="pt-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-foreground">Frequently Asked Questions</h2>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                  Instant answers to common questions about directory listings, sales funnels, and rewards.
                </p>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchFaq}
                  onChange={(e) => setSearchFaq(e.target.value)}
                  placeholder="Search FAQs..."
                  className="h-9 pl-9 text-xs rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-3">
              {filteredFaqs.map((faq, idx) => {
                const isOpen = openFaqIdx === idx;
                return (
                  <Card
                    key={idx}
                    className="rounded-2xl border-2 border-border/80 bg-card overflow-hidden transition-all duration-200"
                  >
                    <button
                      onClick={() => setOpenFaqIdx(isOpen ? null : idx)}
                      className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors"
                    >
                      <span className="text-xs sm:text-sm font-black text-foreground flex items-center gap-2.5">
                        <HelpCircle className="h-4 w-4 text-primary shrink-0" />
                        {faq.q}
                      </span>
                      {isOpen ? (
                        <ChevronUp className="h-4 w-4 text-primary shrink-0" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                    </button>

                    {isOpen && (
                      <div className="px-4 sm:px-5 pb-5 pt-1 text-xs sm:text-sm text-muted-foreground font-medium leading-relaxed border-t border-border/60 bg-muted/10">
                        {faq.a}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
