import VixoraCoachLiveDialog from "./VixoraCoachLiveDialog";

export interface GeminiLiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  systemPrompt?: string;
  coachName?: string;
  businessContext?: any;
}

/**
 * GeminiLiveDialog
 * Re-routed to the upgraded Vixora AI Live Call Engine for seamless backward compatibility.
 */
export default function GeminiLiveDialog(props: GeminiLiveDialogProps) {
  return <VixoraCoachLiveDialog {...props} />;
}
