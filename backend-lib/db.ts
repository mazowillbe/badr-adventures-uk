import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import bcrypt from "bcryptjs";

const DB_PATH = process.env.DB_PATH || "./data/badr.sqlite";
mkdirSync(dirname(DB_PATH), { recursive: true });

export const db = new Database(DB_PATH);
db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA foreign_keys = ON;");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    is_admin INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS hikes (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    location TEXT NOT NULL,
    region TEXT NOT NULL,
    date TEXT NOT NULL,
    duration TEXT NOT NULL,
    difficulty TEXT NOT NULL,
    spots_total INTEGER NOT NULL,
    spots_left INTEGER NOT NULL,
    price_pence INTEGER NOT NULL,
    summary TEXT NOT NULL,
    description TEXT NOT NULL,
    image TEXT NOT NULL,
    hero TEXT NOT NULL,
    tags TEXT NOT NULL,
    guide TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    hike_id TEXT NOT NULL,
    party_size INTEGER NOT NULL,
    status TEXT NOT NULL,
    payment_status TEXT NOT NULL DEFAULT 'unpaid',
    total_pence INTEGER NOT NULL,
    stripe_session_id TEXT,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (hike_id) REFERENCES hikes(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS contact_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    subject TEXT,
    message TEXT NOT NULL,
    user_id INTEGER,
    consented_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
  );

  CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id);
  CREATE INDEX IF NOT EXISTS idx_bookings_hike ON bookings(hike_id);
  CREATE INDEX IF NOT EXISTS idx_messages_user ON contact_messages(user_id);

  CREATE TABLE IF NOT EXISTS equipment (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,          -- 'tent' | 'bnb' | 'gear'
    name TEXT NOT NULL,
    summary TEXT NOT NULL,
    description TEXT NOT NULL,
    location TEXT,
    image TEXT NOT NULL,
    price_pence INTEGER NOT NULL,   -- per night (tents, B&B) or per day (gear)
    unit_label TEXT NOT NULL,       -- 'per night', 'per stay', 'per day'
    capacity INTEGER,                -- guests per unit (tents, B&B rooms)
    total_units INTEGER NOT NULL,
    available_units INTEGER NOT NULL,
    features TEXT,                  -- comma-separated
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS equipment_bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    equipment_id TEXT NOT NULL,
    start_date TEXT NOT NULL,        -- ISO yyyy-mm-dd
    end_date TEXT NOT NULL,          -- ISO yyyy-mm-dd (inclusive)
    nights INTEGER NOT NULL,
    units INTEGER NOT NULL,
    guests INTEGER NOT NULL,
    total_pence INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- pending | confirmed | cancelled
    payment_status TEXT NOT NULL DEFAULT 'unpaid',
    stripe_session_id TEXT,
    notes TEXT,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_eb_user ON equipment_bookings(user_id);
  CREATE INDEX IF NOT EXISTS idx_eb_equipment ON equipment_bookings(equipment_id);

  CREATE TABLE IF NOT EXISTS telegram_allowlist (
    chat_id TEXT PRIMARY KEY,           -- Telegram chat id (string to be safe)
    label  TEXT,                        -- optional human label, e.g. "Jeff's phone"
    added_at INTEGER NOT NULL,
    added_by TEXT                       -- admin email that added it
  );
`);

function seedTelegramAllowlist() {
  // Seed the bootstrap chat id from env so the admin never locks themselves
  // out. The env var remains the source of truth for the *initial* admin;
  // once a row exists, the admin UI is in charge.
  const envChat = process.env.TELEGRAM_ADMIN_CHAT;
  if (!envChat) return;
  const existing = db
    .query<{ c: number }, []>("SELECT COUNT(*) as c FROM telegram_allowlist")
    .get();
  if (existing && existing.c > 0) return;
  db.run(
    "INSERT OR IGNORE INTO telegram_allowlist (chat_id, label, added_at, added_by) VALUES (?, ?, ?, ?)",
    [envChat, "Bootstrap (from env)", Date.now(), "system"],
  );
}
seedTelegramAllowlist();

function seedAdmin() {
  const adminEmail = (process.env.ADMIN_EMAIL || "jefferygo0o@gmail.com").toLowerCase();
  const existing = db
    .query<{ id: number }, [string]>("SELECT id FROM users WHERE email = ?")
    .get(adminEmail);
  if (existing) return;
  const password = process.env.ADMIN_BOOTSTRAP_PASSWORD || "ChangeMe!2026";
  const hash = bcrypt.hashSync(password, 12);
  db.run(
    "INSERT INTO users (email, name, password_hash, is_admin, created_at) VALUES (?, ?, ?, 1, ?)",
    [adminEmail, "Badr Admin", hash, Date.now()],
  );
  // eslint-disable-next-line no-console
  console.log(
    `[bootstrap] admin user ${adminEmail} created with bootstrap password: ${password}. Change it after first login.`,
  );
}

function seedHikes() {
  const count = db.query<{ c: number }, []>("SELECT COUNT(*) as c FROM hikes").get();
  if (count && count.c > 0) return;

  const seeds = [
    {
      id: "kinder-scout",
      title: "Kinder Scout Day Hike",
      location: "Peak District, England",
      region: "Peak District",
      date: "2026-06-21",
      duration: "Full day",
      difficulty: "Moderate",
      spots_total: 14,
      spots_left: 14,
      price_pence: 1500,
      summary:
        "Cross the iconic plateau of Kinder Scout and stand on the highest point in the Peak District.",
      description:
        "We start at Edale and follow the Jacob's Ladder route up onto the Kinder plateau. Expect gritstone steps, a short scramble, wide-open moorland, and sweeping views towards Manchester and the Dark Peak. We return via the Sett Valley and finish in Edale for a hot meal together. Pace is steady, breaks are generous, and the day is suitable for anyone with a basic level of fitness.",
      image: "/images/hike-mountain.jpg",
      hero: "/images/hero-mountains.jpg",
      tags: "Day hike,Peak District,Moderate",
      guide: "Abu Jabal",
    },
    {
      id: "malham-cove",
      title: "Malham Cove Day Hike",
      location: "Yorkshire Dales, England",
      region: "Yorkshire Dales",
      date: "2026-07-12",
      duration: "Full day",
      difficulty: "Easy to moderate",
      spots_total: 18,
      spots_left: 18,
      price_pence: 1500,
      summary:
        "Walk the limestone pavement above Malham Cove, with optional stop at Janet's Foss waterfall.",
      description:
        "A classic Yorkshire Dales day. We start in the village, walk up to the dramatic limestone amphitheatre of Malham Cove, then continue along the clifftop path past the dry valleys and on to Malham Tarn. The return loop drops through the woodland to Janet's Foss, a hidden gem. Family-friendly and an ideal first hike with us.",
      image: "/images/hike-lake.jpg",
      hero: "/images/hero-mountains.jpg",
      tags: "Day hike,Yorkshire,Family friendly",
      guide: "Abu Jabal",
    },
    {
      id: "snowdon-summit",
      title: "Snowdon Summit Hike",
      location: "Snowdonia, Wales",
      region: "Snowdonia",
      date: "2026-08-09",
      duration: "Full day",
      difficulty: "Strenuous",
      spots_total: 12,
      spots_left: 12,
      price_pence: 2500,
      summary: "Reach the highest peak in Wales via the Llanberis Path, the most accessible route to the summit.",
      description:
        "A steady, supportive climb to the top of Yr Wyddfa. We take the Llanberis Path, the longest but gentlest of the main routes, with plenty of short breaks and a longer stop at the summit. We end the day with a group meal in Llanberis.",
      image: "/images/hike-pano.jpg",
      hero: "/images/hero-mountains.jpg",
      tags: "Summit,Wales,Strenuous",
      guide: "Abu Jabal",
    },
    {
      id: "lakes-glaramara",
      title: "Lake District Glaramara Traverse",
      location: "Lake District, England",
      region: "Lake District",
      date: "2026-09-19",
      duration: "Full day",
      difficulty: "Strenuous",
      spots_total: 10,
      spots_left: 10,
      price_pence: 2200,
      summary: "Ridge walking above Borrowdale, with views of Great Gable, Scafell Pike, and Derwentwater.",
      description:
        "A proper mountain day for those who want to push. We start in Rosthwaite and traverse the Glaramara ridge, taking in a string of summits and a quiet, often-empty section of the Lake District. Terrain is rocky in places and the day is long — good fitness required.",
      image: "/images/hike-lake.jpg",
      hero: "/images/hero-mountains.jpg",
      tags: "Ridge,Lake District,Strenuous",
      guide: "Abu Jabal",
    },
    {
      id: "weekend-camp",
      title: "Weekend Wild Camp",
      location: "Peak District, England",
      region: "Peak District",
      date: "2026-08-23",
      duration: "2 days / 1 night",
      difficulty: "Moderate",
      spots_total: 16,
      spots_left: 16,
      price_pence: 9500,
      summary:
        "Two days of hiking, a fully set-up camp, hot meals, and stargazing. Bring nothing but a sleeping bag.",
      description:
        "A full weekend in the hills. We meet Saturday morning, hike to our camp spot, and everything is set up when you arrive: 8-person tents, air beds, blankets, controlled campfire, and hot food. Sunday is a shorter hike out and a debrief in the village. Perfect for first-time campers.",
      image: "/images/camp-sunset.jpg",
      hero: "/images/hero-mountains.jpg",
      tags: "Camping,Weekend,Family friendly",
      guide: "Abu Jabal",
    },
    {
      id: "kayak-day",
      title: "Lake Kayak Day",
      location: "Lake Windermere, England",
      region: "Lake District",
      date: "2026-07-26",
      duration: "Half day",
      difficulty: "Easy",
      spots_total: 12,
      spots_left: 12,
      price_pence: 5500,
      summary: "Guided kayak session on Lake Windermere. No prior experience needed.",
      description:
        "A relaxed half-day on the water. Our qualified guide will take you through the basics and we paddle a short loop along one of the quieter bays. All equipment included.",
      image: "/images/hero-camp.jpeg",
      hero: "/images/hero-mountains.jpg",
      tags: "Water sports,Lake District,Beginner",
      guide: "Abu Jabal",
    },
  ];

  const stmt = db.prepare(`
    INSERT INTO hikes (
      id, title, location, region, date, duration, difficulty,
      spots_total, spots_left, price_pence, summary, description,
      image, hero, tags, guide
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const h of seeds) {
    stmt.run(
      h.id,
      h.title,
      h.location,
      h.region,
      h.date,
      h.duration,
      h.difficulty,
      h.spots_total,
      h.spots_left,
      h.price_pence,
      h.summary,
      h.description,
      h.image,
      h.hero,
      h.tags,
      h.guide,
    );
  }
}

