import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LogIn, User, Mail, Lock } from "lucide-react";
import { PageShell } from "@/components/layout/Page";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface LoginPageProps {
  onLogin: (user: any) => void;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: ""
  });
  const [error, setError] = useState("");
  const { toast } = useToast();
  const { login, register, isLoginLoading, isRegisterLoading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  // Redirect to data page if user is authenticated (to continue file upload flow)
  useEffect(() => {
    if (isAuthenticated) {
      setLocation("/data");
    }
  }, [isAuthenticated, setLocation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      if (isLogin) {
        const userData = await login({
          email: formData.email,
          password: formData.password
        });
        
        toast({
          title: "Welcome back!",
          description: `Hello, ${userData.firstName || userData.email}!`
        });
      } else {
        const userData = await register({
          email: formData.email,
          password: formData.password,
          firstName: formData.firstName,
          lastName: formData.lastName
        });
        
        toast({
          title: "Account created successfully!",
          description: `Welcome to Mono-AI, ${userData.firstName}!`
        });
      }
      
      // The useEffect hook will automatically redirect after authentication
    } catch (error) {
      setError(error instanceof Error ? error.message : "Authentication failed");
    }
  };

  return (
    <PageShell padding="lg" width="full" className="min-h-screen bg-surface">
      <div className="mx-auto flex w-full max-w-xl flex-1 items-center justify-center">
        <Card className="w-full border border-border/60 shadow-lg shadow-primary/5">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <LogIn className="h-6 w-6" />
            </div>
            <CardTitle className="text-2xl font-semibold text-text-primary">
              {isLogin ? "Welcome to Mono-AI" : "Join Mono-AI"}
            </CardTitle>
            <p className="text-sm text-text-muted">
              {isLogin
                ? "Sign in to access your AI analytics platform"
                : "Create your account to get started"}
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First name</Label>
                    <div className="relative">
                      <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-subtle" />
                      <Input
                        id="firstName"
                        type="text"
                        placeholder="John"
                        value={formData.firstName}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, firstName: e.target.value }))
                        }
                        className="pl-10"
                        required={!isLogin}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last name</Label>
                    <div className="relative">
                      <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-subtle" />
                      <Input
                        id="lastName"
                        type="text"
                        placeholder="Smith"
                        value={formData.lastName}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, lastName: e.target.value }))
                        }
                        className="pl-10"
                        required={!isLogin}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-subtle" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, email: e.target.value }))
                    }
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-subtle" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, password: e.target.value }))
                    }
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={isLogin ? isLoginLoading : isRegisterLoading}
              >
                {isLogin
                  ? isLoginLoading
                    ? "Please wait..."
                    : "Sign in"
                  : isRegisterLoading
                    ? "Please wait..."
                    : "Create account"}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm font-medium text-primary hover:text-primary/80"
              >
                {isLogin
                  ? "Don't have an account? Sign up"
                  : "Already have an account? Sign in"}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
