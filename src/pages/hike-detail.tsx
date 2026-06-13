import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock,
  MapPin,
  Mountain,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
  Waves,
} from "lucide-react";
import { api, formatGbp, formatDate } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/components/site-shell";
import { toast } from "sonner";

type Hike = {
  id: string;
  title: string;
  location: string;
  region: string;
  date: string;
  duration: string;
  difficulty: "Easy" | "Moderate" | "Challenging" | "Strenuous";
  summary: string;
  description: string;
  image: string;
  hero: string;
  pricePence: number;
  spotsLeft: number;
  spotsTotal: number;
  tags: string[];
  guide: string;
  heroBullets: string[];
};

export default function HikeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [hike, setHike] = useState<Hike | null>(null);
  const [loading, setLoading] = useState(true);
  const [partySize, setPartySize] = useState(1);
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    let mounted = true;
    setLoading(true);
    api<{ hike: Hike }>(`/api/hikes/${id}`)
      .then((res) => mounted && setHike(res.hike))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load hike"))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [id]);

  async function handleBook() {
    if (!hike) return;
    if (!user) {
      navigate(`/sign-in?next=/hikes/${hike.id}`);
      return;
    }
    if (partySize < 1) {
      toast.error("Party size must be at least 1.");
      return;
    }
    if (partySize > hike.spotsLeft) {
      toast.error(`Only ${hike.spotsLeft} spots left.`);
      return;
    }
    setSubmitting(true);
    try {
      const res = await api<{ bookingId: string; checkoutUrl?: string; free: boolean }>(
        "/api/bookings",
        {
          method: "POST",
          body: JSON.stringify({
            hikeId: hike.id,
            partySize,
            phone: phone || undefined,
            notes: notes || undefined,
          }),
        },
      );
      if (res.free) {
        toast.success("Booking confirmed. See you on the trail!");
        navigate(`/account?booked=${res.bookingId}`);
      } else if (res.checkoutUrl) {
        window.location.href = res.checkoutUrl;
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to book");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="h-96 animate-pulse rounded-2xl bg-stone-200" />
      </div>
    );
  }

  if (!hike) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="text-2xl font-semibold text-stone-900">Hike not found</h1>
        <p className="mt-2 text-stone-600">It might have been removed or the link is wrong.</p>
        <Button asChild className="mt-6">
          <Link to="/hikes">Back to hikes</Link>
        </Button>
      </div>
    );
  }

  const total = hike.pricePence * partySize;

  return (
    <div>
      <section className="relative h-[420px] overflow-hidden">
        <img src={hike.hero} alt={hike.title} className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/40 to-transparent" />
        <div className="absolute inset-x-0 bottom-0">
          <div className="mx-auto max-w-6xl px-4 pb-8 text-white sm:px-6 lg:px-8">
            <Link
              to="/hikes"
              className="mb-3 inline-flex items-center text-sm text-stone-200 hover:text-white"
            >
              <ArrowLeft className="mr-1 h-4 w-4" /> Back to hikes
            </Link>
            <div className="flex flex-wrap gap-2">
              {hike.tags.map((tag) => (
                <Badge key={tag} className="bg-white/15 text-white">
                  {tag}
                </Badge>
              ))}
              <Badge className="bg-amber-400 text-stone-900">
                <Star className="mr-1 h-3 w-3 fill-current" /> {hike.difficulty}
              </Badge>
            </div>
            <h1 className="mt-2 text-3xl font-bold sm:text-4xl lg:text-5xl">{hike.title}</h1>
            <div className="mt-3 flex flex-wrap gap-5 text-sm text-stone-200">
              <span className="flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4" /> {formatDate(hike.date)}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" /> {hike.duration}
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4" /> {hike.location}
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4" /> {hike.spotsLeft} of {hike.spotsTotal} spots left
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1.4fr_1fr] lg:px-8">
        <div className="space-y-8">
          <Card>
            <CardContent className="space-y-4 p-6">
              <h2 className="text-xl font-semibold text-stone-900">About this hike</h2>
              <p className="text-stone-700">{hike.description}</p>
              <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                {hike.heroBullets.map((b) => (
                  <li key={b} className="flex items-start gap-2 text-sm text-stone-700">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-700" /> {b}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4 p-6">
              <h2 className="text-xl font-semibold text-stone-900">What to expect</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
                  <Mountain className="h-5 w-5 text-emerald-700" />
                  <div className="mt-2 font-medium">Trained guide</div>
                  <p className="text-sm text-stone-600">
                    Your hike is led by {hike.guide}, qualified in mountain leadership and first aid.
                  </p>
                </div>
                <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
                  <ShieldCheck className="h-5 w-5 text-emerald-700" />
                  <div className="mt-2 font-medium">Small groups</div>
                  <p className="text-sm text-stone-600">
                    We cap group sizes so everyone gets attention and nobody gets left behind.
                  </p>
                </div>
                <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
                  <Sparkles className="h-5 w-5 text-emerald-700" />
                  <div className="mt-2 font-medium">Inclusive by default</div>
                  <p className="text-sm text-stone-600">
                    Faith-friendly, family-friendly. We pace to the slowest member of the group.
                  </p>
                </div>
                <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
                  <Waves className="h-5 w-5 text-emerald-700" />
                  <div className="mt-2 font-medium">Halaal meal option</div>
                  <p className="text-sm text-stone-600">
                    Halaal, vegetarian, vegan and gluten-free options are all available.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <Card className="border-stone-200/80">
            <CardContent className="space-y-4 p-6">
              <div>
                <div className="text-sm text-stone-500">From</div>
                <div className="text-3xl font-bold text-stone-900">
                  {hike.pricePence === 0 ? "Free" : formatGbp(hike.pricePence)}
                  <span className="text-base font-normal text-stone-500"> / person</span>
                </div>
              </div>
              <Separator />
              <div className="space-y-3">
                <div>
                  <Label htmlFor="party">Party size</Label>
                  <Input
                    id="party"
                    type="number"
                    min={1}
                    max={hike.spotsLeft}
                    value={partySize}
                    onChange={(e) => setPartySize(Math.max(1, Number(e.target.value || 1)))}
                    className="mt-1"
                  />
                  <p className="mt-1 text-xs text-stone-500">
                    {hike.spotsLeft} of {hike.spotsTotal} spots available
                  </p>
                </div>
                <div>
                  <Label htmlFor="phone">Phone (optional)</Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+44 …"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="notes">Notes / dietary needs</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    placeholder="Halaal meals, accessibility, anything we should know…"
                    className="mt-1"
                  />
                </div>
              </div>
              <Separator />
              <div className="space-y-1 text-sm">
                <div className="flex justify-between text-stone-600">
                  <span>{formatGbp(hike.pricePence)} × {partySize}</span>
                  <span>{formatGbp(total)}</span>
                </div>
                <div className="flex justify-between text-base font-semibold text-stone-900">
                  <span>Total</span>
                  <span>{formatGbp(total)}</span>
                </div>
              </div>
              <Button
                onClick={handleBook}
                disabled={submitting || hike.spotsLeft === 0}
                className="w-full bg-emerald-900 hover:bg-emerald-800"
                size="lg"
              >
                {submitting
                  ? "Working…"
                  : hike.spotsLeft === 0
                    ? "Join waitlist"
                    : user
                      ? hike.pricePence === 0
                        ? "Confirm booking"
                        : "Continue to payment"
                      : "Sign in to book"}
              </Button>
              {!user && (
                <p className="text-center text-xs text-stone-500">
                  New here?{" "}
                  <Link to={`/sign-up?next=/hikes/${hike.id}`} className="text-emerald-700 hover:underline">
                    Create a free account
                  </Link>{" "}
                  — takes 30 seconds.
                </p>
              )}
            </CardContent>
          </Card>
        </aside>
      </section>
    </div>
  );
}
