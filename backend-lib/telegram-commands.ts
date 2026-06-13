// Routes for the Telegram bot.
//
// Endpoints:
//   GET  /api/telegram/webhook  - placeholder
//   POST /api/telegram/webhook  - main inbound handler
//   POST /api/admin/telegram/test - send a test message
//
// Commands (all in the allow-listed admin chat):
//   /start, /help           — show usage
//   /drafts                 — show current hike draft
//   /cancel                 — discard current hike draft
//
//   /new-hike <text>        — parse a hike from the given text
//   /new-hike               — interactive: bot asks for the description
//   /edit-hike              — list hikes, then user picks one, then bot
//                             asks which fields to change one at a time
//   /delete-hike            — list hikes, user picks by number; multi-select
//                             with "all" or comma-separated numbers
//
//   /new-rent <text>        — parse a rent item from the given text
//   /new-rent               — interactive: bot asks for the description
//   /edit-rent              — list rent items, pick, edit fields
//   /delete-rent            — list rent items, pick one or many to delete
//
// State is ephemeral. Each chat has at most one current "session"
// (hike-new / hike-edit / rent-new / rent-edit / rent-delete) which
// tracks the multi-step flow.

import { Hono } from "hono";
import { db } from "./db";
import {
  isAllowedChat,
  isTelegramConfigured,
  sendTelegramMessage,
} from "./telegram";
import {
  parseHikeText,
  type ParsedHike,
} from "./telegram-hike-parser";

// ---------- session state ----------
type SessionKind =
  | { type: "hike-new" }
  | { type: "hike-edit"; pick?: { id: string; title: string; date: string } }
  | { type: "hike-edit-field"; hikeId: string; field: string; partial: Record<string, unknown> }
  | { type: "hike-delete"; selected: string[] }
  | { type: "rent-new" }
  | { type: "rent-edit"; pick?: { id: string; name: string } }
  | { type: "rent-edit-field"; itemId: string; field: string; partial: Record<string, unknown> }
  | { type: "rent-delete"; selected: string[] };

type Session = {
  kind: SessionKind;
  // for hike-new: the parsed draft (kept across YES/NO/...)
  draft?: ParsedHike;
  // message id of the user's last message (for replies)
  lastMessageId?: number;
};

const sessions = new Map<string, Session>();
function sessionFor(chat: string): Session | undefined {
  return sessions.get(chat);
}
function setSession(chat: string, s: Session | null) {
  if (s === null) sessions.delete(chat);
  else sessions.set(chat, s);
}

// ---------- shared helpers ----------
function chatKey(chatId: number | string): string {
  return String(chatId);
}

function listHikes(): { id: string; title: string; date: string }[] {
  return db
    .query<{ id: string; title: string; date: string }, []>(
      "SELECT id, title, date FROM hikes ORDER BY date DESC",
    )
    .all();
}

function listEquipment(): { id: string; name: string; type: string; location: string }[] {
  return db
    .query<{ id: string; name: string; type: string; location: string }, []>(
      "SELECT id, name, type, location FROM equipment ORDER BY type, name",
    )
    .all();
}

function getHike(id: string): Record<string, unknown> | null {
  const row = db
    .query<Record<string, unknown>, [string]>(
      "SELECT * FROM hikes WHERE id = ?",
    )
    .get(id);
  return row ?? null;
}

function getEquipment(id: string): Record<string, unknown> | null {
  const row = db
    .query<Record<string, unknown>, [string]>(
      "SELECT * FROM equipment WHERE id = ?",
    )
    .get(id);
  return row ?? null;
}

// ---------- message builders ----------
function buildHikeSummary(h: ParsedHike): string {
  const tags = h.tags.length ? `\nTags: ${h.tags.join(", ")}` : "";
  return (
    `<b>New hike draft</b>\n\n` +
    `<b>${h.title}</b>\n` +
    `📍 ${h.location}, ${h.region}\n` +
    `📅 ${h.date} · ${h.duration}\n` +
    `🥾 ${h.difficulty} · ${h.spotsTotal} spots\n` +
    `💷 £${h.priceGbp.toFixed(2)} per person\n` +
    `👤 ${h.guide}\n` +
    `🖼 ${h.image}${tags}\n\n` +
    `<i>${h.summary}</i>`
  );
}

function buildHikeListMessage(): string {
  const hikes = listHikes();
  if (hikes.length === 0) {
    return "<b>No hikes on the site yet.</b>\nUse /new-hike to create one.";
  }
  const lines = hikes.slice(0, 30).map((h, i) => {
    const idx = String(i + 1).padStart(2, "0");
    return `${idx}. <b>${h.title}</b> — ${h.date}`;
  });
  return (
    `<b>Hikes (${hikes.length})</b>\n\n` +
    lines.join("\n") +
    `\n\nReply with the <b>number</b> of the hike you want.`
  );
}

function buildRentListMessage(): string {
  const items = listEquipment();
  if (items.length === 0) {
    return "<b>No rent items on the site yet.</b>\nUse /new-rent to create one.";
  }
  const lines = items.slice(0, 30).map((it, i) => {
    const idx = String(i + 1).padStart(2, "0");
    return `${idx}. <b>${it.name}</b> <i>(${it.type})</i> — ${it.location}`;
  });
  return (
    `<b>Rent items (${items.length})</b>\n\n` +
    lines.join("\n") +
    `\n\nReply with the <b>number</b> of the item you want.`
  );
}

function buildErrorReply(errors: { field: string; message: string }[]): string {
  const lines = errors.map((e) => `• <b>${e.field}</b>: ${e.message}`);
  return (
    `<b>I couldn't read that as a hike.</b>\n` +
    `Please add:\n` +
    `${lines.join("\n")}\n\n` +
    `Example: <code>Yorkshire Dales 3 day trek, £85, hard, 12 spots, 2026-08-12, led by Abu Jabal</code>\n\n` +
    `Add a <code>Description:</code> section with at least a few sentences.`
  );
}

