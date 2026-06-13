import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, Filter, MapPin, Search, Star, Users } from "lucide-react";
import { api, formatGbp, formatShortDate } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  image: string;
  pricePence: number;
  spotsLeft: number;
  spotsTotal: number;
  tags: string[];
  guide: string;
};

export default function HikesPage() {
  const [hikes, setHikes] = useState<Hike[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [difficulty, setDifficulty] = useState<string>("all");

  useEffect(() => {
    let mounted = true;
    api<{ hikes: Hike[] }>("/api/hikes")
      .then((res) => mounted && setHikes(res.hikes))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load hikes"))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    return hikes.filter((h) => {
      if (difficulty !== "all" && h.difficulty !== difficulty) return false;
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return (
        h.title.toLowerCase().includes(q) ||
        h.location.toLowerCase().includes(q) ||
        h.region.toLowerCase().includes(q) ||
        h.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [hikes, query, difficulty]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge className="bg-emerald-100 text-emerald-800">All hikes</Badge>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">
            Find your next adventure
          </h1>
          <p className="mt-2 max-w-2xl text-stone-600">
            Filter by difficulty, search by region, or just scroll the full calendar. Every
            hike below has live availability and a small-group guarantee.
          </p>
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by region, location, or tag…"
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2 text-sm text-stone-500">
          <Filter className="h-4 w-4" />
          <Tabs value={difficulty} onValueChange={setDifficulty}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="Easy">Easy</TabsTrigger>
              <TabsTrigger value="Moderate">Moderate</TabsTrigger>
              <TabsTrigger value="Challenging">Challenging</TabsTrigger>
              <TabsTrigger value="Strenuous">Strenuous</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-80 animate-pulse rounded-2xl border border-stone-200 bg-white"
              />
            ))
          : filtered.length === 0
            ? (
                <Card className="col-span-full">
                  <CardContent className="flex flex-col items-center gap-2 p-10 text-center">
                    <p className="text-lg font-medium text-stone-700">No hikes match your filters.</p>
                    <p className="text-sm text-stone-500">Try a different region or difficulty.</p>
                  </CardContent>
                </Card>
              )
            : filtered.map((hike) => (
                <Card key={hike.id} className="overflow-hidden border-stone-200/80 bg-white transition-shadow hover:shadow-xl">
                  <div className="relative h-44 w-full overflow-hidden">
                    <img
                      src={hike.image}
                      alt={hike.title}
                      className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                    />
                    <div className="absolute left-3 top-3 flex flex-wrap gap-1">
                      {hike.tags.slice(0, 2).map((tag) => (
                        <Badge key={tag} className="bg-white/90 text-stone-800">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <div className="absolute right-3 top-3">
                      <Badge className="bg-amber-400 text-stone-900 hover:bg-amber-400">
                        <Star className="mr-1 h-3 w-3 fill-current" />
                        {hike.difficulty}
                      </Badge>
                    </div>
                  </div>
                  <CardContent className="space-y-3 p-5">
                    <div className="flex items-center justify-between text-xs text-stone-500">
                      <span className="flex items-center gap-1">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {formatShortDate(hike.date)}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {hike.location}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-stone-900">{hike.title}</h3>
                    <p className="text-sm text-stone-600">{hike.summary}</p>
                    <div className="flex items-center gap-2 text-xs text-stone-500">
                      <Users className="h-3.5 w-3.5" />
                      {hike.spotsLeft > 0 ? `${hike.spotsLeft} of ${hike.spotsTotal} spots left` : "Waitlist only"}
                    </div>
                    <div className="flex items-center justify-between border-t border-stone-100 pt-3">
                      <div className="text-sm">
                        <span className="text-base font-semibold text-emerald-800">
                          {hike.pricePence === 0 ? "Free" : formatGbp(hike.pricePence)}
                        </span>
                        <span className="text-stone-500"> · {hike.duration}</span>
                      </div>
                      <Button asChild size="sm" className="bg-emerald-900 hover:bg-emerald-800">
                        <Link to={`/hikes/${hike.id}`}>Book</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
      </div>
    </div>
  );
}
