import { Link } from "react-router-dom";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export default function LegalPageLayout({ title, subtitle, children }: Props) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20 pb-12">
      <div className="bg-gradient-to-br from-fuchsia-600 via-purple-600 to-indigo-600 text-white px-4 py-6 sm:py-8 rounded-b-3xl shadow-lg">
        <div className="container mx-auto max-w-3xl">
          <Button asChild variant="ghost" size="sm" className="text-white hover:text-white hover:bg-white/10 -ml-2 mb-2">
            <Link to="/"><ArrowLeft className="h-4 w-4 mr-1" />Home</Link>
          </Button>
          <div className="flex items-center gap-2 text-xs opacity-80"><ShieldCheck className="h-4 w-4" />Bethelincovibe TV</div>
          <h1 className="text-2xl sm:text-3xl font-extrabold mt-1">{title}</h1>
          {subtitle && <p className="opacity-90 text-sm mt-1">{subtitle}</p>}
          <p className="text-[11px] opacity-70 mt-3">Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
        </div>
      </div>
      <article className="container mx-auto max-w-3xl px-4 mt-6">
        <div className="bg-card rounded-2xl shadow-sm border p-5 sm:p-7 prose prose-sm sm:prose max-w-none prose-headings:text-foreground prose-p:text-muted-foreground prose-li:text-muted-foreground prose-a:text-primary">
          {children}
        </div>
      </article>
    </div>
  );
}