function buildRentErrorReply(errors: { field: string; message: string }[]): string {
  const lines = errors.map((e) => `• <b>${e.field}</b>: ${e.message}`);
  return (
    `<b>I couldn't read that as a rent item.</b>\n` +
    `Please add:\n` +
    `${lines.join("\n")}\n\n` +
    `Example:\n<code>type: tent\nname: 4-person wild camp tent\nsummary: 4-person geodesic, sleeps 4 in 2 bedrooms\ndescription: 4-person geodesic tent with two bedrooms and a living area. Pitched and packed by your guide.\nlocation: Lake District\npricePerNightGbp: 25\ncapacity: 4\ntotalUnits: 6\navailableUnits: 6\nunitLabel: per night\nimage: /images/tent-camp.jpg\nfeatures: waterproof, 2-bedrooms</code>\n\n` +
    `All fields are required except <code>features</code> and <code>image</code>. <code>unitLabel</code> must be <code>per night</code>, <code>per stay</code>, or <code>per day</code>. /cancel to abort.`
  );
}

function buildRentItemSummary(it: {
  id?: string;
  type: string;
  name: string;
  summary: string;
  image: string;
  location: string;
  capacity?: number | null;
  totalUnits?: number | null;
  availableUnits?: number | null;
  unitLabel?: string | null;
  price_per_night_gbp?: number;
  pricePerNightGbp?: number;
  features?: string[] | null;
}): string {
  const price = it.pricePerNightGbp ?? it.price_per_night_gbp ?? 0;
  const unitLabel = it.unitLabel ?? "per night";
  const totalUnits = it.totalUnits ?? 0;
  const availableUnits =
    it.availableUnits !== undefined && it.availableUnits !== null
      ? it.availableUnits
      : totalUnits;
  const features = it.features?.length ? `\nFeatures: ${it.features.join(", ")}` : "";
  const capacity = it.capacity ? ` · Capacity ${it.capacity}` : "";
  return (
    `<b>New rent item draft</b>\n\n` +
    `<b>${it.name}</b> <i>(${it.type})</i>\n` +
    `📍 ${it.location}\n` +
    `💷 £${Number(price).toFixed(2)} ${unitLabel}\n` +
    `📦 Total ${totalUnits} · Available ${availableUnits}${capacity}\n` +
    `🖼 ${it.image}${features}\n\n` +
    `<i>${it.summary}</i>`
  );
}

// ---------- public mount ----------
export function mountTelegramRoutes(app: Hono) {
  app.get("/api/telegram/webhook", (c) =>
    c.json({
      ok: true,
      service: "badr-adventures-telegram",
      configured: isTelegramConfigured(),
      docs: "POST updates here. Set TELEGRAM_BOT_TOKEN + TELEGRAM_ADMIN_CHAT, then register the webhook URL with the Bot API.",
    }),
  );

  app.post("/api/telegram/webhook", async (c) => {
    if (!isTelegramConfigured()) {
      return c.json({ ok: false, error: "Telegram not configured" }, 503);
    }
    let update: TelegramUpdate;
    try {
      update = (await c.req.json()) as TelegramUpdate;
    } catch {
      return c.json({ ok: false, error: "Invalid JSON" }, 400);
    }
    if (update.callback_query) {
      await handleCallback(update.callback_query);
      return c.json({ ok: true });
    }
    const msg = update.message;
    if (!msg) return c.json({ ok: true, skipped: "no message" });
    if (!isAllowedChat(msg.chat.id)) {
      console.warn(`[telegram] rejected chat ${msg.chat.id}`);
      return c.json({ ok: true, dropped: "unauthorized chat" });
    }
    if (Array.isArray(msg.photo) && msg.photo.length > 0) {
      const best = msg.photo[msg.photo.length - 1];
      const fileId = best.file_id;
      const caption = msg.caption ?? "";
      const imageUrl = await getFileDownloadUrl(fileId);
      await handleTextOrPhoto(
        chatKey(msg.chat.id),
        caption,
        msg.message_id,
        imageUrl ?? undefined,
      );
      return c.json({ ok: true });
    }
    if (typeof msg.text === "string") {
      await handleTextOrPhoto(chatKey(msg.chat.id), msg.text, msg.message_id);
      return c.json({ ok: true });
    }
    return c.json({ ok: true, skipped: "unsupported message type" });
  });

  app.post("/api/admin/telegram/test", async (c) => {
    try {
      const { requireAdmin } = await import("./auth");
      await requireAdmin(c);
      if (!isTelegramConfigured()) {
        return c.json({ ok: false, error: "Telegram not configured" }, 503);
      }
      const r = await sendTelegramMessage(
        "✅ Telegram is connected. Try /help for available commands.",
      );
      if (r.ok) return c.json({ ok: true, messageId: r.messageId });
      return c.json({ ok: false, error: r.error }, 502);
    } catch (err) {
      return c.json({ ok: false, error: err instanceof Error ? err.message : "Error" }, 500);
    }
  });
}

