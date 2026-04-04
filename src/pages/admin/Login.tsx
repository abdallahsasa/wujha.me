import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import wujhaLogo from "@/assets/wujha-logo.png";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { signIn, session, adminUser, loading } = useAdminAuth();
  const navigate = useNavigate();

  // Redirect via useEffect when already authenticated
  useEffect(() => {
    if (!loading && session && adminUser) {
      navigate("/admin/dashboard", { replace: true });
    }
  }, [loading, session, adminUser, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const { error } = await signIn(email, password);
    if (error) {
      setError(error);
      setSubmitting(false);
    }
    // Auth state change listener will handle the redirect via useEffect
  };

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
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
          <h1 className="text-3xl font-bold tracking-tight">
            Wujha <span className="font-normal opacity-70">وجهة</span>
          </h1>
          <p className="text-sm text-gray-400">Sign in to the admin panel</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-300">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="admin@wujha.com"
                className="bg-gray-800 border-white/10 text-white placeholder:text-gray-500 focus-visible:ring-white/30"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-300">Password</Label>
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
            {error && (
              <p className="text-sm text-red-400">{error}</p>
            )}
            <Button
              type="submit"
              disabled={submitting}
              className="w-full bg-white text-gray-950 hover:bg-gray-200 font-medium"
            >
              {submitting ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
