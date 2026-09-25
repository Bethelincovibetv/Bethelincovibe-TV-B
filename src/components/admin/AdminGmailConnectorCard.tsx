import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Mail,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  LogOut,
  Send,
  ShieldCheck,
  Zap,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import {
  getAdminGmailSession,
  signInWithGoogleGmail,
  disconnectAdminGmail,
  sendEmailViaGmailApi,
  GmailAccountProfile,
} from "@/lib/gmail";

interface AdminGmailConnectorCardProps {
  onSessionChange?: (session: GmailAccountProfile | null) => void;
  className?: string;
}

export default function AdminGmailConnectorCard({
  onSessionChange,
  className,
}: AdminGmailConnectorCardProps) {
  const [session, setSession] = useState<GmailAccountProfile | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    const active = getAdminGmailSession();
    setSession(active);
    if (onSessionChange) onSessionChange(active);
  }, []);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const newSession = await signInWithGoogleGmail();
      setSession(newSession);
      if (onSessionChange) onSessionChange(newSession);
      toast.success(`Connected Gmail account: ${newSession.email}`, {
        icon: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
      });
    } catch (err: any) {
      console.error("Gmail connect error:", err);
      toast.error(err.message || "Failed to sign in with Google Gmail");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnectAdminGmail();
      setSession(null);
      if (onSessionChange) onSessionChange(null);
      toast.info("Disconnected Gmail account.");
    } catch {
      setSession(null);
      if (onSessionChange) onSessionChange(null);
    }
  };

  const handleSendTestToSelf = async () => {
    if (!session || !session.accessToken) {
      return toast.error("Please connect your Gmail account first.");
    }

    setIsTesting(true);
    try {
      const testHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 540px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px;">
          <h2 style="color: #2563eb; margin-top: 0;">⚡ Bethelincovibe TV Gmail Gateway Verified</h2>
          <p style="color: #334155; font-size: 14px; line-height: 1.6;">
            This test confirmation confirms that your Google Gmail OAuth 2.0 connection is active and fully functional for sending email broadcasts, newsletters, and campaign sequences.
          </p>
          <div style="background: #f1f5f9; padding: 12px 16px; border-radius: 8px; margin: 16px 0; font-size: 13px; color: #475569;">
            <strong>Sender:</strong> ${session.name || "Administrator"} (${session.email})<br/>
            <strong>Timestamp:</strong> ${new Date().toLocaleString()}<br/>
            <strong>API Gateway:</strong> Google Gmail REST API v1
          </div>
          <p style="color: #64748b; font-size: 12px; margin-bottom: 0;">
            Bethelincovibe TV Admin Broadcast Engine
          </p>
        </div>
      `;

      await sendEmailViaGmailApi({
        to: session.email,
        subject: `[Verified] Bethelincovibe TV Gmail Gateway Test (${new Date().toLocaleTimeString()})`,
        htmlBody: testHtml,
        fromName: session.name || "Bethelincovibe TV",
        fromEmail: session.email,
        accessToken: session.accessToken,
      });

      toast.success(`Test email delivered to ${session.email}! Please check your inbox.`, {
        icon: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
      });
    } catch (err: any) {
      toast.error("Gmail test send failed: " + err.message);
    } finally {
      setIsTesting(false);
    }
  };

  const isConnected = !!session?.accessToken;

  return (
    <Card className={`rounded-3xl border border-border/80 shadow-md overflow-hidden bg-gradient-to-br from-card via-card to-blue-500/5 ${className || ""}`}>
      <CardHeader className="p-4 sm:p-5 border-b bg-muted/20">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-red-500 via-amber-500 to-blue-600 p-0.5 shadow-sm">
              <div className="h-full w-full bg-card rounded-[14px] flex items-center justify-center">
                <Mail className="h-5 w-5 text-red-500" />
              </div>
            </div>
            <div>
              <CardTitle className="text-base font-black flex items-center gap-2">
                <span>Google Gmail Admin Sender</span>
                {isConnected ? (
                  <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] font-extrabold flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Connected & Ready
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] text-muted-foreground">
                    Not Connected
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="text-xs">
                Sign in with your Google account to send direct email broadcasts & campaigns from your authenticated address.
              </CardDescription>
            </div>
          </div>

          <div>
            {!isConnected ? (
              <Button
                onClick={handleConnect}
                disabled={isConnecting}
                className="rounded-2xl font-bold bg-blue-600 hover:bg-blue-700 text-white gap-2 shadow-sm text-xs h-9 px-4"
              >
                {isConnecting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <svg className="h-4 w-4" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                )}
                {isConnecting ? "Authenticating..." : "Connect Admin Gmail"}
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSendTestToSelf}
                  disabled={isTesting}
                  className="rounded-xl text-xs h-8 gap-1 font-semibold"
                >
                  {isTesting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5 text-blue-600" />}
                  Send Test Email
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDisconnect}
                  className="rounded-xl text-xs h-8 text-destructive hover:bg-destructive/10"
                >
                  <LogOut className="h-3.5 w-3.5 mr-1" /> Disconnect
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-5">
        {isConnected && session ? (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-muted/40 p-4 rounded-2xl border border-border/60">
            <div className="flex items-center gap-3">
              {session.picture ? (
                <img
                  src={session.picture}
                  alt={session.name}
                  className="h-11 w-11 rounded-xl ring-2 ring-primary/20 object-cover"
                />
              ) : (
                <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary font-black flex items-center justify-center text-base">
                  {session.name ? session.name.charAt(0).toUpperCase() : "A"}
                </div>
              )}
              <div>
                <p className="text-sm font-black text-foreground flex items-center gap-1.5">
                  {session.name || "Connected Admin Account"}
                  <ShieldCheck className="h-4 w-4 text-blue-600" />
                </p>
                <p className="text-xs text-muted-foreground font-mono">{session.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs text-muted-foreground border-t sm:border-t-0 pt-2 sm:pt-0 w-full sm:w-auto justify-between sm:justify-end">
              <div>
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">Gateway</span>
                <span className="font-semibold text-foreground">Official Gmail v1 API</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">Daily Quota</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">500 emails / day</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
              <span>
                Connect <strong>bethelincovibetv@gmail.com</strong> or any verified Google account to send emails with optimal inbox deliverability.
              </span>
            </div>
            <span className="text-[11px] text-muted-foreground/80 shrink-0">
              Zero configuration required &bull; OAuth 2.0 Secured
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
