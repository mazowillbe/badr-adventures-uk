// Reusable GSAP animation helpers.
//
// Each init* function takes a root HTMLElement and options, dynamically
// imports gsap, runs the animation, and returns a cleanup function.
// All helpers respect prefers-reduced-motion.

import type gsap from "gsap";
import type { ScrollTrigger as ScrollTriggerType } from "gsap/ScrollTrigger";

let gsapMod: typeof gsap | null = null;
let stMod: typeof ScrollTriggerType | null = null;
let readyPromise: Promise<void> | null = null;

function ensureGsap() {
  if (!readyPromise) {
    readyPromise = (async () => {
      const g = await import("gsap");
      const s = await import("gsap/ScrollTrigger");
      gsapMod = g.default ?? (g as unknown as typeof gsap);
      stMod = s.ScrollTrigger;
      gsapMod.registerPlugin(stMod);
    })();
  }
  return readyPromise;
}

const SAFE_NAV =
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export type RevealOptions = {
  scope?: string;
  childSelector?: string;
};

/** Fade-and-rise reveal for every `[data-reveal]` element inside `root`. */
export async function initReveal(
  root: HTMLElement,
  _opts: RevealOptions = {},
): Promise<() => void> {
  if (SAFE_NAV || !root) return () => {};
  await ensureGsap();
  if (!gsapMod || !stMod) return () => {};
  const ctx = gsapMod.context(() => {
    const targets = root.querySelectorAll<HTMLElement>("[data-reveal]");
    targets.forEach((el) => {
      const delay = Number(el.dataset.revealDelay ?? 0) / 1000;
      gsapMod!.fromTo(
        el,
        { opacity: 0, y: 32 },
        {
          opacity: 1,
          y: 0,
          duration: 1,
          delay,
          ease: "expo.out",
          scrollTrigger: { trigger: el, start: "top 85%", once: true },
        },
      );
    });
  }, root);
  return () => ctx.revert();
}

/** Staggered fade-up for a group of children (selectors you pass in). */
export async function initRevealStagger(
  root: HTMLElement,
  opts: { selector: string; stagger?: number; y?: number; start?: string } = { selector: "" },
): Promise<() => void> {
  if (SAFE_NAV || !root) return () => {};
  await ensureGsap();
  if (!gsapMod || !stMod) return () => {};
  const ctx = gsapMod.context(() => {
    const targets = root.querySelectorAll<HTMLElement>(opts.selector);
    gsapMod!.fromTo(
      targets,
      { opacity: 0, y: opts.y ?? 40 },
      {
        opacity: 1,
        y: 0,
        duration: 1,
        ease: "expo.out",
        stagger: opts.stagger ?? 0.1,
        scrollTrigger: { trigger: root, start: opts.start ?? "top 80%", once: true },
      },
    );
  }, root);
  return () => ctx.revert();
}

/** Subtle parallax on a child of `root` with [data-parallax]. */
export async function initParallax(
  root: HTMLElement,
  _opts: { selector?: string; strength?: number } = {},
): Promise<() => void> {
  if (SAFE_NAV || !root) return () => {};
  await ensureGsap();
  if (!gsapMod || !stMod) return () => {};
  const ctx = gsapMod.context(() => {
    const img = root.querySelector<HTMLElement>(".parallax-img");
    if (img) {
      gsapMod!.to(img, {
        yPercent: 12,
        ease: "none",
        scrollTrigger: {
          trigger: root,
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      });
    }
  }, root);
  return () => ctx.revert();
}

/** Slow continuous rotation on an element marked [data-spin]. */
export async function initSpin(
  root: HTMLElement,
  _opts: { duration?: number } = {},
): Promise<() => void> {
  if (SAFE_NAV || !root) return () => {};
  await ensureGsap();
  if (!gsapMod) return () => {};
  const ctx = gsapMod.context(() => {
    const el = root.querySelector("[data-spin]");
    if (el) {
      gsapMod!.to(el, {
        rotation: 360,
        ease: "none",
        duration: 80,
        repeat: -1,
        transformOrigin: "50% 50%",
      });
    }
  }, root);
  return () => ctx.revert();
}

/**
 * Hero scene — staggered reveal of `[data-hero]` children + parallax on
 * the background image.
 */
export async function initHeroScene(
  root: HTMLElement,
  _opts: { stagger?: number } = {},
): Promise<() => void> {
  if (SAFE_NAV || !root) return () => {};
  await ensureGsap();
  if (!gsapMod || !stMod) return () => {};
  const ctx = gsapMod.context(() => {
    const tl = gsapMod!.timeline({ defaults: { ease: "expo.out" } });
    tl.fromTo(
      root.querySelectorAll("[data-hero]"),
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 1, stagger: 0.12 },
      0,
    );
    const img = root.querySelector<HTMLElement>(".parallax-img");
    if (img) {
      gsapMod!.to(img, {
        yPercent: 14,
        ease: "none",
        scrollTrigger: {
          trigger: root,
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      });
    }
  }, root);
  return () => ctx.revert();
}
