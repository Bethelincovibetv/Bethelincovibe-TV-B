import { useRef } from "react";
import { Award, Download, Share2, Sparkles, CheckCircle2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface CourseCertificateProps {
  userName: string;
  courseTitle: string;
  category: string;
  instructorName?: string;
  score?: number;
  issueDate?: string;
}

export default function CourseCertificate({
  userName,
  courseTitle,
  category,
  instructorName = "Lead Instructor",
  score = 100,
  issueDate = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
}: CourseCertificateProps) {
  const certRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    const text = `I just mastered "${courseTitle}" on Bethelincovibe TV Learning Hub with a score of ${score}%! 🎓`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Course Completion Certificate",
          text,
          url: window.location.href,
        });
      } catch {}
    } else {
      navigator.clipboard.writeText(text);
      toast.success("Certificate achievement text copied to clipboard!");
    }
  };

  return (
    <div className="space-y-4">
      {/* Certificate Frame */}
      <div
        ref={certRef}
        className="p-6 sm:p-10 rounded-3xl border-4 border-double border-amber-500/40 bg-gradient-to-br from-amber-500/5 via-background to-primary/5 shadow-2xl relative overflow-hidden text-center space-y-6"
      >
        {/* Background Watermark/Badges */}
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-48 h-48 rounded-full bg-primary/10 blur-3xl pointer-events-none" />

        {/* Top Header */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-black uppercase tracking-widest">
            <Award className="h-4 w-4 text-amber-500" />
            Certificate of Mastery & Completion
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
            BETHELCOVIBE TV LEARNING HUB
          </h2>
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
            Executive Business & Digital Skills Institute · Lagos, Nigeria
          </p>
        </div>

        {/* Presented to */}
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground italic">This is proudly presented to</p>
          <h3 className="text-2xl sm:text-3xl font-black text-primary underline decoration-primary/40 decoration-wavy underline-offset-8">
            {userName || "Distinguished Entrepreneur"}
          </h3>
        </div>

        {/* Course details */}
        <div className="max-w-xl mx-auto space-y-2">
          <p className="text-xs text-muted-foreground">
            For successfully completing the interactive curriculum, active-recall mastery assessments, and passing the comprehensive knowledge exam for:
          </p>
          <div className="p-3 rounded-2xl bg-card border shadow-xs inline-block">
            <h4 className="text-base sm:text-lg font-black text-foreground">{courseTitle}</h4>
            <Badge variant="secondary" className="mt-1 text-[10px] font-bold">
              {category} Track · Score: {score}%
            </Badge>
          </div>
        </div>

        {/* Signatures & Verification */}
        <div className="pt-6 border-t border-border/80 grid grid-cols-2 gap-6 max-w-lg mx-auto text-left">
          <div>
            <p className="text-xs font-extrabold text-foreground">{instructorName}</p>
            <p className="text-[10px] text-muted-foreground">Masterclass Instructor</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-extrabold text-foreground">{issueDate}</p>
            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-end gap-1">
              <ShieldCheck className="h-3 w-3" /> Verified Certificate
            </p>
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex items-center justify-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={handlePrint}
          className="rounded-xl font-bold text-xs gap-1.5 h-9"
        >
          <Download className="h-3.5 w-3.5" /> Download / Print Certificate
        </Button>
        <Button
          size="sm"
          onClick={handleShare}
          className="rounded-xl font-black text-xs gap-1.5 h-9 bg-primary text-primary-foreground shadow-sm"
        >
          <Share2 className="h-3.5 w-3.5" /> Share Achievement
        </Button>
      </div>
    </div>
  );
}