// ---------- Telegram file helper ----------
function getFileDownloadUrl(fileId: string): Promise<string | null> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return Promise.resolve(null);
  return fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`)
    .then((r) => r.json() as Promise<{ ok: boolean; result?: { file_path?: string } }>)
    .then((j) => {
      if (!j.ok || !j.result?.file_path) return null;
      return `https://api.telegram.org/file/bot${token}/${j.result.file_path}`;
    })
    .catch(() => null);
}
// ---------- text command dispatcher ----------
async function handleTextOrPhoto(
  chat: string,
  text: string,
  messageId: number,
  imageUrl?: string,
) {
  const trimmed = text.trim();
  const session = sessionFor(chat);
  const lower = trimmed.toLowerCase();

  // ---- commands first (only when not in the middle of a multi-step flow,
  //      unless the command itself is /cancel) ----
  if (lower === "/cancel" || lower === "/discard") {
    if (session) {
      setSession(chat, null);
      await sendTelegramMessage("Session cancelled. ✋");
    } else {
      await sendTelegramMessage("Nothing to cancel.");
    }
    return;
  }

  // /start and /help
  if (lower === "/start" || lower === "/help") {
    await sendTelegramMessage(buildHelp());
    return;
  }

  // /drafts — show the current hike-new draft, if any
  if (lower === "/drafts") {
    if (session && session.kind.type === "hike-new" && session.draft) {
      await sendTelegramMessage(buildHikeSummary(session.draft), { replyToMessageId: messageId });
      await sendTelegramMessage("Reply <code>yes</code> to save, <code>no</code> to discard, or send a corrected description.");
    } else {
      await sendTelegramMessage("No active hike draft. Use /new-hike to start one.");
    }
    return;
  }

  // ---- /new-hike ----
  if (lower === "/new-hike" || lower.startsWith("/new-hike ")) {
    const after = trimmed.slice("/new-hike".length).trim();
    if (after.length > 0) {
      // Inline form
      await startHikeDraft(chat, after, imageUrl);
    } else {
      // Interactive form
      setSession(chat, { kind: { type: "hike-new" }, lastMessageId: messageId });
      await sendTelegramMessage(
        "<b>New hike.</b> Send the hike description now.\n\n" +
          "Example:\n<code>Yorkshire Dales 3 day trek, £85, hard, 12 spots, 2026-08-12, led by Abu Jabal</code>\n\n" +
          "Add a <code>Description:</code> section with a few sentences.\n\n" +
          "Or send /cancel to abort.",
      );
    }
    return;
  }

  // ---- /edit-hike ----
  if (lower === "/edit-hike" || lower === "/edit") {
    setSession(chat, { kind: { type: "hike-edit" }, lastMessageId: messageId });
    await sendTelegramMessage(buildHikeListMessage());
    return;
  }

  // ---- /delete-hike ----
  if (lower === "/delete-hike" || lower === "/delete") {
    setSession(chat, { kind: { type: "hike-delete", selected: [] }, lastMessageId: messageId });
    await sendTelegramMessage(
      buildHikeListMessage() +
        "\n\nReply with the <b>number</b> of the hike to delete, or <b>all</b> to delete everything, or comma-separated numbers (e.g. <code>1,3,5</code>).",
    );
    return;
  }

  // ---- /new-rent ----
  if (lower === "/new-rent" || lower.startsWith("/new-rent ")) {
    const after = trimmed.slice("/new-rent".length).trim();
    if (after.length > 0) {
      await startRentDraft(chat, after, imageUrl);
    } else {
      setSession(chat, { kind: { type: "rent-new" }, lastMessageId: messageId });
      await sendTelegramMessage(buildRentPrompt());
    }
    return;
  }

  // ---- /edit-rent ----
  if (lower === "/edit-rent") {
    setSession(chat, { kind: { type: "rent-edit" }, lastMessageId: messageId });
    await sendTelegramMessage(buildRentListMessage());
    return;
  }

  // ---- /delete-rent ----
  if (lower === "/delete-rent") {
    setSession(chat, { kind: { type: "rent-delete", selected: [] }, lastMessageId: messageId });
    await sendTelegramMessage(
      buildRentListMessage() +
        "\n\nReply with the <b>number</b> of the item to delete, or <b>all</b>, or comma-separated numbers.",
    );
    return;
  }

  // ---- multi-step sessions ----
  if (session) {
    if (session.kind.type === "hike-new") {
      // YES/NO confirm/discard must be checked before we re-parse the text
      // as a fresh hike description, otherwise "YES" gets sent to the
      // parser and produces a confusing "couldn't parse" error.
      if (session.draft) {
        if (/^(yes|y|save|confirm|sure|ok|okay|yeah|yep)$/i.test(trimmed)) {
          const d = session.draft;
          setSession(chat, null);
          const r = saveHike(d);
          if (!r.ok) {
            setSession(chat, { kind: { type: "hike-new" }, draft: d });
            await sendTelegramMessage(
              `❌ Couldn't save: ${r.error}\n\nDraft is still active. Reply YES to retry, NO to discard, or send a corrected description.`,
            );
            return;
          }
          const siteUrl =
            process.env.PUBLIC_SITE_URL ||
            `http://localhost:${process.env.PORT ?? 54404}`;
          await sendTelegramMessage(
            `✅ <b>Hike saved and live on the site.</b>\n` +
              `<a href="${siteUrl}/hikes/${r.id}">${siteUrl}/hikes/${r.id}</a>`,
          );
          return;
        }
        if (/^(no|n|discard|cancel|nope|nah)$/i.test(trimmed)) {
          setSession(chat, null);
          await sendTelegramMessage("Draft discarded. Send a new hike description when ready.");
          return;
        }
      }
      await startHikeDraft(chat, trimmed, imageUrl, messageId);
      return;
    }
    if (session.kind.type === "hike-edit") {
      await handleHikeEditPick(chat, trimmed, messageId);
      return;
    }
    if (session.kind.type === "hike-edit-field") {
      await handleHikeEditField(chat, trimmed, messageId);
      return;
    }
    if (session.kind.type === "hike-delete") {
      await handleHikeDelete(chat, trimmed, messageId);
      return;
    }
    if (session.kind.type === "rent-new") {
      await startRentDraft(chat, trimmed, imageUrl, messageId);
      return;
    }
    if (session.kind.type === "rent-edit") {
      await handleRentEditPick(chat, trimmed, messageId);
      return;
    }
    if (session.kind.type === "rent-edit-field") {
      await handleRentEditField(chat, trimmed, messageId);
      return;
    }
    if (session.kind.type === "rent-delete") {
      await handleRentDelete(chat, trimmed, messageId);
      return;
    }
  }

  // ---- fallback: treat as a hike description ----
  await startHikeDraft(chat, trimmed, imageUrl, messageId);
}

// ---------- Hike: new flow ----------
async function startHikeDraft(
  chat: string,
  text: string,
  imageUrl?: string,
  messageId?: number,
) {
  const result = parseHikeText(text, { imageHint: imageUrl });
  if (!result.ok) {
    await sendTelegramMessage(buildErrorReply(result.errors), messageId ? { replyToMessageId: messageId } : undefined);
    return;
  }
  setSession(chat, {
    kind: { type: "hike-new" },
    draft: result.hike,
    lastMessageId: messageId,
  });
  await sendTelegramMessage(buildHikeSummary(result.hike), messageId ? { replyToMessageId: messageId } : undefined);
  await sendTelegramMessage(
    "Reply <b>YES</b> to save, <b>NO</b> to discard, or send a corrected description to replace this draft.\n\n" +
      "You can also say <code>edit field</code> and I'll guide you through a step-by-step edit (e.g. <code>edit price</code>).",
  );
}

