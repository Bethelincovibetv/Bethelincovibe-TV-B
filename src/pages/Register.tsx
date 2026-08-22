import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const { signUp, signIn } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [refCode, setRefCode] = useState("");

  useEffect(() => {
    const fromUrl = params.get("ref");
    const stored = localStorage.getItem("referral_code");
    const code = (fromUrl || stored || "").trim().toLowerCase();
    if (fromUrl) localStorage.setItem("referral_code", fromUrl);
    if (code) setRefCode(code);
  }, [params]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error: signUpError } = await signUp(email, password, displayName, refCode || undefined);
    if (signUpError) {
      setLoading(false);
      toast.error(signUpError.message);
      return;
    }
    // Auto-login immediately after signup (auto-confirm enabled)
    const { error: signInError } = await signIn(email, password);
    setLoading(false);
    localStorage.removeItem("referral_code");
    if (signInError) {
      toast.success("Account created! Please sign in.");
      navigate("/login");
    } else {
      toast.success("Welcome to Bethelincovibe TV!");
      navigate("/");
    }
  };

  return (
    <div className="container mx-auto px-4 py-16 flex justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <img src="/logo.png" alt="Bethelincovibe TV" className="h-12 w-12 mx-auto mb-2 rounded-lg" />
          <CardTitle>Create Account</CardTitle>
          <CardDescription>Join Bethelincovibe TV community</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Display Name</Label>
              <Input id="name" required value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" />
              <p className="text-[11px] text-muted-foreground">Choose any password 6+ characters. We don't enforce complexity rules.</p>
            </div>
            {refCode && (
              <div className="rounded-md bg-primary/10 px-3 py-2 text-xs text-primary">
                Invited by code: <strong>{refCode}</strong> — you and your inviter both benefit.
              </div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>{loading ? "Creating..." : "Create Account"}</Button>
          </form>
          <p className="text-sm text-center mt-4 text-muted-foreground">
            Already have an account? <Link to="/login" className="text-primary hover:underline">Sign In</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