seedAdmin();
seedHikes();
seedEquipment();

function seedEquipment() {
  const exists = db
    .query<{ c: number }, []>("SELECT COUNT(*) as c FROM equipment")
    .get();
  if (exists && exists.c > 0) return;

  const items = [
    {
      id: "tent-2p",
      type: "tent",
      name: "2-Person Dome Tent",
      summary: "Lightweight 2-person dome, easy to pitch, perfect for couples and small groups.",
      description: "A reliable 2-person dome tent with taped seams, a small porch for boots and backpacks, and a footprint included. Fits two adults comfortably. We'll pitch it for you if you've booked a wild-camp weekend.",
      image: "/images/tent-camp.jpg",
      location: "Peak District",
      price_pence: 1800,
      unit_label: "per night",
      capacity: 2,
      total_units: 6,
      available_units: 6,
      features: "Free pitching on guided weekends,Footprint included",
    },
    {
      id: "tent-4p",
      type: "tent",
      name: "4-Person Family Tent",
      summary: "Standing-height 4-person tent with two rooms, ideal for families and small groups.",
      description: "A spacious 4-person tent with a separate bedroom compartment and a living area. Easy to pitch, plenty of ventilation, and a full-coverage rainfly. Recommended for family wild-camp weekends.",
      image: "/images/tent-camp.jpg",
      location: "Peak District",
      price_pence: 2800,
      unit_label: "per night",
      capacity: 4,
      total_units: 4,
      available_units: 4,
      features: "Two rooms,Full-coverage rainfly,Free pitching on guided weekends",
    },
    {
      id: "tent-group-8p",
      type: "tent",
      name: "8-Person Group Tent",
      summary: "Large canvas group tent for community weekends, retreats, and halaqahs.",
      description: "A traditional canvas 8-person group tent with a central pole and plenty of headroom. Used on all of our guided wild-camp weekends. Pitches in 10 minutes with two people.",
      image: "/images/tent-camp.jpg",
      location: "Peak District",
      price_pence: 4200,
      unit_label: "per night",
      capacity: 8,
      total_units: 3,
      available_units: 3,
      features: "Canvas,Central pole,Group size up to 8",
    },
    {
      id: "bnb-double",
      type: "bnb",
      name: "B&B Double Room",
      summary: "Private double room in our partner B&B in Castleton, with full English breakfast.",
      description: "A comfortable double room with en-suite bathroom in our partner B&B in the heart of Castleton. Includes a full English breakfast and a packed lunch for the trail. Perfect for the night before or after a Peak District weekend.",
      image: "/images/bnb-cottage.jpg",
      location: "Castleton, Peak District",
      price_pence: 9500,
      unit_label: "per night",
      capacity: 2,
      total_units: 4,
      available_units: 4,
      features: "En-suite,Full English breakfast,Packed lunch included",
    },
    {
      id: "bnb-twin",
      type: "bnb",
      name: "B&B Twin Room",
      summary: "Twin-bed room in our partner B&B in Castleton, ideal for friends hiking together.",
      description: "Twin beds in a quiet B&B room with en-suite. Full English breakfast and packed lunch included. The ideal base for a Peak District weekend if you don't fancy a tent.",
      image: "/images/bnb-cottage.jpg",
      location: "Castleton, Peak District",
      price_pence: 8500,
      unit_label: "per night",
      capacity: 2,
      total_units: 4,
      available_units: 4,
      features: "En-suite,Twin beds,Full English breakfast",
    },
    {
      id: "bnb-family",
      type: "bnb",
      name: "B&B Family Room",
      summary: "Family room sleeping four — two adults and up to two children, B&B + packed lunch.",
      description: "A family room with a double bed and bunk beds for up to two children under 12. Full English breakfast and packed lunches included. Travel cots available on request.",
      image: "/images/bnb-cottage.jpg",
      location: "Castleton, Peak District",
      price_pence: 13500,
      unit_label: "per night",
      capacity: 4,
      total_units: 2,
      available_units: 2,
      features: "Sleeps 2 adults + 2 children,Full English breakfast,Travel cots on request",
    },
    {
      id: "gear-stove",
      type: "gear",
      name: "Camping Stove & Fuel",
      summary: "Compact gas stove with a 220g canister, ready to use on the trail.",
      description: "A compact, lightweight gas stove plus a full 220g screw-thread canister. Enough fuel for 2-3 people for a weekend of hot meals.",
      image: "/images/equipment-gear.jpg",
      location: "Hired out",
      price_pence: 600,
      unit_label: "per day",
      capacity: 1,
      total_units: 12,
      available_units: 12,
      features: "220g canister,Lightweight,2-3 people for a weekend",
    },
    {
      id: "gear-sleeping",
      type: "gear",
      name: "Sleeping Bag (3-season)",
      summary: "3-season synthetic sleeping bag rated to -5C. Washed after every hire.",
      description: "A comfortable 3-season sleeping bag with a comfort rating of -5C. Suitable for UK wild camping from March to October. Washed and aired after every hire.",
      image: "/images/equipment-gear.jpg",
      location: "Hired out",
      price_pence: 700,
      unit_label: "per night",
      capacity: 1,
      total_units: 20,
      available_units: 20,
      features: "3-season,-5C comfort rating,Washed after every hire",
    },
    {
      id: "gear-mat",
      type: "gear",
      name: "Self-Inflating Sleep Mat",
      summary: "Comfortable self-inflating mat with a 5cm depth. Compact carry bag included.",
      description: "A 5cm self-inflating sleep mat for a comfortable night under canvas. Rolls up to roughly the size of a 1L bottle.",
      image: "/images/equipment-gear.jpg",
      location: "Hired out",
      price_pence: 500,
      unit_label: "per night",
      capacity: 1,
      total_units: 20,
      available_units: 20,
      features: "5cm depth,Compact carry bag",
    },
    {
      id: "gear-backpack",
      type: "gear",
      name: "40L Hiking Backpack",
      summary: "40-litre hiking pack with rain cover, hip-belt, and side pockets.",
      description: "A comfortable 40-litre hiking pack with padded hip-belt, ventilated back, side pockets, and an integrated rain cover. Suitable for day hikes and overnight wild-camp weekends.",
      image: "/images/equipment-gear.jpg",
      location: "Hired out",
      price_pence: 500,
      unit_label: "per day",
      capacity: 1,
      total_units: 15,
      available_units: 15,
      features: "40L,Rain cover,Padded hip-belt",
    },
  ];

  const stmt = db.prepare(`
    INSERT INTO equipment (
      id, type, name, summary, description, image, location,
      price_pence, unit_label, capacity, total_units, available_units, features, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const e of items) {
    stmt.run(
      e.id,
      e.type,
      e.name,
      e.summary,
      e.description,
      e.image,
      e.location,
      e.price_pence,
      e.unit_label,
      e.capacity,
      e.total_units,
      e.available_units,
      e.features,
      Date.now(),
    );
  }
}