// ---------- Hike: edit flow ----------
async function handleHikeEditPick(chat: string, text: string, messageId: number) {
  const session = sessionFor(chat);
  if (!session || session.kind.type !== "hike-edit") return;
  const hikes = listHikes();
  const trimmed = text.trim();
  if (/^(cancel|stop|never mind)$/i.test(trimmed)) {
    setSession(chat, null);
    await sendTelegramMessage("Cancelled. ✋");
    return;
  }
  const n = Number(trimmed);
  if (!Number.isInteger(n) || n < 1 || n > hikes.length) {
    await sendTelegramMessage(
      `Please reply with a number between 1 and ${hikes.length}, or /cancel.`,
      { replyToMessageId: messageId },
    );
    return;
  }
  const picked = hikes[n - 1];
  setSession(chat, {
    kind: {
      type: "hike-edit-field",
      hikeId: picked.id,
      field: "",
      partial: {},
    },
    lastMessageId: messageId,
  });
  await sendTelegramMessage(
    `<b>Editing:</b> ${picked.title} — ${picked.date}\n\n` +
      `What would you like to change? You can pick one or more fields, separated by commas. ` +
      `For each, I'll ask for the new value.\n\n` +
      `Available fields:\n` +
      `• <code>title</code> — the hike title\n` +
      `• <code>date</code> — date (YYYY-MM-DD)\n` +
      `• <code>duration</code> — e.g. "3 days / 2 nights"\n` +
      `• <code>location</code> — start location\n` +
      `• <code>region</code> — UK region\n` +
      `• <code>difficulty</code> — Easy / Moderate / Challenging / Strenuous\n` +
      `• <code>spots</code> — total spots\n` +
      `• <code>price</code> — price per person in GBP (£)\n` +
      `• <code>summary</code> — short summary\n` +
      `• <code>description</code> — long description\n` +
      `• <code>image</code> — image path or URL\n` +
      `• <code>guide</code> — lead guide name\n` +
      `• <code>tags</code> — comma-separated tags\n\n` +
      `Reply with one or more field names, e.g. <code>price, date</code>. Or /cancel to abort.`,
    { replyToMessageId: messageId },
  );
}

const HIKE_EDITABLE_FIELDS = [
  "title",
  "date",
  "duration",
  "location",
  "region",
  "difficulty",
  "spots",
  "price",
  "summary",
  "description",
  "image",
  "guide",
  "tags",
] as const;
type HikeField = (typeof HIKE_EDITABLE_FIELDS)[number];

function mapHikeFieldToBody(field: HikeField, value: string): Record<string, unknown> {
  switch (field) {
    case "title":
      return { title: value };
    case "date":
      return { date: value };
    case "duration":
      return { duration: value };
    case "location":
      return { location: value };
    case "region":
      return { region: value };
    case "difficulty":
      return { difficulty: value };
    case "spots":
      return { spotsTotal: Number(value) };
    case "price":
      return { priceGbp: Number(value) };
    case "summary":
      return { summary: value };
    case "description":
      return { description: value };
    case "image":
      return { image: value };
    case "guide":
      return { guide: value };
    case "tags":
      return { tags: value.split(",").map((s) => s.trim()).filter(Boolean) };
  }
}

async function handleHikeEditField(chat: string, text: string, messageId: number) {
  const session = sessionFor(chat);
  if (!session || session.kind.type !== "hike-edit-field") return;
  const trimmed = text.trim();
  if (/^(cancel|stop|never mind)$/i.test(trimmed)) {
    setSession(chat, null);
    await sendTelegramMessage("Cancelled. ✋");
    return;
  }

  // If we don't have a field queued, the user is picking one (or several)
  if (!session.kind.field) {
    const requested = trimmed
      .toLowerCase()
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const unknown = requested.filter(
      (f) => !HIKE_EDITABLE_FIELDS.includes(f as HikeField),
    );
    if (unknown.length > 0) {
      await sendTelegramMessage(
        `Unknown field${unknown.length > 1 ? "s" : ""}: ${unknown.join(", ")}.\nValid fields: ${HIKE_EDITABLE_FIELDS.join(", ")}.`,
        { replyToMessageId: messageId },
      );
      return;
    }
    if (requested.length === 0) {
      await sendTelegramMessage("Please pick at least one field to change.", {
        replyToMessageId: messageId,
      });
      return;
    }
    // Queue the first one and ask for its value
    const queue = requested as HikeField[];
    const first = queue[0];
    setSession(chat, {
      ...session,
      kind: {
        ...session.kind,
        field: first,
      },
    });
    await sendTelegramMessage(
      `<b>New ${first}?</b>\n` +
        (queue.length > 1
          ? `(After this, I'll ask for: ${queue.slice(1).join(", ")})\n\n`
          : "\n") +
        `Reply with the new value. Or <code>skip</code> to skip this field, or /cancel.`,
      { replyToMessageId: messageId },
    );
    return;
  }

  // We have a field queued — the user is giving the value
  const field = session.kind.field as HikeField;
  if (/^skip$/i.test(trimmed)) {
    await advanceHikeFieldQueue(chat, session, messageId);
    return;
  }
  const update = mapHikeFieldToBody(field, trimmed);
  session.kind.partial = { ...session.kind.partial, ...update };
  await advanceHikeFieldQueue(chat, session, messageId, field);
}

