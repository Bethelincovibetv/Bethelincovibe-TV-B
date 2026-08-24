import { useState } from "react";
import { CourseFlashcard } from "@/lib/aiCourseCreatorEngine";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  RotateCw, ChevronLeft, ChevronRight, CheckCircle2, Sparkles, HelpCircle,
  BookOpen, Trophy
} from "lucide-react";

interface InteractiveFlashcardsProps {
  flashcards: CourseFlashcard[];
  courseTitle?: string;
}

export default function InteractiveFlashcards({
  flashcards,
  courseTitle,
}: InteractiveFlashcardsProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [masteredIds, setMasteredIds] = useState<Set<string>>(new Set());

  if (!flashcards || flashcards.length === 0) {
    return (
      <div className="p-8 text-center bg-muted/20 rounded-2xl border border-dashed">
        <BookOpen className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
        <p className="text-xs text-muted-foreground font-medium">No interactive flashcards available for this course yet.</p>
      </div>
    );
  }

  const currentCard = flashcards[currentIndex] || flashcards[0];
  const isCurrentMastered = masteredIds.has(currentCard.id);
  const masteryPercentage = Math.round((masteredIds.size / flashcards.length) * 100);

  const toggleFlip = () => {
    setIsFlipped((prev) => !prev);
  };

  const handleNext = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev + 1) % flashcards.length);
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev - 1 + flashcards.length) % flashcards.length);
  };

  const toggleMastered = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMasteredIds((prev) => {
      const next = new Set(prev);
      if (next.has(currentCard.id)) {
        next.delete(currentCard.id);
      } else {
        next.add(currentCard.id);
      }
      return next;
    });
  };

  return (
    <div className="space-y-4">
      {/* Header & Progress */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs font-black bg-primary/10 text-primary border-primary/30">
            Card {currentIndex + 1} of {flashcards.length}
          </Badge>
          <span className="text-xs text-muted-foreground font-medium">
            Active Recall Flashcards
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-amber-500" />
          <span className="text-xs font-bold text-foreground">
            {masteredIds.size}/{flashcards.length} Mastered ({masteryPercentage}%)
          </span>
        </div>
      </div>

      <Progress value={masteryPercentage} className="h-1.5 rounded-full" />

      {/* 3D Flip Card */}
      <div
        onClick={toggleFlip}
        className="relative cursor-pointer select-none group perspective-1000 min-h-[260px] sm:min-h-[280px]"
      >
        <div
          className={`w-full min-h-[260px] sm:min-h-[280px] p-6 sm:p-8 rounded-3xl border transition-all duration-500 flex flex-col justify-between shadow-md relative overflow-hidden ${
            isFlipped
              ? "bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 text-white border-indigo-500/40"
              : "bg-gradient-to-br from-card via-background to-primary/5 border-border hover:border-primary/40 text-foreground"
          }`}
        >
          {/* Top Label */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Sparkles className={`h-4 w-4 ${isFlipped ? "text-amber-400" : "text-primary"}`} />
              <span className={`text-[11px] font-black uppercase tracking-wider ${isFlipped ? "text-indigo-300" : "text-muted-foreground"}`}>
                {isFlipped ? "Strategy & Answer" : "Key Concept / Question"}
              </span>
            </div>

            <Button
              size="sm"
              variant="ghost"
              onClick={toggleMastered}
              className={`h-7 text-xs font-bold rounded-xl gap-1.5 ${
                isCurrentMastered
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                  : isFlipped
                  ? "text-slate-300 hover:text-white hover:bg-white/10"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <CheckCircle2 className={`h-3.5 w-3.5 ${isCurrentMastered ? "text-emerald-400 fill-emerald-400" : ""}`} />
              {isCurrentMastered ? "Mastered" : "Mark Mastered"}
            </Button>
          </div>

          {/* Center Card Content */}
          <div className="my-auto py-4 text-center">
            {!isFlipped ? (
              <h3 className="text-base sm:text-xl font-black text-foreground leading-snug tracking-tight">
                {currentCard.front}
              </h3>
            ) : (
              <div className="space-y-3 animate-in fade-in zoom-in-95 duration-200">
                <p className="text-sm sm:text-base font-semibold text-slate-100 leading-relaxed">
                  {currentCard.back}
                </p>
                {currentCard.example && (
                  <div className="p-2.5 rounded-xl bg-white/10 text-left border border-white/10 text-xs text-amber-200 font-medium">
                    <span className="font-extrabold block text-[10px] uppercase text-amber-300">
                      💡 Real Lagos Market Example:
                    </span>
                    {currentCard.example}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bottom Flip Hint */}
          <div className="flex items-center justify-between text-[11px] opacity-70">
            <span className="flex items-center gap-1 font-medium">
              <RotateCw className="h-3 w-3" /> Click anywhere to flip
            </span>
            <span className="font-mono">
              #{currentIndex + 1}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Controls */}
      <div className="flex items-center justify-between gap-3 pt-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handlePrev}
          className="rounded-xl font-bold text-xs gap-1.5 h-9"
        >
          <ChevronLeft className="h-4 w-4" /> Previous Card
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={toggleFlip}
          className="rounded-xl font-bold text-xs gap-1.5 h-9 bg-muted/40"
        >
          <RotateCw className="h-3.5 w-3.5" /> Flip Card
        </Button>

        <Button
          variant="default"
          size="sm"
          onClick={handleNext}
          className="rounded-xl font-black text-xs gap-1.5 h-9 bg-primary text-primary-foreground shadow-sm"
        >
          Next Card <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
