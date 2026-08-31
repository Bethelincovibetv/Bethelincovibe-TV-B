import { useMemo, useState } from "react";
import { Check, CheckCircle2, ChevronLeft, ChevronRight, ExternalLink, Eye, EyeOff, Loader2, LockKeyhole, ShieldCheck, Sparkles, WalletCards } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const PAYSTACK_SIGNUP_URL = "https://paystack.com/signup";

export type PaystackSetupWizardProps = {
  publicKey: string;
  secretKey: string;
  onPublicKeyChange: (value: string) => void;
  onSecretKeyChange: (value: string) => void;
  onSave?: () => Promise<void> | void;
  connected?: boolean;
};

const steps = [
  { title: "Get started", icon: Sparkles },
  { title: "Set up Paystack", icon: WalletCards },
  { title: "Connect", icon: ShieldCheck },
  { title: "Ready to sell", icon: CheckCircle2 },
];

export default function PaystackSetupWizard({
  publicKey,
  secretKey,
  onPublicKeyChange,
  onSecretKeyChange,
  onSave,
  connected = false,
}: PaystackSetupWizardProps) {
  const [step, setStep] = useState(connected ? 3 : 0);
  const [showSecret, setShowSecret] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [saved, setSaved] = useState(connected);

  const isConfigured = useMemo(
    () => publicKey.trim().length > 0 && secretKey.trim().length > 0,
    [publicKey, secretKey]
  );

  const connect = async () => {
    if (!isConfigured) {
      toast.error("Enter both Paystack keys before connecting.");
      return;
    }

    setConnecting(true);
    try {
      await onSave?.();
      // Keep the animation visible long enough for the user to understand that the
      // credentials are being verified/saved without pretending we verified them locally.
      await new Promise((resolve) => setTimeout(resolve, 900));
      setSaved(true);
      setStep(3);
      toast.success("Paystack connection details saved.");
    } catch (error: any) {
      toast.error(error?.message || "Could not save Paystack connection details.");
    } finally {
      setConnecting(false);
    }
  };

  return (
    <Card className="w-full overflow-hidden rounded-3xl border shadow-sm">
      <CardHeader className="border-b bg-gradient-to-br from-primary/10 via-background to-emerald-500/5 p-4 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-2">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
                <WalletCards className="h-5 w-5" />
              </span>
              <Badge variant="secondary" className="rounded-full text-[10px] font-bold">SETUP WIZARD 🪄</Badge>
            </div>
            <CardTitle className="text-lg sm:text-xl">Connect your Paystack account</CardTitle>
            <CardDescription className="mt-1 text-xs sm:text-sm">
              Set up Paystack to receive payments for your digital products.
            </CardDescription>
          </div>
          {saved && (
            <Badge className="shrink-0 gap-1 rounded-full bg-emerald-600 text-white text-[10px]">
              <Check className="h-3 w-3" /> Connected
            </Badge>
          )}
        </div>

        <div className="mt-5 grid grid-cols-4 gap-1.5 sm:gap-2">
          {steps.map((item, index) => {
            const Icon = item.icon;
            const complete = index < step || (index === 3 && saved);
            const current = index === step;
            return (
              <div key={item.title} className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[11px] font-black transition-all ${
                      complete
                        ? "border-emerald-600 bg-emerald-600 text-white"
                        : current
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-muted-foreground"
                    }`}
                  >
                    {complete ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                  </div>
                  <span className="hidden truncate text-[10px] font-bold sm:block">{item.title}</span>
                </div>
                <div className={`mt-1 h-1 rounded-full ${complete || current ? "bg-primary/70" : "bg-muted"}`} />
              </div>
            );
          })}
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6">
        {step === 0 && (
          <div className="space-y-4">
            <div className="rounded-2xl border bg-muted/30 p-4">
              <h3 className="font-bold">Before you connect</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                You need an active Paystack business account. New to Paystack? Create one first, then come back here.
              </p>
            </div>
            <Button asChild className="h-11 w-full rounded-2xl font-bold gap-2">
              <a href={PAYSTACK_SIGNUP_URL} target="_blank" rel="noopener noreferrer">
                Open Paystack <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
            <Button variant="outline" className="h-11 w-full rounded-2xl font-bold" onClick={() => setStep(1)}>
              I already have Paystack <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div className="rounded-2xl border bg-muted/30 p-4">
              <p className="text-sm font-bold">Set up your Paystack business</p>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs text-muted-foreground">
                <li>Complete your Paystack business profile.</li>
                <li>Complete any verification Paystack requests.</li>
                <li>Open your Paystack dashboard and API Keys section.</li>
              </ol>
            </div>
            <Button asChild variant="outline" className="h-11 w-full rounded-2xl font-bold gap-2">
              <a href="https://dashboard.paystack.com/" target="_blank" rel="noopener noreferrer">
                Open Paystack Dashboard <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
            <Button className="h-11 w-full rounded-2xl font-bold" onClick={() => setStep(2)}>
              Continue to Connect <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
              <div className="flex gap-3">
                <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                <div className="min-w-0">
                  <p className="text-sm font-bold">Connect securely</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Paste your Paystack API credentials below. Secret keys are masked and must never be displayed as plain text.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="paystack-wizard-public" className="text-sm font-bold">Public Key</Label>
              <Input
                id="paystack-wizard-public"
                value={publicKey}
                onChange={(e) => onPublicKeyChange(e.target.value)}
                placeholder="pk_live_..."
                autoComplete="off"
                className="h-11 min-w-0 rounded-xl font-mono text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="paystack-wizard-secret" className="text-sm font-bold">Secret Key</Label>
              <div className="relative min-w-0">
                <Input
                  id="paystack-wizard-secret"
                  type={showSecret ? "text" : "password"}
                  value={secretKey}
                  onChange={(e) => onSecretKeyChange(e.target.value)}
                  placeholder="sk_live_..."
                  autoComplete="new-password"
                  className="h-11 min-w-0 rounded-xl pr-11 font-mono text-xs"
                />
                <button
                  type="button"
                  aria-label={showSecret ? "Hide secret key" : "Show secret key"}
                  onClick={() => setShowSecret((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-muted-foreground hover:bg-muted"
                >
                  {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="rounded-xl bg-muted/40 p-3 text-[11px] text-muted-foreground">
              <span className="font-bold text-foreground">Mobile-safe:</span> long credentials stay inside their fields and never expand the page width.
            </div>

            <Button disabled={connecting} className="h-11 w-full rounded-2xl font-bold gap-2" onClick={connect}>
              {connecting ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Connecting securely…</>
              ) : (
                <><ShieldCheck className="h-4 w-4" /> Connect Paystack</>
              )}
            </Button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 ring-8 ring-emerald-500/5">
              <CheckCircle2 className="h-10 w-10 animate-[pulse_1.4s_ease-in-out_1]" />
            </div>
            <div>
              <h3 className="text-xl font-black">Paystack Connected ✓</h3>
              <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                Your Paystack connection details are ready for digital-product payments.
              </p>
            </div>

            <div className="mx-auto w-full max-w-md rounded-2xl border bg-muted/20 p-4 text-left">
              <div className="grid gap-3 text-xs">
                <div className="min-w-0">
                  <p className="font-bold text-muted-foreground">Public Key</p>
                  <p className="mt-1 max-w-full overflow-hidden text-ellipsis whitespace-nowrap rounded-lg bg-muted px-3 py-2 font-mono" title={publicKey}>
                    {publicKey || "Not set"}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-muted-foreground">Secret Key</p>
                  <p className="mt-1 max-w-full overflow-hidden text-ellipsis whitespace-nowrap rounded-lg bg-muted px-3 py-2 font-mono">
                    ••••••••••••••••••••
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button variant="outline" className="h-11 flex-1 rounded-2xl" onClick={() => setStep(2)}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Edit Connection
              </Button>
              <Button className="h-11 flex-1 rounded-2xl font-bold" onClick={() => toast.success("You can now sell digital products with Paystack.")}>
                Start Selling <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
