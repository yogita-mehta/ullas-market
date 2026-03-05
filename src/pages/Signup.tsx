import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ShoppingBag, Mail, Lock, User, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" className="mr-2">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

const Signup = () => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleGoogleSignup = async () => {
    setGoogleLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) {
      toast({ variant: "destructive", title: "Google signup failed", description: error.message });
      setGoogleLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    });

    if (error) {
      // If the error is about sending confirmation email, the account was still created.
      // Try to sign in directly.
      if (error.message.toLowerCase().includes("sending confirmation") ||
        error.message.toLowerCase().includes("confirmation email")) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (!signInError) {
          toast({
            title: "Account created! 🎉",
            description: "Welcome to Ullas!",
          });
          navigate("/");
        } else {
          toast({
            variant: "destructive",
            title: "Account created but sign-in failed",
            description: "Your account was created. Please try logging in.",
          });
          navigate("/login");
        }
      } else if (error.message.toLowerCase().includes("rate limit")) {
        toast({
          variant: "destructive",
          title: "Too many attempts",
          description: "Please wait a few minutes before trying again, or try logging in if you already have an account.",
        });
      } else {
        toast({ variant: "destructive", title: "Signup failed", description: error.message });
      }
    } else if (data?.user?.identities?.length === 0) {
      // Account already exists (Supabase returns empty identities)
      toast({
        variant: "destructive",
        title: "Account already exists",
        description: "An account with this email already exists. Please sign in instead.",
      });
    } else {
      // Signup succeeded — try auto sign-in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (!signInError) {
        toast({
          title: "Account created! 🎉",
          description: "Welcome to Ullas!",
        });
        navigate("/");
      } else {
        toast({
          title: "Account created! 🎉",
          description: "Please log in with your credentials.",
        });
        navigate("/login");
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-warm-gradient p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-4">
            <ShoppingBag className="w-8 h-8 text-primary" />
            <span className="font-display text-2xl font-bold text-foreground">Ullas</span>
          </Link>
          <p className="text-muted-foreground font-body text-sm">Join the movement</p>
        </div>

        <Card className="shadow-elevated">
          <CardHeader className="text-center">
            <CardTitle className="font-display text-xl">Create Account</CardTitle>
            <CardDescription className="font-body">
              Start your journey as a buyer or seller
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="w-full font-body"
              onClick={handleGoogleSignup}
              disabled={googleLoading}
            >
              <GoogleIcon />
              {googleLoading ? "Redirecting..." : "Continue with Google"}
            </Button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground font-body">or sign up with email</span>
              </div>
            </div>

            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="font-body">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="name"
                    placeholder="Your full name"
                    className="pl-10"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="font-body">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    className="pl-10"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="font-body">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Min 6 characters"
                    className="pl-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
              </div>

              <Button variant="hero" size="lg" className="w-full" disabled={loading}>
                {loading ? "Creating account..." : "Create Account"}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground font-body">
              Already have an account?{" "}
              <Link to="/login" className="text-primary hover:underline font-semibold">
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>

        <div className="text-center mt-6">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground font-body inline-flex items-center gap-1">
            <ArrowLeft className="w-3 h-3" /> Back to home
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default Signup;
