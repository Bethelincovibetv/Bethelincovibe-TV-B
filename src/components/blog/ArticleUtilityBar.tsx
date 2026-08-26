import { useState } from "react";
import { Clock, Copy, Check, Printer, Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { copyToClipboard } from "@/lib/clipboard";
import FavoriteButton from "@/components/FavoriteButton";

interface Props {
  html: string;
  url: string;
  postId?: string;
}

export function readingMinutes(html: string) {
  const words = (html || "").replace(/<[^>]+>/g, " ").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

export default function ArticleUtilityBar({ html, url, postId }: Props) {
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
    <div className="mb-6 flex flex-wrap items-center justify-between gap-2 border-y py-2.5 text-sm text-muted-foreground print:hidden">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="flex items-center gap-1.5 font-medium text-xs sm:text-sm">
          <Clock className="h-4 w-4" />
          {readingMinutes(html)} min read
        </span>
        <span className="mx-1 hidden h-4 w-px bg-border sm:block" />
        <Button variant="ghost" size="sm" onClick={copy} className="h-8 gap-1.5 text-xs">
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          Copy link
        </Button>
        <Button variant="ghost" size="sm" onClick={() => window.print()} className="h-8 gap-1.5 text-xs">
          <Printer className="h-4 w-4" />
          Print
        </Button>
      </div>

      {postId && (
        <div className="flex items-center gap-2">
          <FavoriteButton postId={postId} showText={true} size="sm" variant="outline" />
        </div>
      )}
    </div>
  );
}
