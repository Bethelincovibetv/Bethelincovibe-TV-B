import { useState, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { QrCode, Download, Copy, Share2, ExternalLink, Check, Sparkles, Printer } from "lucide-react";
import { toast } from "sonner";
import { copyToClipboard } from "@/lib/clipboard";

interface QRCodeDialogProps {
  url: string;
  title?: string;
  subtitle?: string;
  trigger?: React.ReactNode;
}

export default function QRCodeDialog({ url, title = "Share via QR Code", subtitle = "Scan with any smartphone camera to visit page instantly", trigger }: QRCodeDialogProps) {
  const [copied, setCopied] = useState(false);
  const qrRef = useRef<SVGSVGElement>(null);

  const fullUrl = url.startsWith("http") ? url : `${window.location.origin}${url.startsWith("/") ? "" : "/"}${url}`;

  const handleCopy = async () => {
    const success = await copyToClipboard(fullUrl);
    if (success) {
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.info("Link: " + fullUrl);
    }
  };

  const downloadPNG = () => {
    const svgElement = qrRef.current;
    if (!svgElement) return;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      canvas.width = 1000;
      canvas.height = 1000;
      if (ctx) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 100, 100, 800, 800);

        const pngFile = canvas.toDataURL("image/png");
        const downloadLink = document.createElement("a");
        downloadLink.download = `QR-Code-${title.toLowerCase().replace(/[^a-z0-9]/g, "-")}.png`;
        downloadLink.href = pngFile;
        downloadLink.click();
        toast.success("QR Code downloaded! High resolution ready for physical print.");
      }
    };

    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm" variant="outline" className="rounded-xl font-bold gap-1.5 text-xs shadow-xs">
            <QrCode className="h-4 w-4 text-primary" /> QR Code
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-card border-border/80 shadow-2xl">
        <DialogHeader className="text-center space-y-1">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-1">
            <QrCode className="h-6 w-6" />
          </div>
          <DialogTitle className="text-xl font-black">{title}</DialogTitle>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center space-y-4 py-4">
          {/* Print Ready Card Frame */}
          <div className="p-6 rounded-3xl bg-white border-2 border-slate-200 shadow-xl flex flex-col items-center text-center space-y-3 w-64 text-slate-900">
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
              <QRCodeSVG
                ref={qrRef}
                value={fullUrl}
                size={180}
                level="H"
                includeMargin={true}
                fgColor="#0f172a"
                bgColor="#ffffff"
              />
            </div>
            <div className="space-y-0.5">
              <p className="text-xs font-black tracking-tight text-slate-900 uppercase">Scan to Connect</p>
              <p className="text-[10px] text-slate-500 truncate max-w-[200px]">{fullUrl.replace(/^https?:\/\//, "")}</p>
            </div>
            <Badge className="bg-emerald-600 text-white font-extrabold text-[9px] px-2 py-0.5 rounded-full">
              Verified Landing Page
            </Badge>
          </div>

          <div className="w-full flex items-center gap-2">
            <Input value={fullUrl} readOnly className="text-xs rounded-xl h-10 bg-muted/50 font-mono" />
            <Button size="icon" variant="outline" onClick={handleCopy} className="rounded-xl h-10 w-10 shrink-0">
              {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button onClick={downloadPNG} className="w-full rounded-2xl font-extrabold text-xs h-10 gap-1.5 shadow-md">
            <Download className="h-4 w-4" /> Download High-Res PNG (Print)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
