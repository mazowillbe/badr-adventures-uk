import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Award,
  Calendar,
  Compass,
  Heart,
  Mountain,
  MountainSnow,
  ShieldCheck,
  Sparkles,
  Star,
  Sun,
  Tent,
  TreePine,
  Users,
  Waves,
  MapPin,
  Backpack,
  Footprints,
  Clock,
} from "lucide-react";
import { initReveal, initRevealStagger, initHeroScene } from "@/lib/animations";

const principles = [
  {
    icon: Heart,
    n: "01",
    title: "Faith-friendly by default",
    body: "We respect the prayer, dietary, and pace needs that make group adventures inclusive. No awkwardness, no compromises.",
  },
  {
    icon: ShieldCheck,
    n: "02",
    title: "Safety is non-negotiable",
    body: "Every hike is led by qualified guides with first aid training, and every trip has a written risk assessment.",
  },
  {
    icon: Mountain,
    n: "03",
    title: "Leave it better than we found it",
    body: "Our trail code: pack it in, pack it out, support the parks and farms that host us.",
  },
  {
    icon: Sparkles,
    n: "04",
    title: "Real adventures, real people",
    body: "No influencer theatre. No VIP upgrades. The trail is the same for everyone.",
  },
];

const team = [
  {
    name: "Abu Jabal",
    role: "Founder · Lead Guide",
    bio: "Qualified Mountain Leader with 8+ years leading group hikes across the Peak District, Lake District, Yorkshire Dales, and Snowdonia. Believes the best conversations happen at the top of a hill.",
    tags: ["Mountain Leader", "First Aid", "Wild Camping"],
    accent: "from-moss to-moss-deep",
  },
  {
    name: "Yusuf K.",
    role: "Operations · Logistics",
    bio: "Keeps the kit dry, the meals hot, and the van on time. Background in event ops and wild camping. The reason every group arrives before the kettle's boiled.",
    tags: ["Event Ops", "Catering", "Driver"],
    accent: "from-ochre to-terracotta",
  },
  {
    name: "Aisha R.",
    role: "Community · Storyteller",
    bio: "Captures trip photos, writes the after-trip recaps, and makes sure every guest gets home with a story to tell. Will absolutely stop the group to photograph a bird.",
    tags: ["Photography", "Writing", "Bird nerd"],
    accent: "from-lichen to-moss-light",
  },
];

const stats = [
  { icon: Sun, label: "Day hikes", value: "60+", tint: "text-ochre" },
  { icon: Tent, label: "Camping trips", value: "12+", tint: "text-moss" },
  { icon: Waves, label: "Water adventures", value: "8+", tint: "text-terracotta" },
  { icon: Award, label: "Years guiding", value: "8+", tint: "text-bark" },
];

const milestones = [
  { year: "2017", text: "First Badr Adventures trip — Kinder Scout, 5 friends, one stove." },
  { year: "2019", text: "First multi-day wild camp in the Lake District. 12 hikers." },
  { year: "2021", text: "Halaal meal programme expanded; vegetarian by default." },
  { year: "2023", text: "Kayaking added to the calendar; partnership with local outfitters." },
  { year: "2025", text: "500th hiker. Calendar sells out 6 weeks ahead for the first time." },
];

