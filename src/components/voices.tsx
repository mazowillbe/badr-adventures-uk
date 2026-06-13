import { useEffect, useRef } from "react";
import { Quote, Star } from "lucide-react";
import { initReveal } from "@/lib/animations";

const VOICES = [
  {
    name: "Hafsa M.",
    role: "Hiker · Lake District",
    body: "Honestly the most welcoming group I've hiked with. The pace was perfect, the guides were so patient with the beginners and the food was incredible. Already booked on the next one.",
  },
  {
    name: "Yusuf A.",
    role: "Hiker · Peak District",
    body: "Loved the balance of challenge and support. I came as a complete novice and left feeling like I could actually do this. The halaal meal option was a huge plus for me.",
  },
  {
    name: "Aisha R.",
    role: "Hiker · Yorkshire Dales",
    body: "Badr Adventures really get the small things right. Tent was already set up, sleeping bag ready, hot food on the stove when we got back. Felt completely looked after.",
  },
];

export default function Voices() {
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
    <section
      ref={root}
      className="voices relative overflow-hidden py-28 sm:py-36"
    >
      {/* Decorative topo lines */}
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-40 w-full opacity-25"
        viewBox="0 0 1200 200"
        preserveAspectRatio="none"
      >
        <path
          d="M0 160 C200 100 320 200 600 130 C880 60 980 200 1200 140"
          stroke="#3d5a40"
          strokeWidth="1.4"
          fill="none"
        />
        <path
          d="M0 180 C200 120 320 220 600 150 C880 80 980 220 1200 160"
          stroke="#3d5a40"
          strokeWidth="1.4"
          fill="none"
          opacity="0.6"
        />
      </svg>

      <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-10">
        <div
          data-reveal
          className="grid items-end gap-6 sm:grid-cols-[1fr_auto]"
        >
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-emerald-900/70">
              ◇ 04 · Voices from the trail
            </p>
            <h2 className="mt-4 max-w-2xl font-serif text-4xl font-semibold leading-[1.05] text-ink sm:text-5xl">
              What the people in the back row said.
            </h2>
          </div>
          <p className="max-w-sm text-sm text-ink/60">
            We collect every reply, and we read them. Here's a small selection.
          </p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {VOICES.map((v, i) => (
            <article
              key={v.name}
              data-reveal
              data-reveal-delay={String(i * 90)}
              className="group relative flex flex-col gap-5 border-t-2 border-emerald-900/40 bg-white p-7 pt-8 shadow-[0_24px_48px_-32px_rgba(20,30,25,0.25)] transition hover:-translate-y-1 hover:shadow-[0_36px_72px_-32px_rgba(20,30,25,0.3)]"
            >
              <Quote
                className="h-7 w-7 text-[var(--ochre)]/80 transition group-hover:text-[var(--ochre)]"
                strokeWidth={1.4}
              />
              <p className="font-serif text-lg leading-relaxed text-ink">
                "{v.body}"
              </p>
              <div className="mt-auto flex items-center gap-1.5 text-[var(--ochre)]">
                {Array.from({ length: 5 }).map((_, j) => (
                  <Star key={j} className="h-3.5 w-3.5 fill-current" />
                ))}
              </div>
              <div className="flex items-center gap-3 border-t border-ink/10 pt-4 font-mono text-[11px] uppercase tracking-[0.18em] text-ink/60">
                <span className="text-ink">{v.name}</span>
                <span className="text-ink/30">·</span>
                <span>{v.role}</span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
