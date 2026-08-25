import { useState } from "react";
import { Clock, Copy, Check, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { copyToClipboard } from "@/lib/clipboard";

interface Props {
  html: string;
  url: string;
}

export function readingMinutes(html: string) {
  const words = (html || "").replace(/<[^>]+>/g, " ").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

export default function ArticleUtilityBar({ html, url }: Props) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    const success = await copyToClipboard(url);
    if (success) {
      setCopied(true);
      toast.success("Link copied");
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.info("Link: " + url);
    }
  };

  return (
    <div className="mb-6 flex flex-wrap items-center gap-2 border-y py-3 text-sm text-muted-foreground print:hidden">
      <span className="flex items-center gap-1.5">
        <Clock className="h-4 w-4" />
        {readingMinutes(html)} min read
      </span>
      <span className="mx-1 hidden h-4 w-px bg-border sm:block" />
      <Button variant="ghost" size="sm" onClick={copy} className="h-8 gap-1.5">
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        Copy link
      </Button>
      <Button variant="ghost" size="sm" onClick={() => window.print()} className="h-8 gap-1.5">
        <Printer className="h-4 w-4" />
        Print
      </Button>
    </div>
  );
}
