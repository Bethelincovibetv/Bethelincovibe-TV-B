import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import SEO from "@/components/SEO";
import { PAGE_OG_IMAGES, SITE_NAME } from "@/lib/seo";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Welcome back!");
      // Check if user is admin and redirect accordingly
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .maybeSingle();
        if (roleData) {
          navigate("/admin");
          return;
        }
      }
      navigate("/");
    }
  };

  return (
    <div className="container mx-auto px-4 py-16 flex justify-center">
      <SEO
        title={`Sign In — Access Your Entrepreneur Dashboard | ${SITE_NAME}`}
        description="Sign in to your Bethelincovibe TV account. Manage your verified business directory listings, marketplace products, wallet, and sales pages."
        url="/login"
        type="website"
        image={PAGE_OG_IMAGES.home()}
      />
      <Card className="w-full max-w-md shadow-xl border-border/80 rounded-3xl">
        <CardHeader className="text-center pb-4">
          <img src="/logo.png" alt="Bethelincovibe TV" className="h-12 w-12 mx-auto mb-2 rounded-xl shadow-md" />
          <CardTitle className="text-2xl font-black">Welcome Back</CardTitle>
          <CardDescription>Sign in to your Bethelincovibe account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-bold">Email Address</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="rounded-xl h-11" />
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <Label htmlFor="password" className="text-xs font-bold">Password</Label>
                <Link to="/forgot-password" className="text-xs text-primary font-semibold hover:underline">Forgot password?</Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="rounded-xl h-11 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full h-11 rounded-2xl font-black shadow-md" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
          <p className="text-sm text-center mt-5 text-muted-foreground">
            Don't have an account? <Link to="/register" className="text-primary font-bold hover:underline">Create Account</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
