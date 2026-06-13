import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { LogIn, Mountain } from "lucide-react";
import { api, setStoredUser } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth } from "@/components/site-shell";
import { toast } from "sonner";

type Me = { id: number; name: string; email: string; isAdmin: boolean };

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [params] = useSearchParams();
  const next = params.get("next") || "/account";
  const navigate = useNavigate();
  const { refresh } = useAuth();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api<{ user: Me }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setStoredUser(res.user);
      await refresh();
      toast.success(`Welcome back, ${res.user.name.split(" ")[0]}.`);
      navigate(res.user.isAdmin ? "/admin" : next);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-200px)] max-w-md flex-col justify-center px-4 py-12">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-900 text-amber-300">
          <Mountain className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-stone-900">Welcome back</h1>
        <p className="text-sm text-stone-600">Sign in to book hikes and track your adventures.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>Use your Badr Adventures account.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1"
              />
            </div>
            <Button type="submit" disabled={submitting} className="w-full bg-emerald-900 hover:bg-emerald-800">
              <LogIn className="mr-2 h-4 w-4" />
              {submitting ? "Signing in…" : "Sign in"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-stone-600">
            New here?{" "}
            <Link to={`/sign-up?next=${encodeURIComponent(next)}`} className="text-emerald-700 hover:underline">
              Create a free account
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
