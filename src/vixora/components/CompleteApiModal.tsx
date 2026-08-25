import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DeveloperApiView } from "./DeveloperApiView";

interface CompleteApiModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CompleteApiModal({ open, onOpenChange }: CompleteApiModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader className="pb-3 border-b border-border/60">
          <DialogTitle className="text-xl font-bold">Vixora AI Studio Developer API</DialogTitle>
          <DialogDescription className="text-xs">
            Complete API reference, client SDK integration code, and live testing sandbox.
          </DialogDescription>
        </DialogHeader>

        <div className="pt-2">
          <DeveloperApiView />
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default CompleteApiModal;
