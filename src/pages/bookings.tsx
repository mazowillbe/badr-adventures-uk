import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock,
  Compass,
  MapPin,
  Mountain,
  Package,
  Receipt,
  Sparkles,
  Tent,
  Users,
  XCircle,
} from "lucide-react";
import { api, formatDate, formatGbp, clearStoredUser } from "@/lib/api";
import { useAuth } from "@/components/site-shell";
import { toast } from "sonner";

type Booking = {
  id: string;
  hikeId: string;
  hikeTitle: string;
  hikeDate: string;
  hikeLocation: string;
  partySize: number;
  totalPence: number;
  status: string;
  paymentStatus: string;
  createdAt: string;
  stripeSessionId: string | null;
};

type Reservation = {
  id: string;
  equipmentId: string;
  equipment: {
    name: string;
    type: string;
    image: string;
    location: string;
  };
  startDate: string;
  endDate: string;
  nights: number;
  partySize: number;
  totalGbp: number;
  status: string;
  paymentStatus: string;
  createdAt: number;
};

function statusTone(status: string, paymentStatus: string) {
  if (status === "cancelled") return { label: "Cancelled", tone: "rust" as const };
  if (status === "confirmed" && paymentStatus === "paid")
    return { label: "Confirmed", tone: "moss" as const };
  if (status === "pending" || paymentStatus === "unpaid")
    return { label: "Awaiting payment", tone: "ochre" as const };
  return { label: status, tone: "mist" as const };
}

const toneClasses: Record<string, string> = {
  moss: "bg-moss/10 text-moss-deep border border-moss/30",
  ochre: "bg-ochre/15 text-bark border border-ochre/40",
  rust: "bg-terracotta/15 text-terracotta border border-terracotta/40",
  mist: "bg-mist/40 text-ink-2 border border-ink/15",
};

function formatBookingDate(d: string) {
  try {
    return new Date(d).toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return d;
  }
}

function daysUntil(d: string) {
  const ms = new Date(d).getTime() - Date.now();
  const days = Math.round(ms / (1000 * 60 * 60 * 24));
  if (days < 0) return { label: "Past", days };
  if (days === 0) return { label: "Today", days: 0 };
  if (days === 1) return { label: "Tomorrow", days: 1 };
  if (days < 7) return { label: `In ${days} days`, days };
  if (days < 30) return { label: `In ${Math.round(days / 7)} weeks`, days };
  return { label: `In ${Math.round(days / 30)} months`, days };
}

