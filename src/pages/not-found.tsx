import { Link } from "react-router-dom";
import { Mountain } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFoundPage() {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-200px)] max-w-xl flex-col items-center justify-center px-4 py-20 text-center">
      <div className="inline-flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-900 text-amber-300">
        <Mountain className="h-7 w-7" />
      </div>
      <h1 className="mt-4 text-3xl font-bold text-stone-900">This trail doesn't exist</h1>
      <p className="mt-2 text-stone-600">The page you're looking for is somewhere off the map.</p>
      <Button asChild className="mt-6 bg-emerald-900 hover:bg-emerald-800">
        <Link to="/">Back to base camp</Link>
      </Button>
    </main>
  );
}
