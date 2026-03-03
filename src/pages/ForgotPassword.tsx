import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ShoppingBag, Mail, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      setSent(true);
      toast({ title: "Check your email", description: "Password reset link sent." });
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
        </div>

        <Card className="shadow-elevated">
          <CardHeader className="text-center">
            <CardTitle className="font-display text-xl">Reset Password</CardTitle>
            <CardDescription className="font-body">
              {sent ? "Check your inbox for the reset link" : "Enter your email to receive a reset link"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!sent ? (
              <form onSubmit={handleReset} className="space-y-4">
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
                <Button variant="hero" size="lg" className="w-full" disabled={loading}>
                  {loading ? "Sending..." : "Send Reset Link"}
                </Button>
              </form>
            ) : (
              <div className="text-center py-4">
                <p className="text-muted-foreground font-body text-sm mb-4">
                  We've sent a password reset link to <strong>{email}</strong>
                </p>
                <Button variant="outline" onClick={() => setSent(false)}>
                  Try another email
                </Button>
              </div>
            )}

            <p className="mt-6 text-center text-sm text-muted-foreground font-body">
              <Link to="/login" className="text-primary hover:underline inline-flex items-center gap-1">
                <ArrowLeft className="w-3 h-3" /> Back to login
              </Link>
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default ForgotPassword;
