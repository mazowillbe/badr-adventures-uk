// Parser for freeform hike descriptions sent over Telegram.
//
// The admin doesn't have to learn a schema — they can type something like
//   "Yorkshire Dales 3 day trek, £85, hard, 12 spots, 2026-08-12, lead
//    by Abu Jabal. Family friendly. /images/hike-mountain.jpg"
// and the parser extracts the fields. Anything missing becomes a
// ValidationError that gets sent back to the admin in Telegram so they
// can fix and resend.

export type ParsedHike = {
  title: string;
  location: string;
  region: string;
  date: string; // YYYY-MM-DD
  duration: string;
  difficulty: "Easy" | "Moderate" | "Challenging" | "Strenuous";
  spotsTotal: number;
  priceGbp: number;
  summary: string;
  description: string;
  image: string;
  hero: string;
  tags: string[];
  guide: string;
};

export type ParseError = { field: string; message: string };

export type ParseResult = { ok: true; hike: ParsedHike } | { ok: false; errors: ParseError[] };

const KNOWN_DIFFICULTIES = ["Easy", "Moderate", "Challenging", "Strenuous"] as const;
type Difficulty = (typeof KNOWN_DIFFICULTIES)[number];

// Words that, in front of a recognised difficulty, normalise casing.
const DIFF_PATTERN = new RegExp(
  `\\b(${KNOWN_DIFFICULTIES.join("|")}|easy|moderate|challenging|strenuous|hard|difficult|beginner|family[-\\s]?friendly)\\b`,
  "i",
);

// £15.00 / 15 / £15 / fifteen pounds / 15.50
const PRICE_PATTERN = /(?:£\s*)?(\d{1,4}(?:\.\d{1,2})?)/i;
const PRICE_UNIT = /£|gbp|pounds?|quid/i;

