import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  CalendarDays,
  CheckCircle2,
  Edit3,
  Mail,
  Mountain,
  Pencil,
  Plus,
  RefreshCcw,
  Save,
  Search,
  ShieldCheck,
  TrendingUp,
  Users,
  Wallet,
  X,
  Send,
  Trash2,
  Tent,
  Package,
} from "lucide-react";
import { api, formatDate, formatGbp } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/components/site-shell";
import { toast } from "sonner";

type Overview = {
  counts: {
    users: number;
    hikes: number;
    bookings: number;
    pending: number;
    paid: number;
    messages: number;
  };
  bookings: Array<{
    id: string;
    user_name: string;
    user_email: string;
    hike_title: string;
    party_size: number;
    total_pence: number;
    status: string;
    payment_status: string;
    created_at: number;
    hike_id: string;
  }>;
  messages: Array<{
    id: number;
    name: string;
    email: string;
    subject: string | null;
    message: string;
    created_at: number;
  }>;
};

type AdminHike = {
  id: string;
  title: string;
  location: string;
  region: string;
  date: string;
  duration: string;
  difficulty: string;
  price_pence: number;
  spots_left: number;
  spots_total: number;
  summary: string;
  description: string;
  image: string;
  hero: string;
  tags: string[];
  guide: string;
};

type AdminEquipment = {
  id: string;
  name: string;
  type: string;
  summary: string;
  description: string;
  image: string;
  location: string;
  capacity: number;
  pricePerNightPence: number;
  pricePerNightGbp: number;
  unitLabel: string;
  totalUnits: number;
  availableUnits: number;
  features: string[];
  active: boolean;
  createdAt: string;
};

const emptyHike: Partial<AdminHike> = {
  id: "", title: "", location: "", region: "", date: "", duration: "", difficulty: "Moderate",
  price_pence: 0, spots_total: 20, spots_left: 20, summary: "", description: "", image: "", hero: "",
  tags: [], guide: "",
};

const emptyEquipment: Partial<AdminEquipment> = {
  id: "", name: "", type: "tent", summary: "", description: "", image: "", location: "",
  capacity: 2, pricePerNightPence: 0, totalUnits: 2, availableUnits: 2, features: [],
};