export default function AboutPage() {
  const heroRef = useRef<HTMLElement | null>(null);
  const principlesRef = useRef<HTMLElement | null>(null);
  const storyRef = useRef<HTMLElement | null>(null);
  const teamRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (heroRef.current) initHeroScene(heroRef.current);
  }, []);

  useEffect(() => {
    const c1 = principlesRef.current ? initReveal(principlesRef.current) : undefined;
    const c2 = storyRef.current
      ? initRevealStagger(storyRef.current, { selector: "[data-tl]" })
      : undefined;
    const c3 = teamRef.current ? initRevealStagger(teamRef.current, { selector: "[data-tcard]" }) : undefined;
    return () => {
      c1?.then?.((fn) => fn?.());
      c2?.then?.((fn) => fn?.());
      c3?.then?.((fn) => fn?.());
    };
  }, []);

  return (
    <div className="font-body">
      {/* HERO */}
      <section
        ref={heroRef}
        className="relative isolate overflow-hidden bg-ink text-paper"
      >
        <div className="absolute inset-0 -z-20">
          <img
            src="/images/hero-mountains.jpg"
            alt="Hikers on a mountain ridge at first light"
            className="parallax-img h-[115%] w-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-ink/80 via-ink/45 to-ink/95" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(200,155,60,0.18),transparent_55%)]" />
        </div>

        <svg
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 h-full w-full opacity-[0.07]"
          viewBox="0 0 1200 800"
          preserveAspectRatio="none"
        >
          <defs>
            <pattern id="topo-hero" x="0" y="0" width="1200" height="800" patternUnits="userSpaceOnUse">
              <path
                d="M0 600 C200 540 320 700 600 580 C880 460 980 700 1200 580 M0 540 C200 480 320 640 600 520 C880 400 980 640 1200 520 M0 480 C200 420 320 580 600 460 C880 340 980 580 1200 460"
                stroke="#c89b3c"
                strokeWidth="1.2"
                fill="none"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#topo-hero)" />
        </svg>

        <div className="relative mx-auto flex min-h-[80vh] max-w-7xl flex-col justify-end px-6 py-32 sm:px-8 lg:px-10">
          <div data-reveal className="font-mono text-[10px] uppercase tracking-[0.3em] text-paper/60">
            <span className="text-ochre">●</span> Volume IV · 2026 · The Field Atlas
          </div>

          <h1
            data-reveal
            data-reveal-delay="100"
            className="mt-6 max-w-4xl font-display text-5xl font-semibold leading-[0.95] tracking-tight sm:text-7xl lg:text-[88px]"
          >
            Bringing green <br />
            to your <span className="italic text-ochre">deen</span>,<br />
            one ridge at a time.
          </h1>

          <p
            data-reveal
            data-reveal-delay="250"
            className="mt-8 max-w-2xl text-lg leading-relaxed text-paper/80"
          >
            We design and run outdoor experiences for the UK Muslim community and anyone who
            wants a thoughtful, inclusive adventure. Hikes, kayaking, wild camping — and a
            proper meal at the end of the day.
          </p>

          <div data-reveal data-reveal-delay="400" className="mt-10 flex flex-wrap items-center gap-4 text-paper/70">
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em]">
              <Compass className="h-3.5 w-3.5 text-ochre" /> 54.4609° N · −3.0886° W
            </div>
            <span className="h-3 w-px bg-paper/30" />
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em]">
              <Clock className="h-3.5 w-3.5 text-ochre" /> Established 2017
            </div>
            <span className="h-3 w-px bg-paper/30" />
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em]">
              <Backpack className="h-3.5 w-3.5 text-ochre" /> 500+ hikers
            </div>
          </div>
        </div>
      </section>

      {/* PRINCIPLES */}
      <section
        ref={principlesRef}
        className="relative overflow-hidden border-t border-ink/10 bg-paper py-28 sm:py-36"
      >
        <div className="pointer-events-none absolute inset-0 opacity-[0.05] bg-topo" />
        <div className="relative mx-auto max-w-7xl px-6 sm:px-8 lg:px-10">
          <div className="grid items-end gap-8 sm:grid-cols-[1fr_auto]">
            <div data-reveal>
              <span className="stamp inline-flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-rust" />
                § 01 · Field Principles
              </span>
              <h2 className="mt-4 max-w-2xl font-display text-4xl font-semibold leading-[1.05] tracking-tight text-ink sm:text-6xl">
                Four ideas. <br />
                We hold them <span className="italic text-rust">tight</span>.
              </h2>
            </div>
            <p data-reveal className="max-w-md text-base text-ink/70">
              The trail teaches you what matters quickly. These four are what we keep returning
              to — on every ridge, in every downpour, around every campfire.
            </p>
          </div>

          <div className="mt-16 grid gap-px overflow-hidden border border-ink/10 bg-ink/10 sm:grid-cols-2">
            {principles.map((p) => (
              <article
                key={p.title}
                data-reveal
                className="group relative bg-paper p-8 transition-colors hover:bg-paper-deep sm:p-10"
              >
                <div className="flex items-start justify-between font-mono text-[10px] uppercase tracking-[0.28em] text-ink/40">
                  <span>{p.n}</span>
                  <p.icon className="h-4 w-4 text-rust transition-transform group-hover:scale-110" />
                </div>
                <h3 className="mt-12 font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
                  {p.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-ink/70">{p.body}</p>
                <div className="mt-8 h-px w-12 bg-ink/20 transition-all group-hover:w-24 group-hover:bg-rust" />
              </article>
            ))}
          </div>
        </div>
      </section>

      <div className="compass-rose" aria-hidden />

      {/* STORY */}
      <section
        ref={storyRef}
        className="relative overflow-hidden bg-moss-deep py-28 text-paper sm:py-36"
      >
        <svg
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.06]"
          viewBox="0 0 1200 800"
          preserveAspectRatio="none"
        >
          <path
            d="M0 500 C200 440 320 600 600 480 C880 360 980 600 1200 480 M0 540 C200 480 320 640 600 520 C880 400 980 640 1200 520"
            stroke="#c89b3c"
            strokeWidth="1.2"
            fill="none"
          />
        </svg>

        <div className="relative mx-auto max-w-7xl px-6 sm:px-8 lg:px-10">
          <div className="grid items-start gap-16 lg:grid-cols-[1.05fr_1fr]">
            <div data-tl>
              <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-ochre">
                § 02 · The Story
              </span>
              <h2 className="mt-4 font-display text-4xl font-semibold leading-[1.05] tracking-tight text-paper sm:text-6xl">
                Born on <em className="text-ochre">Kinder Scout</em>,<br />
                built for the community.
              </h2>

              <div className="mt-8 space-y-5 text-base leading-relaxed text-paper/80">
                <p>
                  Badr Adventures started with a simple plan: gather a few friends, drive to the
                  Peak District, and find a quiet ridge to watch the sunset. That first trip
                  turned into a second, then a third, and eventually into a calendar of
                  small-group adventures that welcomes complete beginners and seasoned hill-goers
                  alike.
                </p>
                <p>
                  The name <em className="text-ochre">Badr</em> — meaning "full moon" — is a
                  small reminder that the same sky covers all of us, and that the trail is the
                  great equaliser.
                </p>
                <p>
                  Today we run hikes and camping weekends across the UK with trained guides,
                  real food, and a pace that respects prayer, family commitments, and the
                  slowest member of the group. We hope you'll join us.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3" data-tl>
              {stats.map((s) => (
                <div
                  key={s.label}
                  className="group relative border border-paper/10 bg-paper/[0.03] p-6 backdrop-blur-sm transition hover:border-ochre/40"
                >
                  <s.icon className={`h-5 w-5 ${s.tint}`} />
                  <div className="mt-12 font-display text-5xl font-semibold tracking-tight text-paper">
                    {s.value}
                  </div>
                  <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.22em] text-paper/60">
                    {s.label}
                  </div>
                  <div className="absolute right-4 top-4 font-mono text-[9px] text-paper/30">
                    ◆
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* TIMELINE */}
          <div className="mt-24">
            <div className="mb-10 flex items-end justify-between">
              <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-ochre">
                § 02.1 · Field Log
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-paper/40">
                5 entries · 8 years
              </span>
            </div>
            <ol className="relative space-y-0 border-l border-paper/15 pl-8">
              {milestones.map((m) => (
                <li
                  key={m.year}
                  data-reveal
                  className="group relative grid grid-cols-[80px_1fr] items-baseline gap-4 py-5"
                >
                  <span className="absolute -left-[34px] top-7 h-2.5 w-2.5 rounded-full border-2 border-moss-deep bg-ochre transition group-hover:scale-125" />
                  <span className="font-mono text-sm tracking-widest text-ochre">{m.year}</span>
                  <p className="text-base leading-relaxed text-paper/80">{m.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* TEAM */}
      <section ref={teamRef} className="bg-paper py-28 sm:py-36">
        <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-10">
          <div className="mb-14 grid items-end gap-6 sm:grid-cols-[1fr_auto]">
            <div>
              <span className="stamp inline-flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-rust" />
                § 03 · The Crew
              </span>
              <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight text-ink sm:text-6xl">
                Small team, <em className="text-rust">big heart</em>.
              </h2>
            </div>
            <p className="max-w-md text-base text-ink/70">
              We keep the team lean on purpose. The people who answer your email are the
              people who'll be on the trail with you.
            </p>
          </div>

          <div data-tcards className="grid gap-6 md:grid-cols-3">
            {team.map((m) => (
              <article
                key={m.name}
                data-tcard
                className="group lift paper-card overflow-hidden"
              >
                <div className={`relative h-40 bg-gradient-to-br ${m.accent}`}>
                  <svg
                    aria-hidden
                    className="absolute inset-0 h-full w-full opacity-[0.18]"
                    viewBox="0 0 400 160"
                    preserveAspectRatio="none"
                  >
                    <path
                      d="M0 120 Q100 80 200 110 T400 100 M0 140 Q100 100 200 130 T400 120"
                      stroke="#f3ede0"
                      strokeWidth="1.2"
                      fill="none"
                    />
                  </svg>
                  <div className="absolute bottom-3 left-4 font-mono text-[10px] uppercase tracking-[0.22em] text-paper/80">
                    ID · {m.name.split(" ")[0].toUpperCase()}
                  </div>
                  <div className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-paper/15 backdrop-blur">
                    <Footprints className="h-4 w-4 text-paper" />
                  </div>
                </div>
                <div className="space-y-4 p-6">
                  <div>
                    <h3 className="font-display text-xl font-semibold text-ink">{m.name}</h3>
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-rust">
                      {m.role}
                    </p>
                  </div>
                  <p className="text-sm leading-relaxed text-ink/70">{m.bio}</p>
                  <div className="flex flex-wrap gap-1.5 border-t border-ink/10 pt-4">
                    {m.tags.map((t) => (
                      <span
                        key={t}
                        className="rounded-full border border-ink/15 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-ink/60"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* VIDEO SECTION */}
      <VideoSection />

      {/* TESTIMONIAL STRIP */}
      <section className="relative overflow-hidden bg-paper-deep py-20">
        <div className="mx-auto max-w-4xl px-6 text-center sm:px-8">
          <Star className="mx-auto mb-4 h-7 w-7 fill-ochre text-ochre" />
          <blockquote className="font-display text-2xl font-medium leading-snug text-ink sm:text-3xl">
            "Badr Adventures gave my family a way back into the outdoors. The pace is gentle,
            the food is amazing, and the kids are still talking about the campfire."
          </blockquote>
          <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.22em] text-ink/60">
            — Aisha, Lake District weekend, summer 2025
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden bg-ink py-24 text-paper">
        <div className="pointer-events-none absolute inset-0 opacity-[0.06] bg-topo" />
        <div className="relative mx-auto max-w-5xl px-6 sm:px-8">
          <div className="grid items-center gap-8 sm:grid-cols-[1fr_auto]">
            <div>
              <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-ochre">
                § 04 · Departure
              </span>
              <h2 className="mt-3 font-display text-4xl font-semibold leading-tight text-paper sm:text-5xl">
                Find a hike that fits your weekend.
              </h2>
              <p className="mt-3 max-w-xl text-paper/70">
                Browse the calendar, pick a date, and book in under a minute. We hold spots for
                solo hikers, families, and friend groups.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/hikes"
                className="group inline-flex items-center gap-2 rounded-full bg-ochre px-6 py-3 text-sm font-medium text-ink shadow-lg shadow-ochre/30 transition hover:bg-ochre/90"
              >
                See upcoming hikes
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 rounded-full border border-paper/30 bg-paper/5 px-6 py-3 text-sm font-medium text-paper backdrop-blur transition hover:border-paper/50 hover:bg-paper/10"
              >
                Talk to the team
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function VideoSection() {
  const ref = useRef<HTMLVideoElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    const cleanup = ref.current ? initReveal(ref.current) : undefined;
    // Lazy-load the heavy MP4 only when the player scrolls into view,
    // and tear it down on leave to free memory.
    const v = videoRef.current;
    let io: IntersectionObserver | null = null;
    if (v) {
      io = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (e.isIntersecting) {
              v.play().catch(() => {});
            } else {
              v.pause();
            }
          }
        },
        { rootMargin: "200px 0px", threshold: 0.05 },
      );
      io.observe(v);
    }
    return () => {
      cleanup?.then?.((fn) => fn?.());
      io?.disconnect();
    };
  }, []);

  return (
    <section ref={ref} className="relative overflow-hidden bg-ink py-24 sm:py-32">
      <div className="pointer-events-none absolute inset-0 opacity-[0.05] bg-topo" />
      <div className="relative mx-auto max-w-7xl px-6 sm:px-8 lg:px-10">
        <div className="mb-10 grid items-end gap-6 sm:grid-cols-[1fr_auto]">
          <div data-reveal>
            <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-ochre">
              § 03.5 · On the Trail
            </span>
            <h2 className="mt-3 font-display text-4xl font-semibold leading-tight text-paper sm:text-5xl">
              Field footage, <em className="text-ochre">unedited</em>.
            </h2>
            <p className="mt-3 max-w-xl text-paper/70">
              Three minutes from a recent Lake District weekend. No music, no drone shots — just
              boots, rain, and the kettle going on at camp.
            </p>
          </div>
          <div data-reveal className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-paper/50">
            <span className="h-1.5 w-1.5 rounded-full bg-rust animate-pulse" />
            Recorded · Sept 2025
          </div>
        </div>

        <div data-reveal className="relative overflow-hidden border border-paper/10 bg-paper/5 shadow-2xl">
          <div className="aspect-video w-full">
            <video
              ref={videoRef}
              className="h-full w-full object-cover"
              poster="/images/hero-mountains.jpg"
              preload="none"
              muted
              loop
              playsInline
              controls
              crossOrigin="anonymous"
            >
              <source
                src="/videos/lake-district-trail.mp4"
                type="video/mp4"
              />
              Sorry, your browser doesn't support embedded video.
            </video>
          </div>
          {/* Edge overlays so the video blends with the dark section */}
          <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-ink/80 to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-ink/80 to-transparent" />
        </div>

        <div data-reveal className="mt-6 flex flex-wrap items-center justify-between gap-4 font-mono text-[10px] uppercase tracking-[0.22em] text-paper/50">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-ochre" /> Lake District · UK
            </span>
            <span className="flex items-center gap-1.5">
              <Mountain className="h-3.5 w-3.5 text-ochre" /> Helvellyn ridge
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-ochre" /> 3 days · 12 hikers
            </span>
          </div>
          <span>MP4 · autoplay-on-scroll</span>
        </div>
      </div>
    </section>
  );
}