async function advanceHikeFieldQueue(
  chat: string,
  session: Session,
  messageId: number,
  justSet?: HikeField,
) {
  if (session.kind.type !== "hike-edit-field") return;
  // The user might be in the middle of asking for more fields; here we just
  // loop until they say "done". We support a single-field-at-a-time flow
  // (asked for one, user replied, we save) and we also support a "done" word.
  const partial = session.kind.partial;
  if (Object.keys(partial).length === 0) {
    setSession(chat, null);
    await sendTelegramMessage("No changes made. /cancel to abort.", { replyToMessageId: messageId });
    return;
  }
  // Apply the partial update
  const result = updateHike(session.kind.hikeId, partial);
  if (!result.ok) {
    setSession(chat, null);
    await sendTelegramMessage(`❌ Save failed: ${result.error}`, { replyToMessageId: messageId });
    return;
  }
  // After saving one field, ask if they want to edit more
  setSession(chat, {
    ...session,
    kind: {
      ...session.kind,
      field: "",
      partial: {},
    },
  });
  const lines = Object.keys(partial).map((k) => `• <b>${k}</b>`).join("\n");
  await sendTelegramMessage(
    `✅ Updated ${justSet ?? Object.keys(partial)[0]}.\n\n` +
      `Changed: ${lines}\n\n` +
      `Want to change another field on this hike? Reply with one or more field names (e.g. <code>price, spots</code>), or <code>done</code> to finish.`,
    { replyToMessageId: messageId },
  );

  // If the next user message is "done", clear the session
  // (handled by the next dispatch via the if-not-field branch — see below)
}

async function handleHikeEditField2(chat: string, text: string, messageId: number) {
  // The "done" word or another field name on the same hike
  const session = sessionFor(chat);
  if (!session || session.kind.type !== "hike-edit-field") return;
  const trimmed = text.trim();
  if (/^(done|finish|stop|cancel)$/i.test(trimmed)) {
    setSession(chat, null);
    await sendTelegramMessage("Done. ✅", { replyToMessageId: messageId });
    return;
  }
  // Otherwise: treat as a new field name
  await handleHikeEditField(chat, text, messageId);
}

// ---------- Hike: delete flow ----------
async function handleHikeDelete(chat: string, text: string, messageId: number) {
  const session = sessionFor(chat);
  if (!session || session.kind.type !== "hike-delete") return;
  const hikes = listHikes();
  const trimmed = text.trim();
  if (/^(cancel|stop)$/i.test(trimmed)) {
    setSession(chat, null);
    await sendTelegramMessage("Cancelled. ✋");
    return;
  }
  if (trimmed === "all") {
    const ids = hikes.map((h) => h.id);
    const r = deleteHikes(ids);
    setSession(chat, null);
    await sendTelegramMessage(
      r.ok ? `🗑 Deleted ${ids.length} hikes.` : `❌ ${r.error}`,
      { replyToMessageId: messageId },
    );
    return;
  }
  const parts = trimmed.split(",").map((s) => s.trim()).filter(Boolean);
  const nums = parts
    .map((p) => Number(p))
    .filter((n) => Number.isInteger(n));
  if (nums.length === 0) {
    await sendTelegramMessage("Reply with a number, a comma-separated list, or 'all'.", {
      replyToMessageId: messageId,
    });
    return;
  }
  if (nums.some((n) => n < 1 || n > hikes.length)) {
    await sendTelegramMessage(
      `Out of range. There are ${hikes.length} hikes.`,
      { replyToMessageId: messageId },
    );
    return;
  }
  const ids = nums.map((n) => hikes[n - 1].id);
  const r = deleteHikes(ids);
  setSession(chat, null);
  const titles = nums.map((n) => hikes[n - 1].title).join(", ");
  await sendTelegramMessage(
    r.ok ? `🗑 Deleted: ${titles}` : `❌ ${r.error}`,
    { replyToMessageId: messageId },
  );
}

// ---------- Rent: new flow ----------
async function startRentDraft(
  chat: string,
  text: string,
  imageUrl?: string,
  messageId?: number,
) {
  const result = parseRentText(text, imageUrl);
  if (!result.ok) {
    await sendTelegramMessage(buildRentErrorReply(result.errors), messageId ? { replyToMessageId: messageId } : undefined);
    return;
  }
  await sendTelegramMessage(
    buildRentItemSummary({ ...result.item, pricePerNightGbp: result.item.pricePerNightGbp }),
    messageId ? { replyToMessageId: messageId } : undefined,
  );
  // Save immediately — rent items are simpler
  const r = saveRentItem(result.item);
  if (!r.ok) {
    await sendTelegramMessage(`❌ Couldn't save: ${r.error}\n\nFix the values and resend, or /cancel.`);
    return;
  }
  const siteUrl = process.env.PUBLIC_SITE_URL ?? "https://badr-adventures-blackbox.zocomputer.io";
  await sendTelegramMessage(
    `✅ <b>Rent item saved and live on the site.</b>\n` +
      `<a href="${siteUrl}/rent">${siteUrl}/rent</a>`,
  );
  setSession(chat, null);
}

function buildRentPrompt(): string {
  return (
    "<b>New rent item.</b> Send the item details, one field per line:\n\n" +
    "<code>type: tent | bnb | gear\n" +
    "id: 4p-tent-ld\n" +
    "name: 4-person wild camp tent\n" +
    "summary: 4-person geodesic, sleeps 4 in 2 bedrooms\n" +
    "description: 4-person geodesic tent with two bedrooms and a living area. Pitched and packed by your guide.\n" +
    "location: Lake District\n" +
    "pricePerNightGbp: 25\n" +
    "capacity: 4\n" +
    "totalUnits: 6\n" +
    "unitLabel: per night\n" +
    "features: waterproof, 2-bedrooms\n" +
    "image: /images/tent-camp.jpg</code>\n\n" +
    "All fields except <code>image</code> are required. /cancel to abort."
  );
}

// ---------- Rent: edit flow ----------
async function handleRentEditPick(chat: string, text: string, messageId: number) {
  const session = sessionFor(chat);
  if (!session || session.kind.type !== "rent-edit") return;
  const items = listEquipment();
  const trimmed = text.trim();
  if (/^(cancel|stop)$/i.test(trimmed)) {
    setSession(chat, null);
    await sendTelegramMessage("Cancelled. ✋");
    return;
  }
  const n = Number(trimmed);
  if (!Number.isInteger(n) || n < 1 || n > items.length) {
    await sendTelegramMessage(
      `Please reply with a number between 1 and ${items.length}, or /cancel.`,
      { replyToMessageId: messageId },
    );
    return;
  }
  const picked = items[n - 1];
  setSession(chat, {
    kind: {
      type: "rent-edit-field",
      itemId: picked.id,
      field: "",
      partial: {},
    },
    lastMessageId: messageId,
  });
  await sendTelegramMessage(
    `<b>Editing:</b> ${picked.name} (${picked.type}) — ${picked.location}\n\n` +
      `What would you like to change? You can pick one or more fields, separated by commas. ` +
      `For each, I'll ask for the new value.\n\n` +
      `Available fields:\n` +
      `• <code>name</code>\n` +
      `• <code>type</code> — tent / bnb / gear\n` +
      `• <code>summary</code>\n` +
      `• <code>description</code>\n` +
      `• <code>location</code>\n` +
      `• <code>pricePerNightGbp</code> — number\n` +
      `• <code>capacity</code> — number\n` +
      `• <code>totalUnits</code> — number\n` +
      `• <code>availableUnits</code> — number\n` +
      `• <code>unitLabel</code> — unit label\n` +
      `• <code>image</code>\n` +
      `• <code>features</code> — comma-separated\n\n` +
      `Reply with one or more field names, e.g. <code>pricePerNightGbp, totalUnits</code>. Or /cancel to abort.`,
    { replyToMessageId: messageId },
  );
}