export default function BookingsPage() {
  const { user, refresh } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [resLoading, setResLoading] = useState(true);
  const [tab, setTab] = useState<"upcoming" | "past" | "rentals">("upcoming");

  useEffect(() => {
    if (!user) {
      setLoading(false);
      setResLoading(false);
      return;
    }
    let mounted = true;
    setLoading(true);
    api<{ bookings: Booking[] }>("/api/my/bookings")
      .then((res) => mounted && setBookings(res.bookings))
      .catch((err) => {
        if (mounted)
          toast.error(err instanceof Error ? err.message : "Failed to load bookings");
      })
      .finally(() => mounted && setLoading(false));
    setResLoading(true);
    api<{ items: Reservation[] }>("/api/equipment-reservations")
      .then((res) => mounted && setReservations(res.items ?? []))
      .catch(() => mounted && setReservations([]))
      .finally(() => mounted && setResLoading(false));
    return () => {
      mounted = false;
    };
  }, [user]);

  if (!user) {
    return (
      <div className="font-body">
        <section className="relative overflow-hidden border-b border-ink/10 bg-paper py-24">
          <div className="pointer-events-none absolute inset-0 opacity-[0.05] bg-topo" />
          <div className="relative mx-auto max-w-2xl px-6 text-center sm:px-8">
            <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-rust">
              · Sign in required
            </span>
            <h1 className="mt-4 font-display text-4xl font-semibold text-ink sm:text-5xl">
              Your field journal is private.
            </h1>
            <p className="mt-4 text-ink/70">
              Sign in to see your booked hikes, equipment rentals, and trip history.
            </p>
            <div className="mt-8 flex justify-center gap-3">
              <Link
                to="/sign-in?next=/bookings"
                className="inline-flex items-center gap-2 rounded-full bg-pine px-6 py-3 text-sm font-medium text-amber-200 shadow-sm transition hover:bg-pine-2"
              >
                Sign in
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/sign-up"
                className="inline-flex items-center gap-2 rounded-full border border-ink/15 bg-paper px-6 py-3 text-sm font-medium text-ink-2 transition hover:border-pine hover:text-pine"
              >
                Create account
              </Link>
            </div>
          </div>
        </section>
      </div>
    );
  }

  async function handleLogout() {
    await api("/api/auth/logout", { method: "POST" }).catch(() => null);
    clearStoredUser();
    await refresh();
    toast.success("Signed out. See you on the next trail.");
  }

  // Partition
  const upcoming = bookings
    .filter((b) => new Date(b.hikeDate).getTime() >= Date.now() - 24 * 3600 * 1000)
    .sort((a, b) => new Date(a.hikeDate).getTime() - new Date(b.hikeDate).getTime());
  const past = bookings
    .filter((b) => new Date(b.hikeDate).getTime() < Date.now() - 24 * 3600 * 1000)
    .sort((a, b) => new Date(b.hikeDate).getTime() - new Date(a.hikeDate).getTime());

  // Aggregate stats
  const totalSpent = bookings.reduce((sum, b) => sum + (b.totalPence || 0), 0);
  const totalUpcomingSpend = upcoming.reduce((sum, b) => sum + (b.totalPence || 0), 0);
  const completedCount = past.length;

  return (
    <div className="font-body">
      {/* HEADER */}
      <section className="relative overflow-hidden border-b border-ink/10 bg-paper py-16 sm:py-20">
        <div className="pointer-events-none absolute inset-0 opacity-[0.04] bg-topo" />
        <div className="relative mx-auto max-w-7xl px-6 sm:px-8 lg:px-10">
          <div className="grid items-end gap-8 sm:grid-cols-[1fr_auto]">
            <div>
              <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-rust">
                · Field Journal
              </span>
              <h1 className="mt-3 font-display text-5xl font-semibold leading-[1.05] tracking-tight text-ink sm:text-6xl">
                Hello,{" "}
                <em className="text-rust">{user.name.split(" ")[0]}</em>.
              </h1>
              <p className="mt-3 max-w-xl text-ink/70">
                Every hike you've booked, every tent you've hired, every trail
                you've crossed — kept in one place.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {user.isAdmin && (
                <Link
                  to="/admin"
                  className="inline-flex items-center gap-2 rounded-full border border-ink/15 bg-paper px-5 py-2.5 text-sm font-medium text-ink-2 transition hover:border-pine hover:text-pine"
                >
                  Admin
                </Link>
              )}
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-2 rounded-full border border-ink/15 bg-paper px-5 py-2.5 text-sm font-medium text-ink-2 transition hover:border-pine hover:text-pine"
              >
                Sign out
              </button>
            </div>
          </div>

          {/* Stat strip */}
          <dl className="mt-12 grid max-w-3xl grid-cols-2 gap-px overflow-hidden rounded-sm border border-ink/10 bg-ink/10 font-mono text-ink sm:grid-cols-4">
            {[
              { k: upcoming.length.toString().padStart(2, "0"), l: "Upcoming trips" },
              { k: completedCount.toString().padStart(2, "0"), l: "Trips completed" },
              { k: reservations.length.toString().padStart(2, "0"), l: "Active rentals" },
              { k: formatGbp(totalSpent), l: "Lifetime spend" },
            ].map((s) => (
              <div key={s.l} className="bg-paper p-5">
                <dt className="font-display text-3xl text-pine">{s.k}</dt>
                <dd className="mt-1 text-[10px] uppercase tracking-[0.22em] text-ink-3">
                  {s.l}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* TABS */}
      <section className="border-b border-ink/10 bg-paper-deep/40">
        <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-10">
          <div className="flex flex-wrap items-center gap-1 py-3 font-mono text-[10px] uppercase tracking-[0.22em]">
            {([
              { id: "upcoming", label: "Upcoming", count: upcoming.length, tag: "01" },
              { id: "past", label: "Past trips", count: past.length, tag: "02" },
              { id: "rentals", label: "Rentals", count: reservations.length, tag: "03" },
            ] as const).map((t) => {
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={
                    "group relative inline-flex items-center gap-2 rounded-full px-4 py-2 transition " +
                    (active ? "text-pine" : "text-ink-2 hover:text-pine")
                  }
                >
                  <span className="text-rust">{t.tag}</span>
                  <span>{t.label}</span>
                  <span
                    className={
                      "rounded-full border px-2 py-0.5 text-[9px] " +
                      (active
                        ? "border-pine/40 bg-pine/5 text-pine"
                        : "border-ink/15 text-ink-3")
                    }
                  >
                    {t.count}
                  </span>
                  {active && (
                    <span className="absolute inset-x-3 -bottom-[1px] h-px bg-pine" />
                  )}
                </button>
              );
            })}
            <span className="ml-auto hidden items-center gap-2 text-ink-3 sm:flex">
              <Receipt className="h-3.5 w-3.5" />
              Last updated just now
            </span>
          </div>
        </div>
      </section>

      {/* UPCOMING */}
      {tab === "upcoming" && (
        <section className="bg-paper py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-10">
            {loading ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {[0, 1].map((i) => (
                  <div
                    key={i}
                    className="h-56 animate-pulse rounded-sm border border-ink/10 bg-paper-deep"
                  />
                ))}
              </div>
            ) : upcoming.length === 0 ? (
              <EmptyState
                icon={Compass}
                eyebrow="No upcoming trips"
                title="The trail is calling."
                body="Pick a date, bring your boots. Your next ridge is a booking away."
                ctaHref="/hikes"
                ctaLabel="Browse upcoming hikes"
              />
            ) : (
              <div className="grid gap-5 lg:grid-cols-2">
                {upcoming.map((b, i) => (
                  <HikeBookingCard
                    key={b.id}
                    b={b}
                    accent={i % 2 === 0 ? "from-moss to-moss-deep" : "from-ochre to-terracotta"}
                    daysLabel={daysUntil(b.hikeDate)}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* PAST */}
      {tab === "past" && (
        <section className="bg-paper py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-10">
            {past.length === 0 ? (
              <EmptyState
                icon={Sparkles}
                eyebrow="No past trips yet"
                title="Stories waiting to be written."
                body="Once you've been on a hike with us, it'll show up here as part of your trail history."
                ctaHref="/hikes"
                ctaLabel="Plan your first hike"
              />
            ) : (
              <div className="grid gap-3">
                {past.map((b) => (
                  <PastHikeRow key={b.id} b={b} />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* RENTALS */}
      {tab === "rentals" && (
        <section className="bg-paper py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-10">
            {resLoading ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {[0, 1].map((i) => (
                  <div
                    key={i}
                    className="h-44 animate-pulse rounded-sm border border-ink/10 bg-paper-deep"
                  />
                ))}
              </div>
            ) : reservations.length === 0 ? (
              <EmptyState
                icon={Tent}
                eyebrow="No rentals on file"
                title="Need a tent, bivvy, or kayak?"
                body="Browse the kit list and book what you need. We'll have it waiting at the trailhead."
                ctaHref="/rent"
                ctaLabel="Browse rentals"
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {reservations.map((r) => (
                  <ReservationCard key={r.id} r={r} />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* FOOTNOTE */}
      <section className="border-t border-ink/10 bg-paper-deep/40 py-10">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 text-xs font-mono uppercase tracking-[0.22em] text-ink-3 sm:px-8 lg:px-10">
          <span>Field journal · Badr Adventures UK</span>
          <span>Total upcoming spend: {formatGbp(totalUpcomingSpend)}</span>
        </div>
      </section>
    </div>
  );
}

function HikeBookingCard({
  b,
  accent,
  daysLabel,
}: {
  b: Booking;
  accent: string;
  daysLabel: { label: string; days: number };
}) {
  const tone = statusTone(b.status, b.paymentStatus);
  return (
    <article className="group lift paper-card overflow-hidden">
      <div className={`relative h-28 bg-gradient-to-br ${accent}`}>
        <svg
          aria-hidden
          className="absolute inset-0 h-full w-full opacity-[0.18]"
          viewBox="0 0 400 120"
          preserveAspectRatio="none"
        >
          <path
            d="M0 80 Q100 50 200 70 T400 60 M0 100 Q100 70 200 90 T400 80"
            stroke="#f3ede0"
            strokeWidth="1.2"
            fill="none"
          />
        </svg>
        <div className="absolute inset-x-5 top-4 flex items-start justify-between">
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-paper/85">
            ID · {b.id.slice(-6).toUpperCase()}
          </span>
          <span className={`rounded-full px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-widest ${toneClasses[tone.tone]}`}>
            {tone.label}
          </span>
        </div>
        <div className="absolute bottom-3 left-5 font-mono text-[10px] uppercase tracking-[0.22em] text-paper/70">
          {daysLabel.label}
        </div>
        <div className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-paper/15 backdrop-blur">
          <Mountain className="h-4 w-4 text-paper" />
        </div>
      </div>
      <div className="space-y-4 p-6">
        <div>
          <h3 className="font-display text-2xl font-semibold leading-tight tracking-tight text-ink">
            {b.hikeTitle}
          </h3>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.22em] text-rust">
            {b.hikeLocation}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3 border-y border-ink/10 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-2">
          <div className="flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5 text-rust" />
            <span>{formatBookingDate(b.hikeDate)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-rust" />
            <span>{b.partySize} {b.partySize === 1 ? "person" : "people"}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-rust" />
            <span>{b.hikeLocation.split(",")[0]}</span>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-ink-3">Total</div>
            <div className="font-display text-2xl font-semibold text-ink">
              {formatGbp(b.totalPence)}
            </div>
          </div>
          <Link
            to={`/hikes/${b.hikeId}`}
            className="inline-flex items-center gap-1.5 rounded-full bg-pine px-4 py-2 text-xs font-medium text-amber-200 transition hover:bg-pine-2"
          >
            View hike
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </article>
  );
}

function PastHikeRow({ b }: { b: Booking }) {
  const tone = statusTone(b.status, b.paymentStatus);
  return (
    <div className="grid grid-cols-[80px_1fr_auto_auto] items-center gap-4 border-b border-ink/10 py-4 font-mono text-xs">
      <span className="text-ink-3">{formatDate(b.hikeDate)}</span>
      <div>
        <div className="font-display text-base text-ink">{b.hikeTitle}</div>
        <div className="text-[10px] uppercase tracking-[0.22em] text-ink-3">
          {b.hikeLocation} · {b.partySize} {b.partySize === 1 ? "person" : "people"}
        </div>
      </div>
      <span className={`rounded-full px-2.5 py-0.5 text-[9px] uppercase tracking-widest ${toneClasses[tone.tone]}`}>
        {tone.label}
      </span>
      <span className="text-ink-2">{formatGbp(b.totalPence)}</span>
    </div>
  );
}

function ReservationCard({ r }: { r: Reservation }) {
  const tone = statusTone(r.status, r.paymentStatus);
  const Icon = r.equipment.type === "tent" ? Tent : Package;
  return (
    <article className="group lift paper-card overflow-hidden">
      <div className="relative h-32 bg-gradient-to-br from-lichen to-moss-light">
        <svg
          aria-hidden
          className="absolute inset-0 h-full w-full opacity-[0.18]"
          viewBox="0 0 400 120"
          preserveAspectRatio="none"
        >
          <path
            d="M0 70 L80 50 L150 80 L220 40 L300 70 L400 55"
            stroke="#f3ede0"
            strokeWidth="1.2"
            fill="none"
          />
        </svg>
        <div className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-paper/15 backdrop-blur">
          <Icon className="h-4 w-4 text-paper" />
        </div>
        <div className="absolute bottom-3 left-4 font-mono text-[10px] uppercase tracking-[0.22em] text-paper/85">
          Rental · {r.equipment.type}
        </div>
        <div className="absolute right-4 top-4 mt-12">
          <span className={`rounded-full px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-widest ${toneClasses[tone.tone]}`}>
            {tone.label}
          </span>
        </div>
      </div>
      <div className="space-y-3 p-5">
        <div>
          <h3 className="font-display text-lg font-semibold text-ink">
            {r.equipment.name}
          </h3>
          <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-3">
            {r.equipment.location}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 border-t border-ink/10 pt-3 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-2">
          <div className="flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5 text-rust" />
            {formatDate(r.startDate)} → {formatDate(r.endDate)}
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-rust" />
            {r.nights} night{r.nights === 1 ? "" : "s"}
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-ink/10 pt-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-3">
            Total
          </span>
          <span className="font-display text-lg font-semibold text-ink">
            {formatGbp(r.totalGbp)}
          </span>
        </div>
      </div>
    </article>
  );
}

function EmptyState({
  icon: Icon,
  eyebrow,
  title,
  body,
  ctaHref,
  ctaLabel,
}: {
  icon: React.ComponentType<{ className?: string }>;
  eyebrow: string;
  title: string;
  body: string;
  ctaHref: string;
  ctaLabel: string;
}) {
  return (
    <div className="mx-auto max-w-xl border border-ink/10 bg-paper p-12 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-ink/15 bg-paper-deep">
        <Icon className="h-6 w-6 text-rust" />
      </div>
      <span className="mt-6 block font-mono text-[10px] uppercase tracking-[0.28em] text-rust">
        {eyebrow}
      </span>
      <h3 className="mt-2 font-display text-3xl font-semibold text-ink">
        {title}
      </h3>
      <p className="mt-2 text-ink/70">{body}</p>
      <Link
        to={ctaHref}
        className="mt-6 inline-flex items-center gap-2 rounded-full bg-pine px-6 py-3 text-sm font-medium text-amber-200 transition hover:bg-pine-2"
      >
        {ctaLabel}
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
