import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import wujhaLogo from "@/assets/wujha-logo.png";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Supabase auto-detects the recovery token from the URL hash
    // and establishes a session. We listen for SIGNED_IN or PASSWORD_RECOVERY.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setSessionReady(true);
        setChecking(false);
      }
    });

    // Also check if there's already a session (e.g. page reload)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSessionReady(true);
      }
      setChecking(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }

    setSubmitting(true);
    const { error: updateErr } = await supabase.auth.updateUser({ password });
    if (updateErr) {
      setError(updateErr.message);
      setSubmitting(false);
      return;
    }

    setSuccess(true);
    // Sign out so they can log in fresh
    await supabase.auth.signOut();
    setTimeout(() => navigate("/admin/login", { replace: true }), 2000);
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
      </div>
    );
  }

  if (!sessionReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4" dir="ltr">
        <Card className="w-full max-w-md border-white/10 bg-gray-900 text-white">
          <CardContent className="py-12 text-center space-y-4">
            <p className="text-gray-400">Invalid or expired reset link.</p>
            <Button
              variant="outline"
              className="border-white/10 text-white hover:bg-white/10"
              onClick={() => navigate("/admin/login")}
            >
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4" dir="ltr">
      <Card className="w-full max-w-md border-white/10 bg-gray-900 text-white">
        <CardHeader className="text-center space-y-4 pb-2">
          <div className="flex justify-center">
            <img src={wujhaLogo} alt="Wujha" className="h-14 w-14 invert" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Set Your Password</h1>
          <p className="text-sm text-gray-400">Create a password for your CMS account</p>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="text-center py-6 space-y-2">
              <p className="text-green-400 font-medium">✅ Password set successfully!</p>
              <p className="text-gray-400 text-sm">Redirecting to login...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-300">New Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="bg-gray-800 border-white/10 text-white placeholder:text-gray-500 focus-visible:ring-white/30"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm" className="text-gray-300">Confirm Password</Label>
                <Input
                  id="confirm"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="bg-gray-800 border-white/10 text-white placeholder:text-gray-500 focus-visible:ring-white/30"
                />
              </div>
              {error && <p className="text-sm text-red-400">{error}</p>}
              <Button
                type="submit"
                disabled={submitting}
                className="w-full bg-white text-gray-950 hover:bg-gray-200 font-medium"
              >
                {submitting ? "Setting password..." : "Set Password"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;