const RENT_EDITABLE_FIELDS = [
  "name",
  "type",
  "summary",
  "description",
  "location",
  "pricePerNightGbp",
  "capacity",
  "totalUnits",
  "availableUnits",
  "unitLabel",
  "image",
  "features",
] as const;
type RentField = (typeof RENT_EDITABLE_FIELDS)[number];

const VALID_UNIT_LABELS = ["per night", "per stay", "per day"] as const;
type UnitLabel = (typeof VALID_UNIT_LABELS)[number];

function normaliseUnitLabel(raw: string): UnitLabel | null {
  const v = raw.trim().toLowerCase();
  if (v === "per night" || v === "night" || v === "/night") return "per night";
  if (v === "per stay" || v === "stay" || v === "/stay") return "per stay";
  if (v === "per day" || v === "day" || v === "/day") return "per day";
  return null;
}

function mapRentFieldToBody(field: RentField, value: string): Record<string, unknown> {
  switch (field) {
    case "name":
      return { name: value };
    case "type":
      return { type: value.toLowerCase() };
    case "summary":
      return { summary: value };
    case "description":
      return { description: value };
    case "location":
      return { location: value };
    case "pricePerNightGbp":
      return { pricePerNightGbp: Number(value) };
    case "capacity":
      return { capacity: Number(value) };
    case "totalUnits":
      return { totalUnits: Number(value) };
    case "availableUnits":
      return { availableUnits: Number(value) };
    case "unitLabel":
      return { unitLabel: value };
    case "image":
      return { image: value };
    case "features":
      return { features: value.split(",").map((s) => s.trim()).filter(Boolean) };
  }
}

async function handleRentEditField(chat: string, text: string, messageId: number) {
  const session = sessionFor(chat);
  if (!session || session.kind.type !== "rent-edit-field") return;
  const trimmed = text.trim();
  if (/^(cancel|stop)$/i.test(trimmed)) {
    setSession(chat, null);
    await sendTelegramMessage("Cancelled. ✋");
    return;
  }
  if (!session.kind.field) {
    const requested = trimmed
      .toLowerCase()
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const unknown = requested.filter(
      (f) => !RENT_EDITABLE_FIELDS.includes(f as RentField),
    );
    if (unknown.length > 0) {
      await sendTelegramMessage(
        `Unknown field${unknown.length > 1 ? "s" : ""}: ${unknown.join(", ")}.\nValid fields: ${RENT_EDITABLE_FIELDS.join(", ")}.`,
        { replyToMessageId: messageId },
      );
      return;
    }
    if (requested.length === 0) {
      await sendTelegramMessage("Please pick at least one field to change.", {
        replyToMessageId: messageId,
      });
      return;
    }
    const first = requested[0] as RentField;
    setSession(chat, {
      ...session,
      kind: { ...session.kind, field: first },
    });
    await sendTelegramMessage(
      `<b>New ${first}?</b>\n` +
        (requested.length > 1
          ? `(After this: ${requested.slice(1).join(", ")})\n\n`
          : "\n") +
        `Reply with the new value, or <code>skip</code>, or /cancel.`,
      { replyToMessageId: messageId },
    );
    return;
  }
  const field = session.kind.field as RentField;
  if (/^skip$/i.test(trimmed)) {
    await advanceRentFieldQueue(chat, session, messageId);
    return;
  }
  const update = mapRentFieldToBody(field, trimmed);
  session.kind.partial = { ...session.kind.partial, ...update };
  await advanceRentFieldQueue(chat, session, messageId, field);
}

async function advanceRentFieldQueue(
  chat: string,
  session: Session,
  messageId: number,
  justSet?: RentField,
) {
  if (session.kind.type !== "rent-edit-field") return;
  const partial = session.kind.partial;
  if (Object.keys(partial).length === 0) {
    setSession(chat, null);
    await sendTelegramMessage("No changes made.", { replyToMessageId: messageId });
    return;
  }
  const result = updateRentItem(session.kind.itemId, partial);
  if (!result.ok) {
    setSession(chat, null);
    await sendTelegramMessage(`❌ Save failed: ${result.error}`, { replyToMessageId: messageId });
    return;
  }
  setSession(chat, {
    ...session,
    kind: { ...session.kind, field: "", partial: {} },
  });
  const lines = Object.keys(partial).map((k) => `• <b>${k}</b>`).join("\n");
  await sendTelegramMessage(
    `✅ Updated ${justSet ?? Object.keys(partial)[0]}.\n\nChanged: ${lines}\n\n` +
      `Reply with more field names, or <code>done</code> to finish.`,
    { replyToMessageId: messageId },
  );
}

