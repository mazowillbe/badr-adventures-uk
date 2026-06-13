import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Mountain, Sparkles, Sun } from "lucide-react";
import { initReveal, initParallax } from "@/lib/animations";

export default function Hero() {
  const root = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!root.current) return;
    let cleanup1: (() => void) | undefined;
    let cleanup2: (() => void) | undefined;
    initReveal(root.current).then((fn) => {
      cleanup1 = fn;
    });
    initParallax(root.current).then((fn) => {
      cleanup2 = fn;
    });
    return () => {
      cleanup1?.();
      cleanup2?.();
    };
  }, []);

  return (
    <section
      ref={root}
      className="hero relative isolate overflow-hidden bg-ink text-paper"
    >
      {/* Background image with strong darkening + warm glow */}
      <div className="absolute inset-0 -z-10">
        <img
          src="/images/hero-mountains.jpg"
          alt="Hikers on a mountain ridge at first light"
          className="parallax-img h-[115%] w-full object-cover object-center"
          loading="eager"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-ink/80 via-ink/40 to-ink/90" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(232,168,75,0.18),transparent_55%)]" />
      </div>

      {/* Topographic overlay */}
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 h-full w-full opacity-[0.07]"
        viewBox="0 0 1200 800"
        preserveAspectRatio="none"
      >
        <defs>
          <pattern
            id="topo"
            x="0"
            y="0"
            width="1200"
            height="800"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M0 600 C200 540 320 700 600 580 C880 460 980 700 1200 580 M0 540 C200 480 320 640 600 520 C880 400 980 640 1200 520 M0 480 C200 420 320 580 600 460 C880 340 980 580 1200 460"
              stroke="#e8a84b"
              strokeWidth="1.2"
              fill="none"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#topo)" />
      </svg>

      {/* Coordinates + corner badge */}
      <div
        data-reveal
        className="absolute left-6 top-24 hidden font-mono text-[10px] uppercase tracking-[0.3em] text-paper/60 lg:block"
      >
        <div>54.4609° N</div>
        <div>−3.0886° W</div>
        <div className="mt-1 text-paper/40">LAKE DISTRICT · UK</div>
      </div>
      <div
        data-reveal
        className="absolute right-6 top-24 hidden items-center gap-2 font-mono text-[10px] uppercase tracking-[0.3em] text-paper/60 lg:flex"
      >
        <Sun className="h-3.5 w-3.5 text-[var(--ochre)]" />
        <span>Field notes · 2026</span>
      </div>

      <div className="relative mx-auto flex min-h-[88vh] max-w-7xl flex-col justify-center px-6 py-32 sm:px-8 lg:px-10">
        <div className="max-w-3xl" data-reveal data-reveal-delay="0">
          <span className="inline-flex items-center gap-2 rounded-full border border-paper/30 bg-paper/5 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.28em] text-paper/80 backdrop-blur">
            <Sparkles className="h-3 w-3 text-[var(--ochre)]" />
            Bringing green to your deen
          </span>
        </div>

        <h1
          data-reveal
          data-reveal-delay="80"
          className="mt-8 max-w-4xl font-serif text-5xl font-semibold leading-[0.95] tracking-tight text-paper sm:text-7xl lg:text-[88px]"
        >
          Leave the creature comforts at home and{" "}
          <span className="italic text-[var(--ochre)]">embrace</span> the challenge.
        </h1>

        <p
          data-reveal
          data-reveal-delay="200"
          className="mt-8 max-w-2xl text-lg leading-relaxed text-paper/80"
        >
          Bespoke camping, guided hikes and kayaking across the UK — for people who've never
          picked up a compass, and people who already know every footpath. Real adventures,
          real community, real rest.
        </p>

        <div
          data-reveal
          data-reveal-delay="320"
          className="mt-10 flex flex-wrap items-center gap-3"
        >
          <Link
            to="/hikes"
            className="group inline-flex items-center gap-2 rounded-full bg-[var(--ochre)] px-6 py-3 text-sm font-medium text-ink shadow-[0_18px_40px_-12px_rgba(232,168,75,0.6)] transition hover:bg-[#f0b75e]"
          >
            See upcoming hikes
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <Link
            to="/about"
            className="inline-flex items-center gap-2 rounded-full border border-paper/30 bg-paper/5 px-6 py-3 text-sm font-medium text-paper backdrop-blur transition hover:border-paper/50 hover:bg-paper/10"
          >
            Read the field guide
          </Link>
        </div>

        {/* Stats strip */}
        <dl
          data-reveal
          data-reveal-delay="500"
          className="mt-16 grid max-w-3xl grid-cols-2 gap-px overflow-hidden rounded-sm border border-paper/15 bg-paper/10 font-mono text-paper sm:grid-cols-4"
        >
          {[
            { k: "40+", l: "Routes mapped" },
            { k: "500+", l: "Hikers guided" },
            { k: "4.9 / 5", l: "Average rating" },
            { k: "100%", l: "Qualified guides" },
          ].map((s) => (
            <div key={s.l} className="bg-ink/40 p-5 backdrop-blur">
              <dt className="font-serif text-3xl text-[var(--ochre)]">{s.k}</dt>
              <dd className="mt-1 text-[10px] uppercase tracking-[0.24em] text-paper/70">
                {s.l}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Scroll indicator */}
      <div
        data-reveal
        data-reveal-delay="700"
        className="absolute bottom-6 left-1/2 -translate-x-1/2 font-mono text-[10px] uppercase tracking-[0.3em] text-paper/50"
      >
        <Mountain className="mx-auto h-4 w-4 animate-bounce text-[var(--ochre)]" />
        <div className="mt-1">Scroll</div>
      </div>
    </section>
  );
}
