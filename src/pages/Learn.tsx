import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useFeatureFlags } from "@/contexts/FeatureFlagsContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  GraduationCap, Play, Lock, Clock, User, Share2, Search, BookOpen,
  Sparkles, Award, CheckCircle2, TrendingUp, Briefcase, DollarSign,
  Cpu, ShoppingBag, Building2, Radio, Check, Layers, ChevronRight
} from "lucide-react";
import { toast } from "sonner";
import { Link, Navigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import AdsterraAd from "@/components/AdsterraAd";
import CoursePlayerModal from "@/components/learn/CoursePlayerModal";
import GeminiLiveDialog from "@/components/coach/GeminiLiveDialog";
import { decodeCourseMetadata } from "@/lib/aiCourseCreatorEngine";
import { copyToClipboard } from "@/lib/clipboard";
import learnHeroImage from "@/assets/images/learning_hub_hero_1787779428622.jpg";
import academyCardImage from "@/assets/images/learning_academy_card_1787779443703.jpg";

type Course = {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  video_url: string | null;
  youtube_url: string | null;
  instructor_name: string | null;
  category: string | null;
  price_naira: number;
  duration_minutes: number | null;
  published: boolean;
};

const COURSE_CATEGORIES = [
  { id: "all", label: "All Courses", icon: GraduationCap },
  { id: "Marketing", label: "Marketing Courses", icon: TrendingUp },
  { id: "Business", label: "Business & SME", icon: Briefcase },
  { id: "Finance & Grants", label: "Finance & Grants", icon: DollarSign },
  { id: "Tech & Startup", label: "Tech & Startup", icon: Cpu },
  { id: "E-Commerce", label: "E-Commerce & Retail", icon: ShoppingBag },
  { id: "Real Estate", label: "Real Estate", icon: Building2 },
];

export default function Learn() {
  const { user } = useAuth();
  const { flags, loading: flagsLoading } = useFeatureFlags();
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState<"explore" | "my-courses">("explore");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [playingCourse, setPlayingCourse] = useState<Course | null>(null);
  const [coachOpen, setCoachOpen] = useState(false);

  const share = async () => {
    const url = `${window.location.origin}/learn`;
    const shareData = {
      title: "Bethelincovibe Learning Hub",
      text: "Master commercial growth, marketing, and SME scaling with interactive courses, flashcards, and quizzes! 🎓",
      url,
    };
    try {
      if (navigator.share) await navigator.share(shareData);
      else {
        const success = await copyToClipboard(url);
        if (success) {
          toast.success("Learning Hub link copied to clipboard!");
        } else {
          toast.info("Link: " + url);
        }
      }
    } catch {}
  };

  const { data: courses, isLoading: coursesLoading } = useQuery({
    queryKey: ["learn-courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .eq("published", true)
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as Course[];
    },
  });

  const { data: enrollments, refetch: refetchEnrollments } = useQuery({
    queryKey: ["my-enrollments", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("course_enrollments")
        .select("course_id")
        .eq("user_id", user!.id);
      return new Set((data || []).map((e) => e.course_id));
    },
  });

  const enroll = useMutation({
    mutationFn: async (course_id: string) => {
      const { data, error } = await supabase.rpc("enroll_in_course", { _course_id: course_id });
      if (error) throw error;
      const res = data as any;
      if (!res.success) {
        throw new Error(res.error === "insufficient_balance" ? "Insufficient wallet balance. Please top up your wallet." : res.error);
      }
      return res;
    },
    onSuccess: (_, id) => {
      toast.success("Enrolled successfully! Interactive Learning Room unlocked.");
      refetchEnrollments();
      qc.invalidateQueries({ queryKey: ["my-enrollments"] });
      const c = courses?.find((x) => x.id === id);
      if (c) setPlayingCourse(c);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleLaunchCourse = (c: Course) => {
    if (!user) {
      toast.info("Please log in to access this course and track your mastery.");
      return;
    }
    const isFree = c.price_naira === 0;
    const isEnrolled = enrollments?.has(c.id);

    if (isFree || isEnrolled) {
      setPlayingCourse(c);
    } else {
      enroll.mutate(c.id);
    }
  };

  if (!flagsLoading && !flags.learn) return <Navigate to="/" replace />;

  // Filter courses
  const filteredCourses = (courses || []).filter((c) => {
    const isEnrolled = enrollments?.has(c.id) || (user && c.price_naira === 0);

    if (activeTab === "my-courses") {
      if (!enrollments?.has(c.id)) return false;
    }

    if (selectedCategory !== "all") {
      const catMatch = (c.category || "").toLowerCase() === selectedCategory.toLowerCase();
      if (!catMatch) return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = c.title.toLowerCase().includes(q);
      const matchDesc = (c.description || "").toLowerCase().includes(q);
      const matchInstructor = (c.instructor_name || "").toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchInstructor) return false;
    }

    return true;
  });

  const myEnrolledCount = (courses || []).filter((c) => enrollments?.has(c.id)).length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20 pb-16">
      <Helmet><title>Learning Hub & Masterclasses | Bethelincovibe TV</title></Helmet>

      {/* Top Header Banner */}
      <div className="relative bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-950 text-white border-b border-border/40 shadow-xl overflow-hidden mb-6">
        {/* Ambient AI Background Graphic */}
        <div className="absolute inset-0 opacity-20 pointer-events-none mix-blend-luminosity">
          <img
            src={learnHeroImage}
            alt="Academy Background"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover object-center"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-indigo-950/90 to-slate-950/95" />

        <div className="relative container mx-auto max-w-7xl px-4 py-8 md:py-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-3 text-center md:text-left max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-black">
              <GraduationCap className="h-4 w-4 text-purple-400" />
              Executive Business Academy
            </div>
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white">
              Bethelincovibe Learning Hub
            </h1>
            <p className="text-xs sm:text-sm text-slate-200 font-medium leading-relaxed">
              Accelerate your revenue with expert masterclasses, video tutorials, active-recall flashcards, and verified completion certificates.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap justify-center shrink-0">
            <Button
              onClick={() => setCoachOpen(true)}
              className="h-11 px-5 rounded-2xl font-black text-xs bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 text-white shadow-lg shadow-emerald-600/30 gap-2 transition-all hover:scale-105"
            >
              <Radio className="h-4 w-4 animate-pulse" /> Live Voice Coach
            </Button>
            <Button
              onClick={share}
              className="h-11 px-5 rounded-2xl font-black text-xs bg-white hover:bg-slate-100 text-purple-700 dark:text-purple-600 hover:text-purple-800 border border-purple-300 shadow-md gap-2 transition-all hover:scale-105"
            >
              <Share2 className="h-4 w-4 text-purple-700 dark:text-purple-600" /> Share Hub
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-7xl px-4">
        <AdsterraAd slot="learn" />

        {/* Main 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 mt-6">
          {/* LEFT SIDEBAR NAVIGATION */}
          <div className="space-y-4">
            {/* View Selection (Explore vs My Courses) */}
            <Card className="border-border/80 shadow-xs rounded-3xl overflow-hidden p-2 bg-card">
              <div className="space-y-1">
                <button
                  onClick={() => setActiveTab("explore")}
                  className={`w-full text-left px-3.5 py-3 rounded-2xl text-xs font-black transition-all flex items-center justify-between gap-2 ${
                    activeTab === "explore"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "hover:bg-muted text-foreground"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <GraduationCap className="h-4 w-4" /> Explore All Courses
                  </span>
                  <Badge variant={activeTab === "explore" ? "secondary" : "outline"} className="text-[10px] font-bold">
                    {courses?.length || 0}
                  </Badge>
                </button>

                <button
                  onClick={() => {
                    if (!user) {
                      toast.info("Please log in to view your purchased courses");
                      return;
                    }
                    setActiveTab("my-courses");
                  }}
                  className={`w-full text-left px-3.5 py-3 rounded-2xl text-xs font-black transition-all flex items-center justify-between gap-2 ${
                    activeTab === "my-courses"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "hover:bg-muted text-foreground"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4" /> My Enrolled Courses
                  </span>
                  <Badge variant={activeTab === "my-courses" ? "secondary" : "outline"} className="text-[10px] font-bold">
                    {myEnrolledCount}
                  </Badge>
                </button>
              </div>
            </Card>

            {/* Categories Navigation */}
            <Card className="border-border/80 shadow-xs rounded-3xl p-4 bg-card space-y-3">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 px-1">
                <Layers className="h-3.5 w-3.5 text-primary" /> Course Tracks
              </h3>

              <div className="space-y-1">
                {COURSE_CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  const isSelected = selectedCategory === cat.id;
                  const catCount = cat.id === "all"
                    ? courses?.length || 0
                    : (courses || []).filter((c) => (c.category || "").toLowerCase() === cat.id.toLowerCase()).length;

                  return (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-between gap-2 ${
                        isSelected
                          ? "bg-primary/10 text-primary font-black border border-primary/20"
                          : "hover:bg-muted/60 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <span className="flex items-center gap-2 truncate">
                        <Icon className={`h-4 w-4 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                        {cat.label}
                      </span>
                      <span className="text-[10px] font-mono opacity-70">
                        {catCount}
                      </span>
                    </button>
                  );
                })}
              </div>
            </Card>

            {/* Live AI Coach Call Card */}
            <Card className="border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-card to-teal-500/5 rounded-3xl p-4 space-y-3 shadow-xs">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-emerald-500 animate-ping" />
                <h4 className="text-xs font-black text-foreground">
                  AI Business Coach Online
                </h4>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Need personalized help applying course concepts to your business? Talk directly to Coach Adaobi with live voice.
              </p>
              <Button
                onClick={() => setCoachOpen(true)}
                size="sm"
                className="w-full h-9 rounded-xl font-black text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-sm"
              >
                <Radio className="h-3.5 w-3.5" /> Start Live Voice Call
              </Button>
            </Card>
          </div>

          {/* RIGHT MAIN CONTENT AREA */}
          <div className="space-y-5">
            {/* Search Bar & Stats Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search courses, skills, instructors..."
                  className="pl-9 h-11 text-xs rounded-2xl bg-card border-border shadow-xs"
                />
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto text-xs font-bold text-muted-foreground">
                <span>Showing {filteredCourses.length} Masterclass{filteredCourses.length !== 1 ? "es" : ""}</span>
              </div>
            </div>

            {/* Non-logged in notice */}
            {!user && (
              <Card className="p-4 rounded-3xl bg-primary/5 border-primary/20 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
                <div className="space-y-0.5 text-center sm:text-left">
                  <p className="text-xs font-bold text-foreground">
                    Unlock Free & Premium Masterclasses + Interactive Quizzes
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Log in to track your mastery, flip flashcards, and earn verifiable certificates.
                  </p>
                </div>
                <Button asChild size="sm" className="h-9 px-5 font-black text-xs rounded-xl shrink-0">
                  <Link to="/login">Log In to Enroll</Link>
                </Button>
              </Card>
            )}

            {/* Courses Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredCourses.map((c) => {
                const isEnrolled = enrollments?.has(c.id);
                const isFree = c.price_naira === 0;
                const accessible = isFree || isEnrolled;
                const meta = decodeCourseMetadata(c.description);

                return (
                  <Card
                    key={c.id}
                    onClick={() => handleLaunchCourse(c)}
                    className="group rounded-3xl border-border/80 hover:border-primary/50 bg-card hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col justify-between cursor-pointer"
                  >
                    <div>
                      {/* Course Cover Image */}
                      <div className="relative aspect-video bg-muted overflow-hidden">
                        <img
                          src={c.thumbnail_url || academyCardImage}
                          alt={c.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                        />

                        {/* Top Badges */}
                        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between">
                          <Badge className="bg-slate-900/80 backdrop-blur-md text-white border-white/20 text-[10px] font-black">
                            {c.category || "Masterclass"}
                          </Badge>
                          <Badge
                            className={`text-[10px] font-black shadow-md ${
                              isFree
                                ? "bg-emerald-600 text-white"
                                : "bg-primary text-primary-foreground"
                            }`}
                          >
                            {isFree ? "FREE" : `₦${c.price_naira.toLocaleString()}`}
                          </Badge>
                        </div>

                        {/* Hover Overlay Play Icon */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <div className="h-12 w-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-xl transform scale-90 group-hover:scale-100 transition-transform">
                            {accessible ? <Play className="h-5 w-5 fill-current ml-0.5" /> : <Lock className="h-5 w-5" />}
                          </div>
                        </div>
                      </div>

                      {/* Course Details Body */}
                      <div className="p-4 sm:p-5 space-y-3">
                        <div className="flex items-center gap-2 text-xs text-foreground/80 font-bold">
                          {c.duration_minutes && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5 text-primary" /> {c.duration_minutes} mins
                            </span>
                          )}
                          <span>•</span>
                          <span>{meta.modules?.length || 3} Modules</span>
                          {meta.flashcards?.length > 0 && (
                            <>
                              <span>•</span>
                              <span className="text-primary font-black">{meta.flashcards.length} Flashcards</span>
                            </>
                          )}
                        </div>

                        <h3 className="font-black text-base sm:text-lg text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                          {c.title}
                        </h3>

                        <p className="text-xs sm:text-sm font-medium text-foreground/85 line-clamp-2 leading-relaxed">
                          {meta.cleanDescription || c.description}
                        </p>

                        <div className="pt-2 flex items-center justify-between text-xs text-foreground/80 border-t border-border/70">
                          <span className="flex items-center gap-1.5 font-bold text-foreground">
                            <User className="h-3.5 w-3.5 text-primary" />
                            {c.instructor_name || "Lead Instructor"}
                          </span>
                          <span className="text-emerald-700 dark:text-emerald-300 font-extrabold flex items-center gap-1">
                            <Award className="h-3.5 w-3.5" /> Certificate
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Action Button */}
                    <div className="p-4 sm:p-5 pt-0">
                      <Button
                        size="sm"
                        disabled={enroll.isPending}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLaunchCourse(c);
                        }}
                        className={`w-full h-10 rounded-xl font-black text-xs sm:text-sm gap-2 shadow-sm ${
                          accessible
                            ? "bg-primary text-primary-foreground"
                            : isFree
                            ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                            : "bg-gradient-to-r from-primary to-indigo-600 text-white"
                        }`}
                      >
                        {enroll.isPending ? (
                          "Unlocking…"
                        ) : isEnrolled ? (
                          <>
                            <Play className="h-3.5 w-3.5 fill-current" /> Continue Masterclass
                          </>
                        ) : isFree ? (
                          <>
                            <Play className="h-3.5 w-3.5 fill-current" /> Start Free Course
                          </>
                        ) : (
                          <>
                            <Lock className="h-3.5 w-3.5" /> Unlock for ₦{c.price_naira.toLocaleString()}
                          </>
                        )}
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>

            {/* Empty State */}
            {filteredCourses.length === 0 && !coursesLoading && (
              <Card className="p-12 text-center rounded-3xl border-dashed bg-card space-y-3">
                <GraduationCap className="h-12 w-12 text-muted-foreground mx-auto opacity-40" />
                <h3 className="text-base font-bold text-foreground">No courses found</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  {activeTab === "my-courses"
                    ? "You haven't enrolled in any courses yet. Switch to Explore All Courses to get started!"
                    : "Try adjusting your search query or selecting a different category track."}
                </p>
                {activeTab === "my-courses" && (
                  <Button
                    size="sm"
                    onClick={() => setActiveTab("explore")}
                    className="rounded-xl font-bold text-xs"
                  >
                    Browse Available Courses
                  </Button>
                )}
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Interactive Course Player Modal */}
      <CoursePlayerModal
        course={playingCourse}
        open={!!playingCourse}
        onOpenChange={(open) => !open && setPlayingCourse(null)}
        onCourseCompleted={() => {
          qc.invalidateQueries({ queryKey: ["my-enrollments"] });
        }}
      />

      {/* Live AI Coach Dialog with Nigerian Voice */}
      <GeminiLiveDialog
        open={coachOpen}
        onOpenChange={setCoachOpen}
        systemPrompt="You are Coach Adaobi, an elite Nigerian business mentor. Advise the user on mastering business growth, sales conversion, and scaling in Lagos."
      />
    </div>
  );
}