// ---------- Rent: delete flow ----------
async function handleRentDelete(chat: string, text: string, messageId: number) {
  const session = sessionFor(chat);
  if (!session || session.kind.type !== "rent-delete") return;
  const items = listEquipment();
  const trimmed = text.trim();
  if (/^(cancel|stop)$/i.test(trimmed)) {
    setSession(chat, null);
    await sendTelegramMessage("Cancelled. ✋");
    return;
  }
  if (trimmed === "all") {
    const ids = items.map((it) => it.id);
    const r = deleteRentItems(ids);
    setSession(chat, null);
    await sendTelegramMessage(
      r.ok ? `🗑 Deleted ${ids.length} rent items.` : `❌ ${r.error}`,
      { replyToMessageId: messageId },
    );
    return;
  }
  const parts = trimmed.split(",").map((s) => s.trim()).filter(Boolean);
  const nums = parts.map((p) => Number(p)).filter((n) => Number.isInteger(n));
  if (nums.length === 0) {
    await sendTelegramMessage("Reply with a number, a comma-separated list, or 'all'.", {
      replyToMessageId: messageId,
    });
    return;
  }
  if (nums.some((n) => n < 1 || n > items.length)) {
    await sendTelegramMessage(
      `Out of range. There are ${items.length} rent items.`,
      { replyToMessageId: messageId },
    );
    return;
  }
  const ids = nums.map((n) => items[n - 1].id);
  const r = deleteRentItems(ids);
  setSession(chat, null);
  const names = nums.map((n) => items[n - 1].name).join(", ");
  await sendTelegramMessage(
    r.ok ? `🗑 Deleted: ${names}` : `❌ ${r.error}`,
    { replyToMessageId: messageId },
  );
}

// ---------- DB writes ----------
type Result = { ok: true } | { ok: false; error: string };

