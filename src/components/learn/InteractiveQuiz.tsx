import { useState } from "react";
import { CourseQuizQuestion } from "@/lib/aiCourseCreatorEngine";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2, XCircle, Award, RotateCcw, ArrowRight, HelpCircle,
  Sparkles, Check, ChevronRight
} from "lucide-react";

interface InteractiveQuizProps {
  quiz: CourseQuizQuestion[];
  courseTitle?: string;
  onPass?: (score: number) => void;
}

export default function InteractiveQuiz({
  quiz,
  courseTitle,
  onPass,
}: InteractiveQuizProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [showExplanation, setShowExplanation] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  if (!quiz || quiz.length === 0) {
    return (
      <div className="p-8 text-center bg-muted/20 rounded-2xl border border-dashed">
        <HelpCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
        <p className="text-xs text-muted-foreground font-medium">No interactive quiz questions available for this course yet.</p>
      </div>
    );
  }

  const currentQ = quiz[currentIndex];
  const userSelected = selectedAnswers[currentIndex];
  const isAnswered = userSelected !== undefined;
  const isCorrect = userSelected === currentQ.correctIndex;

  const handleSelectOption = (idx: number) => {
    if (isAnswered) return; // locked once chosen
    setSelectedAnswers((prev) => ({ ...prev, [currentIndex]: idx }));
    setShowExplanation(true);
  };

  const handleNext = () => {
    setShowExplanation(false);
    if (currentIndex + 1 < quiz.length) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setIsCompleted(true);
      const correctCount = quiz.filter((q, i) => selectedAnswers[i] === q.correctIndex).length;
      const scorePct = Math.round((correctCount / quiz.length) * 100);
      if (scorePct >= 70 && onPass) {
        onPass(scorePct);
      }
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setSelectedAnswers({});
    setShowExplanation(false);
    setIsCompleted(false);
  };

  // Summary calculation
  const totalQuestions = quiz.length;
  const correctCount = quiz.filter((q, i) => selectedAnswers[i] === q.correctIndex).length;
  const scorePercent = Math.round((correctCount / totalQuestions) * 100);
  const passed = scorePercent >= 70;

  if (isCompleted) {
    return (
      <Card className="p-6 sm:p-8 rounded-3xl border-primary/30 text-center space-y-5 bg-gradient-to-b from-card via-background to-primary/5 shadow-lg">
        <div className="relative inline-flex items-center justify-center">
          <div className={`h-20 w-20 rounded-full flex items-center justify-center ${passed ? "bg-emerald-500/20 text-emerald-600 ring-4 ring-emerald-500/30" : "bg-amber-500/20 text-amber-600 ring-4 ring-amber-500/30"}`}>
            <Award className="h-10 w-10 animate-bounce" />
          </div>
        </div>

        <div className="space-y-1">
          <Badge className={`text-xs font-black ${passed ? "bg-emerald-600 text-white" : "bg-amber-600 text-white"}`}>
            {passed ? "Mastery Quiz Passed!" : "Review & Try Again"}
          </Badge>
          <h3 className="text-xl sm:text-2xl font-black text-foreground pt-2">
            You Scored {scorePercent}% ({correctCount}/{totalQuestions} Correct)
          </h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            {passed
              ? "Outstanding performance! You have demonstrated practical comprehension of this business curriculum."
              : "Good effort! Review the flashcards and video takeaways, then retake the quiz to reach the 70% passing threshold."}
          </p>
        </div>

        <div className="flex items-center justify-center gap-3 pt-2">
          <Button
            variant="outline"
            onClick={handleRestart}
            className="rounded-xl font-bold text-xs gap-1.5 h-10"
          >
            <RotateCcw className="h-4 w-4" /> Retake Quiz
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {/* Quiz Header & Step Counter */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <Badge variant="outline" className="text-xs font-extrabold bg-primary/10 text-primary border-primary/30">
            Question {currentIndex + 1} of {totalQuestions}
          </Badge>
        </div>
        <span className="text-xs font-bold text-muted-foreground font-mono">
          Progress: {Math.round(((currentIndex) / totalQuestions) * 100)}%
        </span>
      </div>

      <Progress value={((currentIndex + 1) / totalQuestions) * 100} className="h-1.5 rounded-full" />

      {/* Question Card */}
      <Card className="p-5 sm:p-6 rounded-3xl border-border/80 shadow-md bg-card space-y-4">
        <h3 className="text-base sm:text-lg font-black text-foreground leading-snug">
          {currentQ.question}
        </h3>

        {/* Options List */}
        <div className="space-y-2.5 pt-1">
          {currentQ.options.map((opt, optIdx) => {
            const isThisSelected = userSelected === optIdx;
            const isThisCorrect = optIdx === currentQ.correctIndex;

            let optionStyle = "border-border/80 hover:border-primary/50 hover:bg-muted/40 text-foreground";
            if (isAnswered) {
              if (isThisCorrect) {
                optionStyle = "border-emerald-500 bg-emerald-500/10 text-emerald-950 dark:text-emerald-200 font-bold ring-2 ring-emerald-500/20";
              } else if (isThisSelected && !isThisCorrect) {
                optionStyle = "border-rose-500 bg-rose-500/10 text-rose-950 dark:text-rose-200 font-bold";
              } else {
                optionStyle = "opacity-50 border-border bg-muted/20 text-muted-foreground";
              }
            }

            return (
              <button
                key={optIdx}
                type="button"
                disabled={isAnswered}
                onClick={() => handleSelectOption(optIdx)}
                className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 text-xs sm:text-sm font-medium ${optionStyle}`}
              >
                <div className="flex items-center gap-3">
                  <span className="h-6 w-6 rounded-full border flex items-center justify-center font-bold text-[11px] shrink-0 bg-background">
                    {String.fromCharCode(65 + optIdx)}
                  </span>
                  <span>{opt}</span>
                </div>

                {isAnswered && isThisCorrect && (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                )}
                {isAnswered && isThisSelected && !isThisCorrect && (
                  <XCircle className="h-4 w-4 text-rose-600 shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        {/* Explanation Card */}
        {isAnswered && (
          <div
            className={`p-4 rounded-2xl border text-xs space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200 ${
              isCorrect
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-200"
                : "bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200"
            }`}
          >
            <div className="flex items-center gap-1.5 font-black text-xs uppercase tracking-wider">
              {isCorrect ? <Check className="h-4 w-4 text-emerald-600" /> : <HelpCircle className="h-4 w-4 text-amber-600" />}
              <span>{isCorrect ? "Correct! Strategic Explanation:" : "Takeaway & Explanation:"}</span>
            </div>
            <p className="leading-relaxed font-medium">
              {currentQ.explanation}
            </p>
          </div>
        )}
      </Card>

      {/* Next Button */}
      {isAnswered && (
        <div className="flex justify-end pt-2">
          <Button
            onClick={handleNext}
            className="h-10 px-6 font-black text-xs rounded-xl bg-primary text-primary-foreground gap-1.5 shadow-md"
          >
            {currentIndex + 1 < totalQuestions ? (
              <>
                Next Question <ChevronRight className="h-4 w-4" />
              </>
            ) : (
              <>
                Complete & View Score <Award className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
