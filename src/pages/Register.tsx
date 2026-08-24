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
  const [username, setUsername] = useState("");
  const [isUsernameCustom, setIsUsernameCustom] = useState(false);
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

  const handleNameChange = (val: string) => {
    setDisplayName(val);
    if (!isUsernameCustom) {
      const suggested = val.toLowerCase().replace(/[^a-z0-9]/g, "");
      setUsername(suggested);
    }
  };

  const handleUsernameChange = (val: string) => {
    setIsUsernameCustom(true);
    setUsername(val.toLowerCase().replace(/[^a-z0-9_-]/g, ""));
  };

  const cleanUsername = username.trim() || displayName.toLowerCase().replace(/[^a-z0-9]/g, "") || "username";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const finalUsername = username.trim() || displayName.toLowerCase().replace(/[^a-z0-9]/g, "");
    const { error: signUpError } = await signUp(email, password, displayName, finalUsername, refCode || undefined);
    if (signUpError) {
      setLoading(false);
      toast.error(signUpError.message);
      return;
    }
    // Auto-login immediately after signup
    const { error: signInError } = await signIn(email, password);
    setLoading(false);
    localStorage.removeItem("referral_code");
    if (signInError) {
      toast.success("Account created! Please sign in.");
      navigate("/login");
    } else {
      toast.success("Account created! Let's set up your profile & business.");
      navigate("/dashboard?wizard=1");
    }
  };

  return (
    <div className="container mx-auto px-4 py-12 sm:py-16 flex justify-center">
      <Card className="w-full max-w-md shadow-xl border-border/80">
        <CardHeader className="text-center">
          <img src="/logo.png" alt="Bethelincovibe TV" className="h-12 w-12 mx-auto mb-2 rounded-xl shadow-md" />
          <CardTitle className="text-2xl font-bold">Create Account</CardTitle>
          <CardDescription>Join Bethelincovibe TV community & launch your public profile</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="font-semibold text-xs">Display Name / Business Name</Label>
              <Input
                id="name"
                required
                value={displayName}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Jane Doe or Apex Digital Solutions"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="username" className="font-semibold text-xs flex items-center justify-between">
                <span>Public Profile Handle / Username</span>
                <span className="text-[10px] text-primary font-normal">Active immediately</span>
              </Label>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-muted-foreground font-semibold text-sm">@</span>
                <Input
                  id="username"
                  required
                  value={username}
                  onChange={(e) => handleUsernameChange(e.target.value)}
                  placeholder="janedoe"
                  className="pl-8 text-sm"
                  maxLength={40}
                />
              </div>
              <p className="text-[11px] text-muted-foreground bg-secondary/60 p-2 rounded-lg border border-border/50 flex items-center gap-1.5">
                <span>Your public profile:</span>
                <code className="text-primary font-bold">/u/{cleanUsername}</code>
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="font-semibold text-xs">Email Address</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="font-semibold text-xs">Password</Label>
              <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" />
              <p className="text-[11px] text-muted-foreground">Choose any secure password with 6+ characters.</p>
            </div>

            {refCode && (
              <div className="rounded-lg bg-primary/10 px-3 py-2 text-xs text-primary font-medium">
                Invited by referral code: <strong>{refCode}</strong>
              </div>
            )}

            <Button type="submit" className="w-full text-base py-5 font-bold shadow-md" disabled={loading}>
              {loading ? "Creating account..." : "Register & Set Up Profile"}
            </Button>
          </form>
          <p className="text-sm text-center mt-5 text-muted-foreground">
            Already have an account? <Link to="/login" className="text-primary font-semibold hover:underline">Sign In</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
