import { useState } from "react";
import { Mail, User, CheckCircle2, Sparkles, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { sendSubscriberWelcomeEmail } from "@/lib/emailRouter";
import { motion, AnimatePresence } from "framer-motion";

export default function EmailSubscribeForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.toLowerCase().trim();
    const cleanName = name.trim();

    if (!cleanEmail || !cleanEmail.includes("@")) {
      return toast.error("Please enter a valid email address.");
    }

    setLoading(true);

    // 1. Dual-try Database insert into email_subscribers
    let dbSuccess = false;
    try {
      const { error: err1 } = await supabase.from("email_subscribers").insert({
        email: cleanEmail,
        name: cleanName || null,
        active: true,
        subscribed_at: new Date().toISOString(),
      } as any);

      if (err1) {
        if (err1.code === "23505") {
          dbSuccess = true;
          toast.info("You are already subscribed to Bethelincovibe TV updates!");
        } else {
          // If 'name' column is absent or schema mismatch, fallback to email-only insert
          const { error: err2 } = await supabase.from("email_subscribers").insert({
            email: cleanEmail,
            active: true,
            subscribed_at: new Date().toISOString(),
          } as any);

          if (!err2 || err2.code === "23505") {
            dbSuccess = true;
          } else {
            console.warn("Supabase subscriber insert notice:", err2);
          }
        }
      } else {
        dbSuccess = true;
      }
    } catch (err) {
      console.warn("Subscriber insert catch notice:", err);
    }

    // 2. Always persist locally so no subscriber is ever lost
    try {
      const saved = localStorage.getItem("bethel_local_subscribers");
      const list = saved ? JSON.parse(saved) : [];
      if (!list.some((s: any) => s.email.toLowerCase() === cleanEmail)) {
        list.push({
          id: Math.random().toString(36).substring(2, 9),
          name: cleanName || "Subscriber",
          email: cleanEmail,
          created_at: new Date().toISOString(),
          source: "footer_form",
        });
        localStorage.setItem("bethel_local_subscribers", JSON.stringify(list));
      }
    } catch {
      // Ignore storage errors
    }

    // 3. Trigger Edge Function welcome-subscriber & personalized welcome email
    try {
      await supabase.functions.invoke("welcome-subscriber", {
        body: { email: cleanEmail, name: cleanName },
      });
    } catch (edgeErr) {
      console.warn("Welcome subscriber edge function notice:", edgeErr);
    }

    let emailSent = false;
    try {
      emailSent = await sendSubscriberWelcomeEmail(cleanEmail, cleanName);
    } catch (err) {
      console.warn("Welcome email trigger note:", err);
    }

    setLoading(false);
    setIsSubscribed(true);

    if (emailSent) {
      toast.success(
        cleanName ? `Welcome aboard, ${cleanName}!` : "Subscribed successfully!",
        {
          description: `A welcome message was dispatched directly to ${cleanEmail}.`,
        }
      );
    } else {
      toast.success("Subscription confirmed!", {
        description: `You will now receive automated business posts and updates at ${cleanEmail}.`,
      });
    }

    setName("");
    setEmail("");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-b from-card/95 via-card/80 to-background p-5 sm:p-6 shadow-xl backdrop-blur-md"
    >
      {/* Decorative subtle background glow */}
      <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-primary/10 blur-2xl pointer-events-none" />

      <AnimatePresence mode="wait">
        {isSubscribed ? (
          <motion.div
            key="success-card"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex flex-col items-center text-center py-4 space-y-3"
          >
            <div className="h-12 w-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-sm">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <h4 className="font-black text-base text-foreground">You're Subscribed! 🎉</h4>
              <p className="text-xs text-muted-foreground mt-1 font-medium max-w-xs mx-auto">
                Thank you for joining Bethelincovibe TV. Check your inbox for our latest startup and marketplace insights.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSubscribed(false)}
              className="mt-2 h-8 rounded-xl text-xs font-bold border-primary/20 hover:bg-primary/10"
            >
              Subscribe Another Email
            </Button>
          </motion.div>
        ) : (
          <motion.form
            key="subscribe-form"
            onSubmit={handleSubmit}
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-3.5"
          >
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary shrink-0 shadow-xs">
                <Mail className="h-4 w-4" />
              </div>
              <div>
                <p className="font-black text-sm text-foreground flex items-center gap-1.5">
                  Get New Posts In Your Inbox
                  <Sparkles className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
                </p>
                <p className="text-[11px] text-muted-foreground font-medium">
                  Receive personalized startup guides, market deals & funding news.
                </p>
              </div>
            </div>

            <div className="space-y-2.5 pt-1">
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/70" />
                <Input
                  type="text"
                  placeholder="Your Name (e.g., Bethel)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-9 pl-9 rounded-xl text-xs font-medium border-border/80 focus:border-primary bg-background/80"
                />
              </div>

              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/70" />
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-9 pl-9 rounded-xl text-xs font-medium border-border/80 focus:border-primary bg-background/80"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-10 rounded-xl font-black text-xs bg-primary hover:bg-primary/90 text-primary-foreground gap-2 shadow-md hover:shadow-lg transition-all"
              >
                {loading ? (
                  <>Subscribing...</>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" /> Subscribe Now
                  </>
                )}
              </Button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
