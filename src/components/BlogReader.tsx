import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Play, Pause, Square, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  title: string;
  html: string;
  url?: string;
}

function htmlToPlainText(html: string) {
  const div = document.createElement("div");
  div.innerHTML = html;
  div.querySelectorAll("img, figure, figcaption, picture, script, style, iframe, video, audio").forEach((el) => el.remove());
  div.querySelectorAll("h1,h2,h3,h4,h5,h6,li,p").forEach((h) => h.insertAdjacentText("afterend", ". "));
  return (div.textContent || "")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/\s+/g, " ")
    .replace(/\s+([.,;:!?])/g, "$1")
    .trim();
}

/** Split into ~200-char chunks at sentence boundaries — keeps first chunk short so audio starts instantly. */
function chunkText(text: string): string[] {
  const sentences = text.match(/[^.!?]+[.!?]+|\S+$/g) || [text];
  const out: string[] = [];
  let buf = "";
  const limit = 200;
  for (const s of sentences) {
    if ((buf + s).length > limit && buf) { out.push(buf.trim()); buf = ""; }
    buf += s + " ";
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
}

export default function BlogReader({ title, html, url }: Props) {
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [playing, setPlaying] = useState(false);
  const queueRef = useRef<string[]>([]);
  const idxRef = useRef(0);

  useEffect(() => {
    // Warm up voices so first speak() call fires without delay
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.getVoices();
    }
    return () => {
      try { window.speechSynthesis?.cancel(); } catch {}
    };
  }, []);

  const stopAll = () => {
    try { window.speechSynthesis.cancel(); } catch {}
    queueRef.current = [];
    idxRef.current = 0;
    setPlaying(false);
  };

  const speakNext = () => {
    const chunks = queueRef.current;
    if (idxRef.current >= chunks.length) { setPlaying(false); return; }
    const u = new SpeechSynthesisUtterance(chunks[idxRef.current]);
    u.rate = 1;
    u.pitch = 1;
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find((v) => /en[-_](US|GB|NG)/i.test(v.lang)) || voices.find((v) => v.lang?.startsWith("en"));
    if (preferred) u.voice = preferred;
    u.onend = () => { idxRef.current += 1; speakNext(); };
    u.onerror = () => { idxRef.current += 1; speakNext(); };
    window.speechSynthesis.speak(u);
  };

  const handlePlay = () => {
    if (!("speechSynthesis" in window)) {
      toast.error("Voice reader not supported on this browser");
      return;
    }
    if (playing) {
      window.speechSynthesis.pause();
      setPlaying(false);
      return;
    }
    if (window.speechSynthesis.paused && queueRef.current.length && idxRef.current < queueRef.current.length) {
      window.speechSynthesis.resume();
      setPlaying(true);
      return;
    }
    // Fresh start — chunk & play immediately
    window.speechSynthesis.cancel();
    const text = `${title}. ${htmlToPlainText(html)}`;
    queueRef.current = chunkText(text);
    idxRef.current = 0;
    setPlaying(true);
    speakNext();
  };

  const handleDownloadPdf = async () => {
    setLoadingPdf(true);
    try {
      const { default: jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ unit: "pt", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 48;
      const maxW = pageW - margin * 2;
      const canonical = url || (typeof window !== "undefined" ? window.location.href : "https://bethelincovibe.tv");
      const home = typeof window !== "undefined" ? window.location.origin : "https://bethelincovibe.tv";

      // Cover page
      pdf.setFillColor(139, 92, 246);
      pdf.rect(0, 0, pageW, 6, "F");
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(139, 92, 246);
      pdf.setFontSize(11);
      pdf.text("BETHELINCOVIBE TV · eBOOK", margin, margin);
      pdf.setTextColor(20, 20, 20);
      pdf.setFontSize(24);
      const titleLines = pdf.splitTextToSize(title, maxW);
      pdf.text(titleLines, margin, margin + 40);
      let y = margin + 40 + titleLines.length * 28 + 20;
      pdf.setFontSize(11);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(90, 90, 90);
      pdf.text(`Published ${new Date().toLocaleDateString()}`, margin, y);
      y += 30;
      pdf.setTextColor(139, 92, 246);
      pdf.setFont("helvetica", "bold");
      pdf.textWithLink("→ Read the original article online", margin, y, { url: canonical });
      y += 22;
      pdf.setTextColor(90, 90, 90);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.textWithLink(canonical, margin, y, { url: canonical });

      // Body — walk DOM nodes for real formatting
      pdf.addPage();
      y = margin;
      const writeFooter = () => {
        pdf.setFontSize(9);
        pdf.setTextColor(139, 92, 246);
        pdf.setFont("helvetica", "normal");
        pdf.textWithLink("bethelincovibe.tv", margin, pageH - 20, { url: home });
        pdf.setTextColor(140, 140, 140);
        pdf.text(`© ${new Date().getFullYear()}`, pageW - margin, pageH - 20, { align: "right" });
      };
      const ensureSpace = (need: number) => {
        if (y + need > pageH - 40) {
          writeFooter();
          pdf.addPage();
          y = margin;
        }
      };
      const writeParagraph = (text: string, opts: { size?: number; bold?: boolean; color?: [number, number, number]; gap?: number } = {}) => {
        const size = opts.size ?? 11;
        const color = opts.color ?? [30, 30, 30];
        pdf.setFont("helvetica", opts.bold ? "bold" : "normal");
        pdf.setFontSize(size);
        pdf.setTextColor(...color);
        const lines = pdf.splitTextToSize(text, maxW);
        for (const line of lines) {
          ensureSpace(size + 4);
          pdf.text(line, margin, y);
          y += size + 4;
        }
        y += opts.gap ?? 6;
      };

      const container = document.createElement("div");
      container.innerHTML = html;
      container.querySelectorAll("script,style,iframe,video,audio,img,figure,picture").forEach((el) => el.remove());
      const nodes = Array.from(container.querySelectorAll("h1,h2,h3,h4,p,li,blockquote"));
      const linkList: { text: string; url: string }[] = [];
      for (const el of nodes) {
        const tag = el.tagName.toLowerCase();
        // Collect anchor hrefs so we can list them as clickable references
        el.querySelectorAll("a[href]").forEach((a) => {
          const href = (a as HTMLAnchorElement).href;
          const text = (a.textContent || "").trim();
          if (href && text && !linkList.some((l) => l.url === href)) linkList.push({ text: text.slice(0, 60), url: href });
        });
        const text = (el.textContent || "").replace(/\s+/g, " ").trim();
        if (!text) continue;
        if (tag === "h1") writeParagraph(text, { size: 18, bold: true, color: [139, 92, 246], gap: 10 });
        else if (tag === "h2") writeParagraph(text, { size: 15, bold: true, color: [80, 40, 160], gap: 8 });
        else if (tag === "h3" || tag === "h4") writeParagraph(text, { size: 13, bold: true, color: [50, 50, 50], gap: 6 });
        else if (tag === "li") writeParagraph(`•  ${text}`, { size: 11 });
        else if (tag === "blockquote") writeParagraph(`" ${text} "`, { size: 11, color: [90, 90, 90] });
        else writeParagraph(text, { size: 11 });
      }

      // References section with real clickable links
      if (linkList.length) {
        ensureSpace(60);
        writeParagraph("References & Links", { size: 14, bold: true, color: [139, 92, 246], gap: 8 });
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "normal");
        for (const l of linkList.slice(0, 30)) {
          ensureSpace(28);
          pdf.setTextColor(30, 30, 30);
          pdf.text(`• ${l.text}`, margin, y);
          y += 12;
          pdf.setTextColor(59, 130, 246);
          pdf.textWithLink(l.url, margin + 12, y, { url: l.url });
          y += 16;
        }
      }

      // Back-to-blog CTA
      ensureSpace(80);
      y += 10;
      pdf.setDrawColor(139, 92, 246);
      pdf.setLineWidth(1);
      pdf.line(margin, y, pageW - margin, y);
      y += 20;
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(13);
      pdf.setTextColor(139, 92, 246);
      pdf.textWithLink("→ Continue reading & comment on the original article", margin, y, { url: canonical });
      y += 18;
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.setTextColor(90, 90, 90);
      pdf.textWithLink(canonical, margin, y, { url: canonical });

      writeFooter();
      pdf.save(`${title.replace(/[^a-z0-9]+/gi, "-").toLowerCase().slice(0, 60)}.pdf`);
      toast.success("eBook downloaded");
    } catch (e: any) {
      toast.error(e?.message || "PDF generation failed");
    } finally {
      setLoadingPdf(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 my-4 p-3 rounded-lg bg-gradient-to-r from-primary/10 to-accent/10 border">
      <span className="text-xs font-semibold text-primary mr-1">Listen / Download:</span>
      <Button size="sm" variant="default" onClick={handlePlay}>
        {playing ? <Pause className="h-4 w-4 mr-1" /> : <Play className="h-4 w-4 mr-1" />}
        {playing ? "Pause" : "Listen"}
      </Button>
      {playing && (
        <Button size="sm" variant="outline" onClick={stopAll}>
          <Square className="h-4 w-4 mr-1" />Stop
        </Button>
      )}
      <Button size="sm" variant="outline" onClick={handleDownloadPdf} disabled={loadingPdf}>
        {loadingPdf ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Download className="h-4 w-4 mr-1" />}
        eBook (PDF)
      </Button>
    </div>
  );
}