export default function AdminPage() {
  const { user } = useAuth();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [hikes, setHikes] = useState<AdminHike[]>([]);
  const [equipment, setEquipment] = useState<AdminEquipment[]>([]);
  const [editingHike, setEditingHike] = useState<AdminHike | null>(null);
  const [creatingHike, setCreatingHike] = useState(false);
  const [editingEquip, setEditingEquip] = useState<AdminEquipment | null>(null);
  const [creatingEquip, setCreatingEquip] = useState(false);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    try {
      const [ov, hk, eq] = await Promise.all([
        api<Overview>("/api/admin/overview"),
        api<{ hikes: AdminHike[] }>("/api/hikes"),
        api<{ items: AdminEquipment[] }>("/api/equipment"),
      ]);
      setOverview(ov);
      setHikes(hk.hikes);
      setEquipment(eq.items);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load admin data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!user || !user.isAdmin) return;
    refresh();
  }, [user?.id]);

  if (!user) {
    return (
      <main className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-stone-900">Sign in required</h1>
        <p className="mt-2 text-stone-600">The admin dashboard is only for staff.</p>
        <Button asChild className="mt-6 bg-emerald-900 hover:bg-emerald-800">
          <Link to="/sign-in?next=/admin">Sign in</Link>
        </Button>
      </main>
    );
  }
  if (!user.isAdmin) {
    return (
      <main className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-stone-900">No access</h1>
        <p className="mt-2 text-stone-600">Your account is not an admin.</p>
      </main>
    );
  }

  const overviewBookings = overview?.bookings ?? [];
  const messages = overview?.messages ?? [];
  const messagesCount = overview?.counts.messages ?? messages.length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="inline-block rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-800">
            Admin
          </span>
          <h1 className="mt-3 text-2xl font-bold text-stone-900 sm:text-3xl">Operations dashboard</h1>
          <p className="text-stone-600">Manage hikes, equipment, bookings, and contact submissions.</p>
        </div>
        <Button variant="outline" onClick={refresh} disabled={loading}>
          <RefreshCcw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {overview && (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Total revenue" value={formatGbp(overviewBookings.reduce((sum, b) => sum + (b.total_pence || 0), 0))} icon={Wallet} tint="bg-emerald-100 text-emerald-800" />
          <Stat label="Bookings" value={overview.counts.bookings} icon={CalendarDays} tint="bg-amber-100 text-amber-800" />
          <Stat label="Pending" value={overview.counts.pending} icon={TrendingUp} tint="bg-rose-100 text-rose-800" />
          <Stat label="Members" value={overview.counts.users} icon={Users} tint="bg-sky-100 text-sky-800" />
        </div>
      )}

      <Tabs defaultValue="bookings" className="mt-8">
        <TabsList>
          <TabsTrigger value="bookings">Bookings</TabsTrigger>
          <TabsTrigger value="hikes">Hikes</TabsTrigger>
          <TabsTrigger value="equipment">Equipment</TabsTrigger>
          <TabsTrigger value="messages">Contact · {messagesCount}</TabsTrigger>
          <TabsTrigger value="telegram">Telegram bot</TabsTrigger>
        </TabsList>

        <TabsContent value="bookings" className="mt-4">
          {overviewBookings.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-stone-500">No bookings yet.</CardContent></Card>
          ) : (
            <div className="space-y-3">
              {overviewBookings.map((b) => (
                <Card key={b.id}>
                  <CardContent className="grid gap-3 p-5 sm:grid-cols-[1.5fr_1fr_1fr_auto] sm:items-center">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-semibold text-stone-900">{b.hike_title}</h3>
                        {b.status === "confirmed" && b.payment_status === "paid" ? (
                          <Badge className="bg-emerald-100 text-emerald-800">Confirmed</Badge>
                        ) : b.status === "pending" ? (
                          <Badge className="bg-amber-100 text-amber-800">Pending</Badge>
                        ) : (
                          <Badge>{b.status}</Badge>
                        )}
                      </div>
                      <div className="mt-1 text-sm text-stone-500">{b.user_name} · {b.user_email}</div>
                    </div>
                    <div className="text-sm text-stone-600">
                      <div>{b.party_size} {b.party_size === 1 ? "spot" : "spots"}</div>
                      <div className="text-xs text-stone-400">{formatDate(b.created_at)}</div>
                    </div>
                    <div className="text-sm font-semibold text-stone-900">{formatGbp(b.total_pence)}</div>
                    <Button asChild variant="outline" size="sm">
                      <Link to={`/hikes/${b.hike_id}`}>View hike</Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="hikes" className="mt-4">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm text-stone-500">{hikes.length} hike{hikes.length !== 1 ? "s" : ""}</span>
            <Button onClick={() => setCreatingHike(true)} className="bg-emerald-900 hover:bg-emerald-800">
              <Plus className="mr-1.5 h-4 w-4" /> New hike
            </Button>
          </div>
          {hikes.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-stone-500">No hikes yet.</CardContent></Card>
          ) : (
            <div className="space-y-3">
              {hikes.map((h) => (
                <Card key={h.id}>
                  <CardContent className="grid gap-3 p-5 sm:grid-cols-[1.5fr_1fr_1fr_auto_auto] sm:items-center">
                    <div>
                      <h3 className="text-base font-semibold text-stone-900">{h.title}</h3>
                      <div className="mt-1 text-sm text-stone-500">{h.location} · {formatDate(h.date)} · {h.difficulty}</div>
                    </div>
                    <div className="text-sm text-stone-600">Spots: {h.spots_left}/{h.spots_total}</div>
                    <div className="text-sm font-semibold text-stone-900">{formatGbp(h.price_pence)}</div>
                    <Button variant="outline" size="sm" onClick={() => setEditingHike(h)}>
                      <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                    </Button>
                    <Button variant="outline" size="sm" onClick={async () => {
                      if (!confirm(`Delete "${h.title}"? This cannot be undone.`)) return;
                      try {
                        await api(`/api/admin/hikes/${h.id}`, { method: "DELETE" });
                        toast.success("Hike deleted.");
                        refresh();
                      } catch (err) {
                        toast.error(err instanceof Error ? err.message : "Failed to delete");
                      }
                    }} className="text-rose-700 hover:bg-rose-50 hover:text-rose-800">
                      <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="equipment" className="mt-4">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm text-stone-500">{equipment.length} item{equipment.length !== 1 ? "s" : ""}</span>
            <Button onClick={() => setCreatingEquip(true)} className="bg-emerald-900 hover:bg-emerald-800">
              <Plus className="mr-1.5 h-4 w-4" /> New item
            </Button>
          </div>
          {equipment.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-stone-500">No equipment yet.</CardContent></Card>
          ) : (
            <div className="space-y-3">
              {equipment.map((e) => (
                <Card key={e.id}>
                  <CardContent className="grid gap-3 p-5 sm:grid-cols-[1.5fr_1fr_1fr_auto_auto] sm:items-center">
                    <div>
                      <h3 className="text-base font-semibold text-stone-900">{e.name}</h3>
                      <div className="mt-1 text-sm text-stone-500">{e.location} · {e.type} · {e.capacity} ppl</div>
                    </div>
                    <div className="text-sm text-stone-600">Stock: {e.availableUnits}/{e.totalUnits}</div>
                    <div className="text-sm font-semibold text-stone-900">{formatGbp(e.pricePerNightPence)}/night</div>
                    <Button variant="outline" size="sm" onClick={() => setEditingEquip(e)}>
                      <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                    </Button>
                    <Button variant="outline" size="sm" onClick={async () => {
                      if (!confirm(`Delete "${e.name}"? This cannot be undone.`)) return;
                      try {
                        await api(`/api/admin/equipment/${e.id}`, { method: "DELETE" });
                        toast.success("Equipment deleted.");
                        refresh();
                      } catch (err) {
                        toast.error(err instanceof Error ? err.message : "Failed to delete");
                      }
                    }} className="text-rose-700 hover:bg-rose-50 hover:text-rose-800">
                      <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="messages" className="mt-4">
          {messages.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-stone-500">No contact submissions yet.</CardContent></Card>
          ) : (
            <div className="space-y-3">
              {messages.map((m) => (
                <Card key={m.id}>
                  <CardContent className="space-y-2 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-base font-semibold text-stone-900">{m.subject || "No subject"}</h3>
                      <span className="text-xs text-stone-400">{formatDate(m.created_at)}</span>
                    </div>
                    <div className="text-sm text-stone-500">{m.name} · <a href={`mailto:${m.email}`} className="text-emerald-700 hover:underline">{m.email}</a></div>
                    <p className="text-sm text-stone-700 whitespace-pre-line">{m.message}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="telegram" className="mt-4">
          <TelegramAllowlist />
        </TabsContent>
      </Tabs>

      {editingHike && (
        <HikeDialog
          hike={editingHike}
          onClose={() => setEditingHike(null)}
          onSaved={() => { setEditingHike(null); refresh(); }}
        />
      )}
      {creatingHike && (
        <HikeDialog
          hike={null}
          onClose={() => setCreatingHike(false)}
          onSaved={() => { setCreatingHike(false); refresh(); }}
        />
      )}
      {editingEquip && (
        <EquipmentDialog
          equipment={editingEquip}
          onClose={() => setEditingEquip(null)}
          onSaved={() => { setEditingEquip(null); refresh(); }}
        />
      )}
      {creatingEquip && (
        <EquipmentDialog
          equipment={null}
          onClose={() => setCreatingEquip(false)}
          onSaved={() => { setCreatingEquip(false); refresh(); }}
        />
      )}
    </div>
  );
}

function Stat({ label, value, icon: Icon, tint }: { label: string; value: string | number; icon: React.ComponentType<{ className?: string }>; tint: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className={`inline-flex h-10 w-10 items-center justify-center rounded-lg ${tint}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-xs text-stone-500">{label}</div>
          <div className="text-xl font-semibold text-stone-900">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}

const DIFFICULTIES = ["Easy", "Moderate", "Challenging", "Strenuous"] as const;
const EQUIP_TYPES = ["tent", "bnb", "gear"] as const;

function HikeDialog({ hike, onClose, onSaved }: { hike: AdminHike | null; onClose: () => void; onSaved: () => void }) {
  const isNew = !hike;
  const [id, setId] = useState(isNew ? "" : hike.id);
  const [title, setTitle] = useState(isNew ? "" : hike.title);
  const [location, setLocation] = useState(isNew ? "" : hike.location);
  const [region, setRegion] = useState(isNew ? "" : hike.region);
  const [date, setDate] = useState(isNew ? "" : hike.date.slice(0, 10));
  const [duration, setDuration] = useState(isNew ? "" : hike.duration);
  const [difficulty, setDifficulty] = useState(isNew ? "Moderate" : hike.difficulty);
  const [priceGbp, setPriceGbp] = useState(isNew ? "35" : String(hike.price_pence / 100));
  const [spotsTotal, setSpotsTotal] = useState(isNew ? "20" : String(hike.spots_total));
  const [summary, setSummary] = useState(isNew ? "" : hike.summary);
  const [description, setDescription] = useState(isNew ? "" : hike.description);
  const [image, setImage] = useState(isNew ? "" : hike.image);
  const [hero, setHero] = useState(isNew ? "" : hike.hero);
  const [guide, setGuide] = useState(isNew ? "" : hike.guide);
  const [tags, setTags] = useState(isNew ? "" : hike.tags.join(", "));
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const body = {
        ...(isNew ? { id, title, location, region, date, duration, difficulty, spotsTotal: Number(spotsTotal), priceGbp: Number(priceGbp), summary, description, image, hero: hero || image, guide, tags: tags.split(",").map((t) => t.trim()).filter(Boolean) } : { title, location, date, duration, difficulty, priceGbp: Number(priceGbp), spotsTotal: Number(spotsTotal), summary, description, tags: tags.split(",").map((t) => t.trim()).filter(Boolean) }),
      };
      await api(isNew ? "/api/admin/hikes" : `/api/admin/hikes/${hike.id}`, {
        method: isNew ? "POST" : "PATCH",
        body: JSON.stringify(body),
      });
      toast.success(isNew ? "Hike created." : "Hike updated.");
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isNew ? "Create hike" : "Edit hike"}</DialogTitle>
          <DialogDescription>{isNew ? "Add a new hike to the public listings." : "Changes apply to the public listing immediately."}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2 sm:grid-cols-2">
          {isNew && (
            <div className="sm:col-span-2">
              <Label htmlFor="hid">ID (URL slug, e.g. kinder-scout)</Label>
              <Input id="hid" value={id} onChange={(e) => setId(e.target.value)} placeholder="kinder-scout" className="mt-1 font-mono text-sm" />
            </div>
          )}
          <div className="sm:col-span-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="loc">Location</Label>
            <Input id="loc" value={location} onChange={(e) => setLocation(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="region">Region</Label>
            <Input id="region" value={region} onChange={(e) => setRegion(e.target.value)} className="mt-1" placeholder="e.g. Lake District" />
          </div>
          <div>
            <Label htmlFor="date">Date</Label>
            <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="dur">Duration</Label>
            <Input id="dur" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="e.g. 2 days" className="mt-1" />
          </div>
          <div>
            <Label htmlFor="diff">Difficulty</Label>
            <select id="diff" value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
              {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <Label htmlFor="price">Price (GBP)</Label>
            <Input id="price" type="number" step="0.01" value={priceGbp} onChange={(e) => setPriceGbp(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="spots">Total spots</Label>
            <Input id="spots" type="number" value={spotsTotal} onChange={(e) => setSpotsTotal(e.target.value)} className="mt-1" />
          </div>
          {isNew && (
            <>
              <div className="sm:col-span-2">
                <Label htmlFor="img">Image URL</Label>
                <Input id="img" value={image} onChange={(e) => setImage(e.target.value)} className="mt-1" placeholder="/images/hike-name.jpg" />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="hero">Hero image URL (optional)</Label>
                <Input id="hero" value={hero} onChange={(e) => setHero(e.target.value)} className="mt-1" />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="guide">Guide name</Label>
                <Input id="guide" value={guide} onChange={(e) => setGuide(e.target.value)} className="mt-1" />
              </div>
            </>
          )}
          <div className="sm:col-span-2">
            <Label htmlFor="tags">Tags (comma separated)</Label>
            <Input id="tags" value={tags} onChange={(e) => setTags(e.target.value)} className="mt-1" />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="summary">Summary</Label>
            <Input id="summary" value={summary} onChange={(e) => setSummary(e.target.value)} className="mt-1" />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="desc">Description</Label>
            <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 min-h-[160px]" />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}><X className="mr-1 h-4 w-4" /> Cancel</Button>
          <Button onClick={save} disabled={saving} className="bg-emerald-900 hover:bg-emerald-800">
            <Save className="mr-1 h-4 w-4" /> {saving ? "Saving…" : isNew ? "Create hike" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EquipmentDialog({ equipment, onClose, onSaved }: { equipment: AdminEquipment | null; onClose: () => void; onSaved: () => void }) {
  const isNew = !equipment;
  const [id, setId] = useState(isNew ? "" : equipment.id);
  const [name, setName] = useState(isNew ? "" : equipment.name);
  const [type, setType] = useState(isNew ? "tent" : equipment.type);
  const [summary, setSummary] = useState(isNew ? "" : equipment.summary);
  const [description, setDescription] = useState(isNew ? "" : equipment.description);
  const [image, setImage] = useState(isNew ? "" : equipment.image);
  const [location, setLocation] = useState(isNew ? "" : equipment.location);
  const [capacity, setCapacity] = useState(isNew ? "2" : String(equipment.capacity));
  const [priceGbp, setPriceGbp] = useState(isNew ? "25" : String(equipment.pricePerNightGbp));
  const [stock, setStock] = useState(isNew ? "2" : String(equipment.totalUnits));
  const [amenities, setAmenities] = useState(isNew ? "" : (equipment.features || []).join(", "));
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const body = isNew
        ? { id, type, name, summary, description, image, location, pricePerNightGbp: Number(priceGbp), capacity: Number(capacity), stock: Number(stock), amenities: amenities.split(",").map((a) => a.trim()).filter(Boolean) }
        : { type, name, summary, description, location, pricePerNightGbp: Number(priceGbp), capacity: Number(capacity), stock: Number(stock), amenities: amenities.split(",").map((a) => a.trim()).filter(Boolean) };
      await api(isNew ? "/api/admin/equipment" : `/api/admin/equipment/${equipment.id}`, {
        method: isNew ? "POST" : "PATCH",
        body: JSON.stringify(body),
      });
      toast.success(isNew ? "Equipment created." : "Equipment updated.");
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isNew ? "Create equipment" : "Edit equipment"}</DialogTitle>
          <DialogDescription>{isNew ? "Add a new rental item." : "Changes apply to the public listing immediately."}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2 sm:grid-cols-2">
          {isNew && (
            <div className="sm:col-span-2">
              <Label htmlFor="eid">ID (URL slug, e.g. 3-person-tent)</Label>
              <Input id="eid" value={id} onChange={(e) => setId(e.target.value)} placeholder="3-person-tent" className="mt-1 font-mono text-sm" />
            </div>
          )}
          <div className="sm:col-span-2">
            <Label htmlFor="ename">Name</Label>
            <Input id="ename" value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="etype">Type</Label>
            <select id="etype" value={type} onChange={(e) => setType(e.target.value)} className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
              {EQUIP_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <Label htmlFor="eloc">Location</Label>
            <Input id="eloc" value={location} onChange={(e) => setLocation(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="ecap">Capacity (people)</Label>
            <Input id="ecap" type="number" value={capacity} onChange={(e) => setCapacity(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="eprice">Price per night (GBP)</Label>
            <Input id="eprice" type="number" step="0.01" value={priceGbp} onChange={(e) => setPriceGbp(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="estock">Stock (units)</Label>
            <Input id="estock" type="number" value={stock} onChange={(e) => setStock(e.target.value)} className="mt-1" />
          </div>
          {isNew && (
            <div className="sm:col-span-2">
              <Label htmlFor="eimg">Image URL</Label>
              <Input id="eimg" value={image} onChange={(e) => setImage(e.target.value)} className="mt-1" placeholder="/images/equipment-name.jpg" />
            </div>
          )}
          <div className="sm:col-span-2">
            <Label htmlFor="eamens">Amenities / features (comma separated)</Label>
            <Input id="eamens" value={amenities} onChange={(e) => setAmenities(e.target.value)} className="mt-1" />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="esummary">Summary</Label>
            <Input id="esummary" value={summary} onChange={(e) => setSummary(e.target.value)} className="mt-1" />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="edesc">Description</Label>
            <Textarea id="edesc" value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 min-h-[120px]" />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}><X className="mr-1 h-4 w-4" /> Cancel</Button>
          <Button onClick={save} disabled={saving} className="bg-emerald-900 hover:bg-emerald-800">
            <Save className="mr-1 h-4 w-4" /> {saving ? "Saving…" : isNew ? "Create item" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TelegramAllowlist() {
  const [entries, setEntries] = useState<Array<{ chat_id: string; label: string | null; added_at: number; added_by: number | null }>>([]);
  const [chatId, setChatId] = useState("");
  const [label, setLabel] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      const r = await api<{ entries: typeof entries }>("/api/admin/telegram-allowlist");
      setEntries(r.entries);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load allow-list");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = chatId.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      await api("/api/admin/telegram-allowlist", { method: "POST", body: JSON.stringify({ chatId: trimmed, label: label.trim() || null }) });
      setChatId(""); setLabel("");
      toast.success("Chat added.");
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    setRemoving(id);
    try {
      await api(`/api/admin/telegram-allowlist/${encodeURIComponent(id)}`, { method: "DELETE" });
      toast.success("Chat removed.");
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove");
    } finally {
      setRemoving(null);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="h-4 w-4" /> Telegram allow-list</CardTitle>
          <CardDescription>Only chats on this list can issue admin commands to the bot.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={add} className="grid gap-3 sm:grid-cols-[1.5fr_2fr_auto] sm:items-end">
            <div>
              <Label htmlFor="tg-chat-id">Chat ID</Label>
              <Input id="tg-chat-id" inputMode="numeric" placeholder="e.g. 7553803691" value={chatId} onChange={(e) => setChatId(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="tg-label">Label (optional)</Label>
              <Input id="tg-label" placeholder="e.g. Abu Jabal" value={label} onChange={(e) => setLabel(e.target.value)} className="mt-1" maxLength={80} />
            </div>
            <Button type="submit" disabled={saving || chatId.trim().length === 0} className="bg-emerald-900 hover:bg-emerald-800">
              <Send className="mr-1 h-4 w-4" /> {saving ? "Adding…" : "Add chat"}
            </Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
          <CardTitle className="text-base">Allowed chats</CardTitle>
          <Button variant="ghost" size="sm" onClick={refresh} disabled={loading}>
            <RefreshCcw className={`mr-1 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {loading && entries.length === 0 ? <p className="text-sm text-stone-500">Loading…</p>
          : entries.length === 0 ? <p className="text-sm text-stone-500">No chats on the allow-list yet.</p>
          : <div className="divide-y divide-stone-100">
              {entries.map((e) => (
                <div key={e.chat_id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <code className="rounded bg-stone-100 px-2 py-0.5 text-sm text-stone-800">{e.chat_id}</code>
                      {e.label && <span className="text-sm text-stone-700">{e.label}</span>}
                    </div>
                    <div className="mt-0.5 text-xs text-stone-400">Added {formatDate(e.added_at)}{e.added_by ? ` · by ${e.added_by}` : ""}</div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => remove(e.chat_id)} disabled={removing === e.chat_id} className="text-rose-700 hover:bg-rose-50 hover:text-rose-800">
                    <Trash2 className="mr-1 h-3.5 w-3.5" /> {removing === e.chat_id ? "Removing…" : "Remove"}
                  </Button>
                </div>
              ))}
            </div>
          }
        </CardContent>
      </Card>
    </div>
  );
}
