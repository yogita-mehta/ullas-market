import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ShoppingBag, Lock, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Listen for Supabase auth events — PASSWORD_RECOVERY fires when
    // the user opens the reset link (works with both hash and PKCE flows)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
      }
    });

    // Also check if there's already an active session (user may have opened the link
    // and the event already fired before this component mounted)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setReady(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast({ variant: "destructive", title: "Password too short", description: "Password must be at least 6 characters." });
      return;
    }

    if (password !== confirmPassword) {
      toast({ variant: "destructive", title: "Passwords don't match", description: "Please make sure both passwords match." });
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      toast({ title: "Password updated! ✓", description: "You can now sign in with your new password." });
      navigate("/login");
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
          <ShoppingBag className="w-8 h-8 text-primary mx-auto mb-2" />
          <span className="font-display text-2xl font-bold text-foreground">Ullas</span>
        </div>

        <Card className="shadow-elevated">
          <CardHeader className="text-center">
            <CardTitle className="font-display text-xl">Set New Password</CardTitle>
            <CardDescription className="font-body">
              {ready ? "Enter your new password below" : "Verifying your reset link..."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!ready ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <form onSubmit={handleReset} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password" className="font-body">New Password</Label>
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
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="font-body">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="Re-enter password"
                      className="pl-10"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                  </div>
                </div>
                <Button variant="hero" size="lg" className="w-full" disabled={loading}>
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Updating...</> : "Update Password"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default ResetPassword;
