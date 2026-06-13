import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Calendar, Compass, MapPin, Users } from "lucide-react";
import { api, formatGbp, formatShortDate } from "@/lib/api";
import { initReveal } from "@/lib/animations";

type Hike = {
  id: string;
  title: string;
  location: string;
  region: string;
  date: string;
  duration: string;
  difficulty: "Easy" | "Moderate" | "Challenging" | "Strenuous";
  summary: string;
  image: string;
  pricePence: number;
  spotsLeft: number;
  spotsTotal: number;
  tags: string[];
  guide: string;
};

const DIFFICULTY_GLYPH: Record<Hike["difficulty"], string> = {
  Easy: "·",
  Moderate: "··",
  Challenging: "···",
  Strenuous: "····",
};

const FALLBACK_HIKES: Hike[] = [
  {
    id: "lake-district-3-day-trek",
    title: "Lake District · Three-Day Fell Traverse",
    location: "Borrowdale",
    region: "Lake District",
    date: "2026-07-18",
    duration: "3 days",
    difficulty: "Challenging",
    summary: "Helvellyn, Fairfield and the Fairfield Horseshoe. Wild-camp above the cloud line.",
    image: "/images/hike-mountain.jpg",
    pricePence: 18500,
    spotsLeft: 4,
    spotsTotal: 8,
    tags: ["Wild camp", "Summit"],
    guide: "Abu Jabal",
  },
  {
    id: "peak-district-weekend-introduction",
    title: "Peak District · Weekend Introduction",
    location: "Hathersage",
    region: "Peak District",
    date: "2026-08-02",
    duration: "2 days",
    difficulty: "Moderate",
    summary: "Edges, tors and rolling moorland. A friendly first multi-day for new hikers.",
    image: "/images/tent-camp.jpg",
    pricePence: 12000,
    spotsLeft: 6,
    spotsTotal: 10,
    tags: ["Beginner", "Weekend"],
    guide: "Yusuf A.",
  },
  {
    id: "snowdonia-scramble-and-sunset",
    title: "Snowdonia · Tryfan Scramble & Sunset",
    location: "Ogwen Valley",
    region: "Snowdonia",
    date: "2026-08-23",
    duration: "Full day",
    difficulty: "Strenuous",
    summary: "Grade-1 scrambling on Tryfan's north ridge. Long day, big reward.",
    image: "/images/hero-mountains.jpg",
    pricePence: 8500,
    spotsLeft: 3,
    spotsTotal: 6,
    tags: ["Scramble", "Summit"],
    guide: "Hassan K.",
  },
];

export default function FeaturedRoutes() {
  const root = useRef<HTMLElement | null>(null);
  const headRef = useRef<HTMLDivElement | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const [hikes, setHikes] = useState<Hike[]>(FALLBACK_HIKES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    api<{ hikes: Hike[] }>("/api/hikes?limit=3")
      .then((res) => {
        if (!mounted) return;
        if (res.hikes.length) setHikes(res.hikes.slice(0, 3));
      })
      .catch(() => {
        // network error: keep fallback
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!root.current) return;
    let cleanup: (() => void) | undefined;
    initReveal(root.current).then((fn) => {
      cleanup = fn ?? undefined;
    });
    return () => cleanup?.();
  }, []);

  return (
    <section
      ref={root}
      className="field-section relative bg-[var(--paper)] py-24 sm:py-32"
    >
      {/* Decorative compass */}
      <div
        className="pointer-events-none absolute right-[6%] top-12 hidden h-44 w-44 text-emerald-900/15 md:block"
        data-reveal="fade"
      >
        <Compass className="h-full w-full animate-[spin_60s_linear_infinite]" strokeWidth={0.8} />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div ref={headRef} className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-2xl" data-reveal>
            <p className="text-[11px] font-mono uppercase tracking-[0.28em] text-emerald-900/70">
              ◇ 02 · Routes on the slate
            </p>
            <h2 className="mt-3 font-serif text-4xl font-semibold text-ink sm:text-5xl">
              Upcoming expeditions.
            </h2>
            <p className="mt-3 max-w-xl text-base leading-relaxed text-ink/70">
              Three trips from the field book. Full itineraries, kit lists, and live spots on the
              hikes page — these are the ones most often booked out first.
            </p>
          </div>
          <Link
            to="/hikes"
            className="group inline-flex items-center gap-2 self-end text-sm font-medium text-ink/80 hover:text-emerald-900"
            data-reveal
          >
            Open the field book
            <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Link>
        </div>

        <div
          ref={gridRef}
          className="mt-14 grid gap-7 sm:grid-cols-2 lg:grid-cols-3"
        >
          {loading
            ? Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-[420px] animate-pulse rounded-sm border border-ink/10 bg-stone-200/40"
                />
              ))
            : hikes.map((hike, i) => (
                <FeaturedCard key={hike.id} hike={hike} index={i} />
              ))}
        </div>
      </div>
    </section>
  );
}

function FeaturedCard({ hike, index }: { hike: Hike; index: number }) {
  const cheap =
    hike.pricePence === 0
      ? "Free"
      : `£${formatGbp(hike.pricePence).replace("£", "")}`;
  return (
    <Link
      to={`/hikes/${hike.id}`}
      data-reveal
      data-reveal-delay={String(index * 80)}
      className="group relative block overflow-hidden rounded-sm border border-ink/10 bg-white shadow-[0_1px_0_rgba(20,30,25,0.04)] transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_22px_50px_-20px_rgba(20,30,25,0.25)]"
    >
      {/* Topo edge */}
      <div className="absolute inset-x-0 top-0 h-1.5 bg-[repeating-linear-gradient(90deg,var(--ochre)_0_8px,transparent_8px_16px)] opacity-70" />

      <div className="relative aspect-[4/3] w-full overflow-hidden bg-ink/5">
        <img
          src={hike.image}
          alt={hike.title}
          className="h-full w-full object-cover transition-transform duration-[1200ms] group-hover:scale-[1.06]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/55 via-ink/10 to-transparent" />
        <div className="absolute left-4 top-4 flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-paper">
          <span className="rounded-full border border-paper/40 bg-ink/40 px-2.5 py-1 backdrop-blur">
            {hike.region}
          </span>
        </div>
        <div className="absolute bottom-4 left-4 right-4 font-mono text-[10px] uppercase tracking-widest text-paper/90">
          {formatShortDate(hike.date)} · {hike.duration}
        </div>
      </div>

      <div className="px-6 pb-6 pt-5">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="font-serif text-xl font-semibold leading-snug text-ink">
            {hike.title}
          </h3>
          <span className="shrink-0 font-mono text-sm text-emerald-900">
            {cheap}
          </span>
        </div>
        <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-ink/65">
          {hike.summary}
        </p>

        <div className="mt-5 grid grid-cols-3 gap-3 border-t border-ink/10 pt-4 font-mono text-[10px] uppercase tracking-widest text-ink/60">
          <span className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" />
            {hike.location}
          </span>
          <span className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            {hike.duration}
          </span>
          <span className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            {hike.spotsLeft}/{hike.spotsTotal} left
          </span>
        </div>

        <div className="mt-5 flex items-center justify-between text-xs">
          <span className="font-mono tracking-widest text-ink/50">
            DIFFICULTY · {hike.difficulty.toUpperCase()} {DIFFICULTY_GLYPH[hike.difficulty]}
          </span>
          <span className="inline-flex items-center gap-1 font-medium text-emerald-900 transition-transform group-hover:translate-x-1">
            View
            <ArrowUpRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}