function saveHike(h: ParsedHike): { ok: true; id: string } | { ok: false; error: string } {
  try {
    const existing = db.query<{ id: string }, [string]>("SELECT id FROM hikes WHERE id = ?").get(h.id);
    if (existing) return { ok: false, error: `A hike with id "${h.id}" already exists.` };
    db.run(
      `INSERT INTO hikes (
        id, title, location, region, date, duration, difficulty,
        spots_total, spots_left, price_pence, summary, description,
        image, hero, tags, guide
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        h.id, h.title, h.location, h.region, h.date, h.duration, h.difficulty,
        h.spotsTotal, h.spotsTotal, Math.round(h.priceGbp * 100),
        h.summary, h.description, h.image, h.hero,
        h.tags.join(","), h.guide,
      ],
    );
    return { ok: true, id: h.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

function updateHike(id: string, body: Record<string, unknown>): Result {
  try {
    const existing = db
      .query<{ id: string; spots_left: number; spots_total: number }, [string]>(
        "SELECT id, spots_left, spots_total FROM hikes WHERE id = ?",
      )
      .get(id);
    if (!existing) return { ok: false, error: "Hike not found." };
    const updates: string[] = [];
    const values: (string | number)[] = [];
    const map: Record<string, string> = {
      title: "title",
      location: "location",
      region: "region",
      date: "date",
      duration: "duration",
      difficulty: "difficulty",
      summary: "summary",
      description: "description",
      image: "image",
      hero: "hero",
      guide: "guide",
    };
    for (const [k, col] of Object.entries(map)) {
      if (body[k] !== undefined) {
        updates.push(`${col} = ?`);
        values.push(body[k] as string);
      }
    }
    if (body.spotsTotal !== undefined) {
      const taken = existing.spots_total - existing.spots_left;
      const newSpots = Math.max(0, Number(body.spotsTotal));
      const newLeft = Math.max(0, newSpots - taken);
      updates.push("spots_total = ?", "spots_left = ?");
      values.push(newSpots, newLeft);
    }
    if (body.priceGbp !== undefined) {
      updates.push("price_pence = ?");
      values.push(Math.round(Number(body.priceGbp) * 100));
    }
    if (body.tags !== undefined && Array.isArray(body.tags)) {
      updates.push("tags = ?");
      values.push((body.tags as string[]).join(","));
    }
    if (updates.length === 0) return { ok: true };
    values.push(id);
    db.run(`UPDATE hikes SET ${updates.join(", ")} WHERE id = ?`, values);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

function deleteHikes(ids: string[]): Result {
  try {
    let count = 0;
    for (const id of ids) {
      const r = db.run("DELETE FROM hikes WHERE id = ?", [id]);
      count += r.changes;
    }
    return count > 0 ? { ok: true } : { ok: false, error: "No hikes deleted." };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ---------- rent DB writes ----------
type ParsedRent = {
  id: string;
  type: "tent" | "bnb" | "gear";
  name: string;
  summary: string;
  description: string;
  image: string;
  location: string;
  pricePerNightGbp: number;
  capacity: number;
  totalUnits: number;
  availableUnits: number;
  unitLabel: string;
  features: string[];
};

function parseRentText(input: string, imageHint?: string):
  | { ok: true; item: ParsedRent }
  | { ok: false; errors: { field: string; message: string }[] } {
  const errors: { field: string; message: string }[] = [];
  const fields: Record<string, string> = {};
  for (const line of input.split(/\r?\n/)) {
    const m = line.match(/^\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*(.+?)\s*$/);
    if (m) fields[m[1].toLowerCase()] = m[2];
  }
  // Aliases
  if (fields["price"] && !fields["pricepernightgbp"]) fields["pricepernightgbp"] = fields["price"];
  if (fields["per_night"] && !fields["pricepernightgbp"]) fields["pricepernightgbp"] = fields["per_night"];

  const id = fields["id"]?.trim();
  if (!id) errors.push({ field: "id", message: "Add an id like <code>4p-tent-ld</code>." });

  const type = (fields["type"] ?? "").toLowerCase();
  if (!["tent", "bnb", "gear"].includes(type)) {
    errors.push({ field: "type", message: "Must be one of: tent, bnb, gear." });
  }

  const name = fields["name"]?.trim();
  if (!name) errors.push({ field: "name", message: "Add a name." });

  const summary = fields["summary"]?.trim();
  if (!summary) errors.push({ field: "summary", message: "Add a one-line summary." });

  const description = fields["description"]?.trim();
  if (!description) errors.push({ field: "description", message: "Add a longer description." });

  const location = fields["location"]?.trim();
  if (!location) errors.push({ field: "location", message: "Add a location." });

  const price = Number(fields["pricepernightgbp"] ?? "");
  if (!Number.isFinite(price) || price < 0) {
    errors.push({ field: "pricePerNightGbp", message: "Add a non-negative number." });
  }

  const capacity = Number(fields["capacity"] ?? "");
  if (!Number.isInteger(capacity) || capacity < 1) {
    errors.push({ field: "capacity", message: "Add a positive integer." });
  }

  const totalUnits = Number(fields["totalUnits"] ?? fields["stock"] ?? "");
  if (!Number.isInteger(totalUnits) || totalUnits < 0) {
    errors.push({ field: "totalUnits", message: "Add a non-negative integer." });
  }

  const availableUnits = Number(fields["availableUnits"] ?? "");
  if (!Number.isInteger(availableUnits) || availableUnits < 0) {
    errors.push({ field: "availableUnits", message: "Add a non-negative integer." });
  }

  const unitLabel = fields["unitLabel"] ?? "per night";
  if (!VALID_UNIT_LABELS.includes(unitLabel as UnitLabel)) {
    errors.push({ field: "unitLabel", message: `Must be one of: ${VALID_UNIT_LABELS.join(", ")}.` });
  }

  const image = (fields["image"] ?? imageHint ?? "/images/tent-camp.jpg").trim();
  const features = (fields["features"] ?? fields["amenities"] ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (errors.length > 0) return { ok: false, errors };

  return {
    ok: true,
    item: {
      id: id!,
      type: type as "tent" | "bnb" | "gear",
      name: name!,
      summary: summary!,
      description: description!,
      image,
      location: location!,
      pricePerNightGbp: price,
      capacity,
      totalUnits,
      availableUnits,
      unitLabel,
      features,
    },
  };
}

function saveRentItem(it: ParsedRent): { ok: true; id: string } | { ok: false; error: string } {
  try {
    const existing = db.query<{ id: string }, [string]>("SELECT id FROM equipment WHERE id = ?").get(it.id);
    if (existing) return { ok: false, error: `An item with id "${it.id}" already exists.` };
    db.run(
      `INSERT INTO equipment
        (id, type, name, summary, description, image, location, price_pence, capacity, total_units, available_units, unit_label, features, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        it.id, it.type, it.name, it.summary, it.description, it.image, it.location,
        Math.round(it.pricePerNightGbp * 100), it.capacity, it.totalUnits, it.availableUnits, it.unitLabel, it.features.join(","),
        Date.now(),
      ],
    );
    return { ok: true, id: it.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

function updateRentItem(id: string, body: Record<string, unknown>): Result {
  try {
    const existing = db
      .query<{ id: string; total_units: number }, [string]>(
        "SELECT id, total_units FROM equipment WHERE id = ?",
      )
      .get(id);
    if (!existing) return { ok: false, error: "Rent item not found." };
    const updates: string[] = [];
    const values: (string | number)[] = [];
    const map: Record<string, string> = {
      name: "name",
      type: "type",
      summary: "summary",
      description: "description",
      location: "location",
      image: "image",
    };
    for (const [k, col] of Object.entries(map)) {
      if (body[k] !== undefined) {
        updates.push(`${col} = ?`);
        values.push(body[k] as string);
      }
    }
    if (body.pricePerNightGbp !== undefined) {
      updates.push("price_pence = ?");
      values.push(Math.round(Number(body.pricePerNightGbp) * 100));
    }
    if (body.capacity !== undefined) {
      updates.push("capacity = ?");
      values.push(Number(body.capacity));
    }
    if (body.totalUnits !== undefined) {
      const n = Number(body.totalUnits);
      updates.push("total_units = ?");
      values.push(n);
    }
    if (body.availableUnits !== undefined) {
      const n = Number(body.availableUnits);
      const total =
        body.totalUnits !== undefined
          ? Number(body.totalUnits)
          : Number(existing.total_units ?? 0);
      const clamped = Math.max(0, Math.min(n, total));
      updates.push("available_units = ?");
      values.push(clamped);
    }
    if (body.unitLabel !== undefined) {
      updates.push("unit_label = ?");
      values.push(String(body.unitLabel));
    }
    if (body.features !== undefined && Array.isArray(body.features)) {
      updates.push("features = ?");
      values.push((body.features as string[]).join(","));
    }
    if (updates.length === 0) return { ok: true };
    values.push(id);
    db.run(`UPDATE equipment SET ${updates.join(", ")} WHERE id = ?`, values);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

function deleteRentItems(ids: string[]): Result {
  try {
    let count = 0;
    for (const id of ids) {
      const r = db.run("DELETE FROM equipment WHERE id = ?", [id]);
      count += r.changes;
    }
    return count > 0 ? { ok: true } : { ok: false, error: "No items deleted." };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ---------- help message ----------
function buildHelp(): string {
  return (
    "<b>Badr Adventures admin bot</b>\n\n" +
    "<b>Hikes</b>\n" +
    "• /new-hike &lt;text&gt; — parse a hike from one line + a <code>Description:</code> block\n" +
    "• /new-hike — interactive: I'll ask for the description\n" +
    "• /edit-hike — list hikes, pick one, then change any of: title, date, duration, location, region, difficulty, spots, price, summary, description, image, guide, tags\n" +
    "• /delete-hike — list hikes, pick one or many, or <code>all</code>\n\n" +
    "<b>Rent items</b>\n" +
    "• /new-rent &lt;fields&gt; — parse a rent item (one field per line)\n" +
    "• /new-rent — interactive: I'll ask for the fields\n" +
    "• /edit-rent — list items, pick one, change any of: name, type, summary, description, location, pricePerNightGbp, capacity, totalUnits, availableUnits, unitLabel, image, features\n" +
    "• /delete-rent — list items, pick one or many, or <code>all</code>\n\n" +
    "<b>Other</b>\n" +
    "• /drafts — show your current hike draft\n" +
    "• /cancel — abort the current multi-step flow\n" +
    "• /help — this message"
  );
}

// ---------- unused callback stub (kept for compat) ----------
async function handleCallback(_cb: TelegramCallbackQuery) {
  // No inline keyboards — we use text confirmation only.
  return;
}

// ---------- Telegram types (minimal) ----------
type TelegramUpdate = {
  message?: {
    message_id: number;
    chat: { id: number };
    text?: string;
    caption?: string;
    photo?: Array<{ file_id: string }>;
  };
  callback_query?: TelegramCallbackQuery;
};

type TelegramCallbackQuery = {
  id: string;
  data?: string;
  message?: { message_id: number; chat: { id: number } } | undefined;
};
