import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download, Code2, Copy, Check, Sparkles, FileCode, CheckCircle2 } from "lucide-react";
import { codeExportBundle } from "../services/codeExportBundle";
import { toast } from "sonner";

interface NativeExportDownloadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NativeExportDownloadModal({ open, onOpenChange }: NativeExportDownloadModalProps) {
  const [copied, setCopied] = useState(false);
  const snippet = codeExportBundle.getStandAloneReactSnippet();

  const handleCopy = () => {
    navigator.clipboard.writeText(snippet);
    setCopied(true);
    toast.success("Component code copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    codeExportBundle.downloadBundleAsZipOrJson();
    toast.success("Downloading Vixora integration bundle...");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader className="pb-3 border-b border-border/60">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center">
              <FileCode className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold">Export Native Studio Component</DialogTitle>
              <DialogDescription className="text-xs">
                Embed this standalone React module into any external page, app, or portfolio.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Standalone React Code:</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleCopy} className="h-8 text-xs font-semibold gap-1.5">
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copied ? "Copied" : "Copy Code"}</span>
              </Button>
              <Button size="sm" onClick={handleDownload} className="h-8 bg-orange-600 hover:bg-orange-700 text-white font-semibold text-xs gap-1.5">
                <Download className="h-3.5 w-3.5" />
                <span>Download Bundle</span>
              </Button>
            </div>
          </div>

          <pre className="p-4 rounded-xl bg-muted/80 text-foreground font-mono text-xs overflow-x-auto border border-border/60 max-h-[300px] leading-relaxed">
            {snippet}
          </pre>

          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-700 dark:text-emerald-300 flex items-start gap-2.5">
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
            <p>
              This component functions 100% natively without iframes, connecting automatically to the live Vixora AI Studio backend and cloud render farm.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default NativeExportDownloadModal;