const DATE_PATTERN =
  /\b(\d{4}-\d{2}-\d{2})\b|(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\b/i;

const SPOTS_PATTERN = /\b(\d{1,3})\s*(?:spots?|places?|seats?|people|hikers)\b/i;

const DURATION_PATTERN = /(\d+\s*(?:day|days|night|nights)(?:\s*\/\s*\d+\s*night(?:s)?)?)/i;

const IMAGE_PATTERN = /(\/images\/[\w.-]+\.(?:jpg|jpeg|png|webp))/i;

const GUIDE_PATTERN =
  /(?:led by|lead(?:ing)?(?:\s+guide)?|guide(?:\s+is)?|with guide)\s+([A-Z][a-zA-Z][\w\s'-]{1,30})/i;

const KNOWN_REGIONS = [
  "Peak District",
  "Lake District",
  "Yorkshire Dales",
  "Snowdonia",
  "Brecon Beacons",
  "Scottish Highlands",
  "Dartmoor",
  "Pembrokeshire",
  "Cornwall",
  "Norfolk",
  "Suffolk",
  "New Forest",
  "South Downs",
  "Cotswolds",
  "Isle of Skye",
  "Cairngorms",
  "Pitons",
  "Hadrian's Wall",
];

const TITLE_CLEAN = /^(?:new hike|add hike|hike:|hike)\s*[:\-]?\s*/i;

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function normaliseDate(raw: string): string | null {
  // Already ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  // d/m/y or d-m-y
  const m = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (!m) return null;
  let [, d, mo, y] = m;
  if (y.length === 2) y = `20${y}`;
  const day = d.padStart(2, "0");
  const month = mo.padStart(2, "0");
  if (Number(y) < 2000 || Number(y) > 2100) return null;
  if (Number(month) < 1 || Number(month) > 12) return null;
  if (Number(day) < 1 || Number(day) > 31) return null;
  return `${y}-${month}-${day}`;
}

function normaliseDifficulty(raw: string): Difficulty | null {
  const r = raw.toLowerCase().replace(/\s+/g, "");
  if (r === "easy" || r === "beginner" || r === "family-friendly" || r === "familyfriendly") {
    return "Easy";
  }
  if (r === "moderate" || r === "medium") return "Moderate";
  if (r === "challenging" || r === "hard" || r === "difficult") return "Challenging";
  if (r === "strenuous" || r === "tough" || r === "extreme") return "Strenuous";
  return null;
}

function inferDifficultyFromText(text: string): Difficulty | null {
  const lower = text.toLowerCase();
  if (/\b(strenuous|extreme|tough|very hard|epic)\b/.test(lower)) return "Strenuous";
  if (/\b(challenging|hard|difficult|advanced)\b/.test(lower)) return "Challenging";
  if (/\b(moderate|medium|intermediate)\b/.test(lower)) return "Moderate";
  if (/\b(easy|beginner|gentle|family|introduction)\b/.test(lower)) return "Easy";
  return null;
}

function inferRegion(text: string): string | null {
  for (const r of KNOWN_REGIONS) {
    if (text.toLowerCase().includes(r.toLowerCase())) return r;
  }
  return null;
}

function extractTags(text: string): string[] {
  const tags: string[] = [];
  const lower = text.toLowerCase();
  const candidates: Array<[RegExp, string]> = [
    [/\bfamily[-\s]?friendly\b/, "Family friendly"],
    [/\bweekend\b/, "Weekend"],
    [/\bcamping\b|\bcamp\b|\bwild[-\s]?camp\b/, "Camping"],
    [/\bsummit\b/, "Summit"],
    [/\bwater\b|\bkayak\b|\bcoast\b/, "Water sports"],
    [/\bbeginner\b/, "Beginner"],
    [/\bmulti[-\s]?day\b/, "Multi-day"],
    [/\bday[-\s]?hike\b/, "Day hike"],
  ];
  for (const [re, tag] of candidates) {
    if (re.test(lower)) tags.push(tag);
  }
  return Array.from(new Set(tags));
}

function deriveTitle(text: string, region: string | null): string {
  // Try to use the first line as the title if it's short and looks like one
  const firstLine = text.split(/\n/)[0]?.replace(TITLE_CLEAN, "").trim() ?? "";
  if (firstLine && firstLine.length <= 80 && !DATE_PATTERN.test(firstLine)) {
    return titleCase(firstLine.replace(/[.!?]+$/, ""));
  }
  // Fall back to a generic title using region + duration
  const regionPart = region ? titleCase(region) : "New Hike";
  return `${regionPart} Hike`;
}

function deriveSummary(text: string, title: string): string {
  // Take the first sentence (or the whole first line if no punctuation)
  const cleaned = text.replace(TITLE_CLEAN, "").trim();
  const firstSentence = cleaned.split(/[.\n]/)[0]?.trim();
  if (firstSentence && firstSentence.length > 5 && firstSentence.length < 200) {
    return firstSentence + (firstSentence.endsWith(".") ? "" : ".");
  }
  return `${title} — new Badr Adventures trip.`;
}

function deriveId(title: string, date: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return `${slug || "hike"}-${date}`;
}

export function parseHikeText(input: string, options?: { imageHint?: string }): ParseResult {
  const errors: ParseError[] = [];
  const text = input.trim();
  if (!text) {
    return { ok: false, errors: [{ field: "input", message: "Empty message." }] };
  }

  // Date
  let date: string | null = null;
  const dateMatch = text.match(DATE_PATTERN);
  if (dateMatch) {
    date = normaliseDate(dateMatch[1] ?? dateMatch[2] ?? "");
    if (!date) {
      errors.push({ field: "date", message: `Couldn't parse date "${dateMatch[0]}". Use YYYY-MM-DD.` });
    }
  } else {
    errors.push({
      field: "date",
      message: "No date found. Add a date like 2026-08-12.",
    });
  }

  // Price
  let priceGbp = 0;
  const priceMatch = text.match(new RegExp(`${PRICE_PATTERN.source}\\s*(?:${PRICE_UNIT.source})?|£\\s*(\\d+(?:\\.\\d{1,2})?)`, "i"));
  if (priceMatch) {
    const num = priceMatch[1] ?? priceMatch[2];
    const n = Number(num);
    if (!Number.isNaN(n) && n >= 0 && n < 100000) {
      priceGbp = Math.round(n * 100) / 100;
    }
  } else {
    // No price mentioned — default to 0 (free) and don't error
    priceGbp = 0;
  }

  // Spots
  let spotsTotal = 12;
  const spotsMatch = text.match(SPOTS_PATTERN);
  if (spotsMatch) {
    const n = Number(spotsMatch[1]);
    if (n > 0 && n <= 200) spotsTotal = n;
  }

  // Difficulty
  let difficulty: Difficulty | null = null;
  const diffMatch = text.match(DIFF_PATTERN);
  if (diffMatch) {
    difficulty = normaliseDifficulty(diffMatch[1]);
  }
  if (!difficulty) {
    difficulty = inferDifficultyFromText(text);
  }
  if (!difficulty) {
    errors.push({
      field: "difficulty",
      message: `Couldn't tell difficulty. Use one of: ${KNOWN_DIFFICULTIES.join(", ")} (or "easy", "hard", "family-friendly").`,
    });
  }

  // Duration
  let duration = "Full day";
  const durMatch = text.match(DURATION_PATTERN);
  if (durMatch) duration = titleCase(durMatch[1].replace(/\s+/g, " ").trim());

  // Region
  let region = inferRegion(text);
  if (!region) {
    // try first word after "in" / "to" / comma
    const m = text.match(/\b(?:in|at|to)\s+([A-Z][\w\s'-]{2,30}?)(?:\.|,|\n| on\b)/);
    if (m) region = titleCase(m[1].trim());
  }
  if (!region) {
    errors.push({
      field: "region",
      message: `Couldn't tell the region. Mention one of: ${KNOWN_REGIONS.join(", ")}.`,
    });
  }

  // Guide
  let guide = "Abu Jabal";
  const guideMatch = text.match(GUIDE_PATTERN);
  if (guideMatch) {
    const name = guideMatch[1].trim().split(/\s+/).slice(0, 3).join(" ");
    if (name) guide = titleCase(name);
  }

  // Image
  let image = "/images/hero-mountains.jpg";
  const imgMatch = text.match(IMAGE_PATTERN);
  if (imgMatch) {
    image = imgMatch[1];
  } else if (options?.imageHint) {
    image = options.imageHint;
  }

  // Title
  const title = deriveTitle(text, region);

  // Location: if we know the region, just use it; otherwise first plausible
  // place mentioned in caps or in quotes
  let location = region ?? "";
  if (!location) {
    const m = text.match(/["']([^"']{2,40})["']/);
    if (m) location = titleCase(m[1]);
  }

  // Summary + description
  const summary = deriveSummary(text, title);
  const description = summary.length + 2 < text.length ? text : summary;

  // Tags
  const tags = extractTags(text);

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    hike: {
      id: deriveId(title, date!),
      title,
      location: location || region || "UK",
      region: region || "UK",
      date: date!,
      duration,
      difficulty: difficulty!,
      spotsTotal,
      priceGbp,
      summary,
      description,
      image,
      hero: image,
      tags,
      guide,
    },
  };
}
