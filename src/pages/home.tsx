import { Sparkles } from "lucide-react";
import Hero from "@/components/hero";
import FeaturedRoutes from "@/components/featured-routes";
import FieldManifesto from "@/components/field-manifesto";
import Voices from "@/components/voices";
import DepartureCta from "@/components/departure-cta";
import { Badge } from "@/components/ui/badge";

export default function HomePage() {
  return (
    <div className="bg-paper text-ink overflow-hidden">
      <Hero />

      {/* FIELD NOTES — a small editorial seam between the hero and the routes,
          so the page doesn't just feel like a sales landing. */}
      <section className="border-y border-ink/10 bg-paper-2/40 py-10">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-8 gap-y-3 px-4 text-xs font-mono uppercase tracking-[0.18em] text-ink-2 sm:px-6 lg:px-8">
          <span className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-rust" />
            Est. since the first map & fold
          </span>
          <span className="text-ink-3">·</span>
          <span>42 routes plotted</span>
          <span className="text-ink-3">·</span>
          <span>3 guides · 0 roped accidents</span>
          <span className="text-ink-3">·</span>
          <span>Open all year · Rain or sun</span>
          <Badge
            variant="outline"
            className="ml-auto border-ink/20 bg-transparent font-mono text-[10px] tracking-[0.18em] text-ink-2"
          >
            <Sparkles className="mr-1 h-3 w-3 text-rust" />
            Bringing green to your deen
          </Badge>
        </div>
      </section>

      <FeaturedRoutes />
      <FieldManifesto />
      <Voices />
      <DepartureCta />
    </div>
  );
}
