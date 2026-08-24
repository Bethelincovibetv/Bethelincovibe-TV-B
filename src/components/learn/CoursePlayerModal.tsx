import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Play, BookOpen, HelpCircle, Award, CheckCircle2, Clock, User,
  Sparkles, Share2, Layers, Check, X, ArrowLeft
} from "lucide-react";
import InteractiveFlashcards from "./InteractiveFlashcards";
import InteractiveQuiz from "./InteractiveQuiz";
import CourseCertificate from "./CourseCertificate";
import { decodeCourseMetadata } from "@/lib/aiCourseCreatorEngine";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface CoursePlayerModalProps {
  course: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCourseCompleted?: (courseId: string) => void;
}

function getYouTubeEmbedUrl(url: string) {
  if (!url) return "";
  const match = url.match(/(?:v=|youtu\.be\/|embed\/)([\w-]{11})/);
  return match ? `https://www.youtube.com/embed/${match[1]}?autoplay=1&rel=0` : url;
}

export default function CoursePlayerModal({
  course,
  open,
  onOpenChange,
  onCourseCompleted,
}: CoursePlayerModalProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("video");
  const [quizScore, setQuizScore] = useState<number | null>(null);
  const [videoWatched, setVideoWatched] = useState(false);

  if (!course) return null;

  const metadata = decodeCourseMetadata(course.description);
  const youtubeUrl = course.youtube_url || "";
  const videoUrl = course.video_url || "";
  const hasVideo = !!youtubeUrl || !!videoUrl;

  const handleQuizPass = (score: number) => {
    setQuizScore(score);
    toast.success(`🎉 You passed the mastery quiz with ${score}%! Your Certificate of Completion is unlocked.`);
    setActiveTab("certificate");
    if (onCourseCompleted) {
      onCourseCompleted(course.id);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden rounded-3xl border-border/80 shadow-2xl bg-background max-h-[92vh] flex flex-col">
        {/* Header */}
        <DialogHeader className="p-4 sm:p-5 border-b bg-muted/30 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-[10px] font-black uppercase tracking-wider bg-primary/10 text-primary border-primary/30">
                  {course.category || "Masterclass"}
                </Badge>
                {metadata.level && (
                  <Badge variant="secondary" className="text-[10px] font-bold">
                    {metadata.level}
                  </Badge>
                )}
                {course.duration_minutes && (
                  <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {course.duration_minutes} mins
                  </span>
                )}
              </div>
              <DialogTitle className="text-base sm:text-lg font-black text-foreground line-clamp-1 leading-snug">
                {course.title}
              </DialogTitle>
            </div>
          </div>
        </DialogHeader>

        {/* Tab Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <div className="px-4 sm:px-6 pt-3 border-b bg-muted/10 shrink-0">
            <TabsList className="grid grid-cols-4 h-10 rounded-2xl bg-muted/60 p-1">
              <TabsTrigger value="video" className="rounded-xl text-xs font-bold gap-1.5 py-1">
                <Play className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Video Class</span><span className="sm:hidden">Video</span>
              </TabsTrigger>
              <TabsTrigger value="flashcards" className="rounded-xl text-xs font-bold gap-1.5 py-1">
                <BookOpen className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Flashcards</span><span className="sm:hidden">Cards</span>
              </TabsTrigger>
              <TabsTrigger value="quiz" className="rounded-xl text-xs font-bold gap-1.5 py-1">
                <HelpCircle className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Knowledge Quiz</span><span className="sm:hidden">Quiz</span>
              </TabsTrigger>
              <TabsTrigger value="certificate" className="rounded-xl text-xs font-bold gap-1.5 py-1">
                <Award className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Certificate</span><span className="sm:hidden">Cert</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            {/* TAB 1: VIDEO CLASS */}
            <TabsContent value="video" className="m-0 space-y-5">
              <div className="relative aspect-video rounded-2xl overflow-hidden bg-black shadow-lg border border-border">
                {youtubeUrl ? (
                  <iframe
                    src={getYouTubeEmbedUrl(youtubeUrl)}
                    title={course.title}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : videoUrl ? (
                  <video src={videoUrl} controls autoPlay className="w-full h-full" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 p-6 text-center">
                    <Play className="h-12 w-12 text-primary mb-2 opacity-50" />
                    <p className="text-sm font-bold">Interactive Audio & Visual Guide Ready</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                      Use the Flashcards and Quiz tabs above to practice key concepts and test your mastery.
                    </p>
                  </div>
                )}
              </div>

              {/* Course Overview & Instructor */}
              <div className="grid gap-4 sm:grid-cols-3 pt-2">
                <div className="sm:col-span-2 space-y-3">
                  <h4 className="text-sm font-black text-foreground">Course Overview</h4>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    {metadata.cleanDescription || course.description}
                  </p>

                  {/* Modules Curriculum */}
                  {metadata.modules && metadata.modules.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <h5 className="text-xs font-black uppercase text-foreground tracking-wider flex items-center gap-1.5">
                        <Layers className="h-3.5 w-3.5 text-primary" /> Curriculum Modules ({metadata.modules.length})
                      </h5>
                      <div className="space-y-2">
                        {metadata.modules.map((mod, idx) => (
                          <div key={idx} className="p-3 rounded-2xl border bg-card/60 space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-black text-foreground">
                                Module {idx + 1}: {mod.title}
                              </span>
                              <span className="text-[10px] text-muted-foreground font-mono">
                                {mod.durationMinutes} mins
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground">{mod.summary}</p>
                            {mod.keyTakeaways && mod.keyTakeaways.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 pt-1">
                                {mod.keyTakeaways.map((takeaway, tIdx) => (
                                  <span key={tIdx} className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-md font-medium">
                                    ✓ {takeaway}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Sidebar Info */}
                <div className="space-y-4">
                  {/* Instructor Card */}
                  <div className="p-4 rounded-2xl border bg-muted/20 space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                      Instructor
                    </span>
                    <div className="flex items-center gap-2.5">
                      <div className="h-9 w-9 rounded-full bg-primary/10 text-primary font-black flex items-center justify-center text-xs shrink-0">
                        {course.instructor_name?.charAt(0) || "I"}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-foreground leading-tight">
                          {course.instructor_name || "Lead Instructor"}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {metadata.instructorTitle || "Commercial Expert"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Next Step Action */}
                  <div className="p-4 rounded-2xl border border-primary/30 bg-primary/5 space-y-2">
                    <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-primary" /> Active Practice
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Review interactive flashcards to cement definitions, then test your knowledge to unlock your certificate.
                    </p>
                    <Button
                      size="sm"
                      onClick={() => setActiveTab("flashcards")}
                      className="w-full h-8 text-xs font-black rounded-xl"
                    >
                      Practice Flashcards
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* TAB 2: FLASHCARDS */}
            <TabsContent value="flashcards" className="m-0 space-y-4">
              <InteractiveFlashcards
                flashcards={metadata.flashcards}
                courseTitle={course.title}
              />
            </TabsContent>

            {/* TAB 3: KNOWLEDGE QUIZ */}
            <TabsContent value="quiz" className="m-0 space-y-4">
              <InteractiveQuiz
                quiz={metadata.quiz}
                courseTitle={course.title}
                onPass={handleQuizPass}
              />
            </TabsContent>

            {/* TAB 4: CERTIFICATE */}
            <TabsContent value="certificate" className="m-0 space-y-4">
              {quizScore !== null && quizScore >= 70 ? (
                <CourseCertificate
                  userName={user?.email?.split("@")[0] || "Lagos Entrepreneur"}
                  courseTitle={course.title}
                  category={course.category || "Business"}
                  instructorName={course.instructor_name || "Masterclass Director"}
                  score={quizScore}
                />
              ) : (
                <div className="p-8 text-center bg-muted/20 rounded-3xl border border-dashed space-y-4">
                  <div className="h-14 w-14 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto">
                    <Award className="h-7 w-7 opacity-70" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-base font-black text-foreground">Certificate Locked</h4>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                      Complete the Knowledge Quiz with a score of 70% or higher to unlock your personalized Certificate of Completion!
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setActiveTab("quiz")}
                    className="rounded-xl font-bold text-xs bg-primary text-primary-foreground"
                  >
                    Take Quiz Now
                  </Button>
                </div>
              )}
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
