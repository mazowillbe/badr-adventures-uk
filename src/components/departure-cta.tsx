import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Calendar, Compass, MountainSnow } from "lucide-react";
import { initReveal } from "@/lib/animations";

export default function DepartureCta() {
  const root = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!root.current) return;
    let cleanup: (() => void) | undefined;
    initReveal(root.current).then((fn) => {
      cleanup = fn ?? undefined;
    });
    return () => cleanup?.();
  }, []);

  return (
    <section ref={root} className="cta relative overflow-hidden bg-ink py-28 text-paper sm:py-36">
      {/* Atmospheric background */}
      <div className="absolute inset-0 -z-10 opacity-40">
        <img
          src="/images/hero-mountains.jpg"
          alt=""
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-ink via-ink/70 to-ink" />
      </div>
      {/* Topo line */}
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-24 w-full opacity-40"
        viewBox="0 0 1200 200"
        preserveAspectRatio="none"
      >
        <path
          d="M0 140 C200 60 320 180 600 100 C880 20 980 180 1200 120"
          stroke="#e8a84b"
          strokeWidth="1.4"
          fill="none"
        />
      </svg>

      <div className="relative mx-auto grid max-w-6xl gap-12 px-6 sm:px-8 lg:grid-cols-2 lg:px-10">
        <div>
          <p
            data-reveal
            className="font-mono text-[11px] uppercase tracking-[0.28em] text-[var(--ochre)]"
          >
            ◇ 05 · Departure
          </p>
          <h2
            data-reveal
            data-reveal-delay="80"
            className="mt-4 font-serif text-4xl font-semibold leading-[1.02] sm:text-6xl"
          >
            Your next weekend deserves{" "}
            <span className="italic text-[var(--ochre)]">a horizon.</span>
          </h2>
        </div>
        <div className="flex flex-col justify-end gap-7">
          <p
            data-reveal
            data-reveal-delay="200"
            className="text-lg leading-relaxed text-paper/80"
          >
            Create a free account to book hikes, track your adventures, and get
            early access to new trips. We'll never spam you — promise.
          </p>
          <div data-reveal data-reveal-delay="300" className="flex flex-wrap gap-3">
            <Link
              to="/sign-up"
              className="group inline-flex items-center gap-2 rounded-full bg-[var(--ochre)] px-6 py-3 text-sm font-medium text-ink shadow-[0_18px_40px_-12px_rgba(232,168,75,0.5)] transition hover:bg-[#f0b75e]"
            >
              Create a free account
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 rounded-full border border-paper/30 bg-paper/5 px-6 py-3 text-sm font-medium text-paper transition hover:border-paper/50 hover:bg-paper/10"
            >
              <Calendar className="h-4 w-4" />
              Talk to a guide
            </Link>
          </div>
          <div
            data-reveal
            data-reveal-delay="400"
            className="flex items-center gap-6 border-t border-paper/15 pt-6 font-mono text-[10px] uppercase tracking-[0.24em] text-paper/55"
          >
            <span className="flex items-center gap-1.5">
              <Compass className="h-3.5 w-3.5 text-[var(--ochre)]" />
              No fees on the trail
            </span>
            <span className="flex items-center gap-1.5">
              <MountainSnow className="h-3.5 w-3.5 text-[var(--ochre)]" />
              UK qualified guides
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
