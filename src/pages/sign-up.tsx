import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Mountain, UserPlus } from "lucide-react";
import { api, setStoredUser } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth } from "@/components/site-shell";
import { toast } from "sonner";

type Me = { id: number; name: string; email: string; isAdmin: boolean };

export default function SignUpPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [params] = useSearchParams();
  const next = params.get("next") || "/account";
  const navigate = useNavigate();
  const { refresh } = useAuth();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await api<{ user: Me }>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, email, password }),
      });
      setStoredUser(res.user);
      await refresh();
      toast.success("Account created. Time to find a hike.");
      navigate(next);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign up failed");
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
        <h1 className="text-2xl font-bold tracking-tight text-stone-900">Create your account</h1>
        <p className="text-sm text-stone-600">It takes 30 seconds. Free forever.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Sign up</CardTitle>
          <CardDescription>Track bookings, save hikes, get early access to new trips.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                required
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1"
              />
            </div>
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
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1"
              />
              <p className="mt-1 text-xs text-stone-500">At least 8 characters.</p>
            </div>
            <Button type="submit" disabled={submitting} className="w-full bg-emerald-900 hover:bg-emerald-800">
              <UserPlus className="mr-2 h-4 w-4" />
              {submitting ? "Creating account…" : "Create account"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-stone-600">
            Already have an account?{" "}
            <Link to={`/sign-in?next=${encodeURIComponent(next)}`} className="text-emerald-700 hover:underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
