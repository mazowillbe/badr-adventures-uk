import { useEffect, useRef } from "react";
import { Compass, Mountain, Tent, TreePine, Utensils, Users, Waves } from "lucide-react";
import { initReveal } from "@/lib/animations";

const PRINCIPLES = [
  {
    icon: Mountain,
    n: "01",
    title: "Routes, not rush",
    body: "Trained, qualified guides who know the terrain, the weather windows, and how to keep every group safe on the days the weather doesn't.",
  },
  {
    icon: Tent,
    n: "02",
    title: "Bespoke camp",
    body: "Up to 8-person tent setups, sleeping bags, air beds and blankets all sorted. You bring yourself, your curiosity, and a willingness to unplug.",
  },
  {
    icon: Waves,
    n: "03",
    title: "Water & wilderness",
    body: "Calm-water kayak sessions on selected UK lakes and rivers, paired with walking itineraries for a full active weekend.",
  },
  {
    icon: Utensils,
    n: "04",
    title: "Hot meals · halaal-first",
    body: "Nutritious hot and cold meals, with vegetarian and halaal-friendly choices. Controlled campfires in season.",
  },
  {
    icon: Users,
    n: "05",
    title: "Inclusive on the trail",
    body: "Faith-friendly, family-friendly, beginners welcome. We tailor the pace to the slowest member of the group, every single time.",
  },
  {
    icon: TreePine,
    n: "06",
    title: "Leave No Trace",
    body: "We follow Leave No Trace ethics and run environment education sessions on every multi-day trip.",
  },
];

export default function FieldManifesto() {
  const root = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!root.current) return;
    let cleanup: (() => void) | undefined;
    initReveal(root.current).then((fn) => { cleanup = fn ?? undefined; });
    return () => cleanup?.();
  }, []);

  return (
    <section
      ref={root}
      className="manifesto relative overflow-hidden border-y border-ink/10 bg-[#f1ebdc] py-28 sm:py-36"
    >
      {/* Paper grain */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.18] mix-blend-multiply [background-image:radial-gradient(circle_at_30%_20%,rgba(20,30,25,0.18)_0.5px,transparent_1px),radial-gradient(circle_at_70%_60%,rgba(20,30,25,0.15)_0.5px,transparent_1px)] [background-size:4px_4px,5px_5px]" />

      <div className="relative mx-auto grid max-w-7xl gap-16 px-6 sm:px-8 lg:grid-cols-12 lg:px-10">
        <div className="lg:col-span-5">
          <div data-reveal>
            <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-emerald-900/70">
              ◇ 03 · Field manifesto
            </p>
            <h2 className="mt-4 font-serif text-4xl font-semibold leading-[1.05] text-ink sm:text-5xl">
              Six rules we hike by.
            </h2>
            <p className="mt-6 max-w-md text-base leading-relaxed text-ink/70">
              The way we run trips hasn't really changed since we started. Get the
              fundamentals right — the food, the pace, the people — and the mountain does the rest.
            </p>
          </div>

          <div
            data-reveal
            data-reveal-delay="200"
            className="mt-10 flex items-center gap-4 border-t border-ink/15 pt-6"
          >
            <Compass className="h-7 w-7 text-emerald-900" strokeWidth={1.2} />
            <p className="font-serif text-lg italic text-ink/80">
              "A hike is just a walk with a horizon in mind."
            </p>
          </div>
        </div>

        <ul className="grid gap-px overflow-hidden rounded-sm border border-ink/10 bg-ink/10 sm:grid-cols-2 lg:col-span-7">
          {PRINCIPLES.map((p, i) => (
            <li
              key={p.n}
              data-reveal
              data-reveal-delay={String(i * 60)}
              className="bg-[#f6f0e1] p-7 transition-colors hover:bg-white"
            >
              <div className="flex items-baseline justify-between">
                <p.icon className="h-5 w-5 text-emerald-900" strokeWidth={1.4} />
                <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-ink/40">
                  {p.n}
                </span>
              </div>
              <h3 className="mt-5 font-serif text-xl font-semibold text-ink">{p.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink/70">{p.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
