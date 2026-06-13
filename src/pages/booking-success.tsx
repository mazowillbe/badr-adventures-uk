import { useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, Compass, Mountain, ShieldCheck } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

export default function BookingSuccessPage() {
  const [params] = useSearchParams();
  const bookingId = params.get("booking_id") || params.get("bookingId") || "";
  const sessionId = params.get("session_id") || "";

  useEffect(() => {
    if (!bookingId) return;
    api(`/api/bookings/${bookingId}/confirm`, { method: "GET" }).catch((err) => {
      // Soft-fail; the webhook will reconcile the booking when Stripe pings us.
      toast.error(err instanceof Error ? err.message : "Confirmation pending");
    });
  }, [bookingId]);

  return (
    <main className="mx-auto flex min-h-[calc(100vh-200px)] max-w-2xl flex-col items-center justify-center px-4 py-16 text-center">
      <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-800">
        <CheckCircle2 className="h-8 w-8" />
      </div>
      <h1 className="mt-6 text-3xl font-bold text-stone-900 sm:text-4xl">Booking confirmed</h1>
      <p className="mt-3 text-stone-600">
        Thanks for joining us. We've sent the details to your email and added the hike to your
        account. Pack your boots — we'll see you on the trail.
      </p>
      <Card className="mt-8 w-full">
        <CardContent className="grid gap-3 p-6 text-left text-sm text-stone-700 sm:grid-cols-2">
          <div className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 h-4 w-4 text-emerald-700" /> Payment is held securely by Stripe.
          </div>
          <div className="flex items-start gap-2">
            <Compass className="mt-0.5 h-4 w-4 text-emerald-700" /> We'll email a kit list 48 hours before.
          </div>
          <div className="flex items-start gap-2">
            <Mountain className="mt-0.5 h-4 w-4 text-emerald-700" /> Pace is set to the slowest member.
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-700" /> No additional charges.
          </div>
        </CardContent>
      </Card>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button asChild className="bg-emerald-900 hover:bg-emerald-800">
          <Link to="/account">View my bookings</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/hikes">Browse more hikes</Link>
        </Button>
      </div>
      {sessionId && <p className="mt-6 text-xs text-stone-400">Reference: {sessionId}</p>}
    </main>
  );
}
