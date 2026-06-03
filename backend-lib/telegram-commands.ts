// Routes for the Telegram bot.
//
// Two endpoints:
//   GET  /api/telegram/webhook  - placeholder that explains the route
//   POST /api/telegram/webhook  - main inbound handler (text + photos + callbacks)
//
// Plus a small admin tool:
//   POST /api/admin/telegram/test  - sends a test message from the admin panel
//
// All state is ephemeral — we keep nothing on the server. A "draft" is the
// most recent unconfirmed parse in memory (Map keyed by chat id). When the
// admin taps "Save", we insert into the hikes table and clear the draft.

import { Hono } from "hono";
import { z } from "zod";
import { db } from "./db";
import {
  answerCallbackQuery,
  editMessageText,
  isAllowedChat,
  isTelegramConfigured,
  sendTelegramMessage,
  sendTelegramPhoto,
} from "./telegram";
import { parseHikeText, type ParsedHike } from "./telegram-hike-parser";

// ---------- in-memory draft store ----------
type Draft = {
  parsed: ParsedHike;
  sourceMessageId: number;
  previewMessageId: number | null;
  imageFileId?: string;
};
const drafts = new Map<string, Draft>();

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

function buildConfirmMarkup(): unknown {
  return {
    inline_keyboard: [
      [
        { text: "✅ Save hike", callback_data: "hike:save" },
        { text: "✏️ Edit", callback_data: "hike:edit" },
      ],
      [
        { text: "❌ Discard", callback_data: "hike:discard" },
      ],
    ],
  };
}

function buildErrorReply(errors: { field: string; message: string }[]): string {
  const lines = errors.map((e) => `• <b>${e.field}</b>: ${e.message}`);
  return (
    `<b>I couldn't read that as a hike.</b>\n` +
    `Please add:\n` +
    `${lines.join("\n")}\n\n` +
    `Example: <code>Yorkshire Dales 3 day trek, £85, hard, 12 spots, 2026-08-12, led by Abu Jabal</code>`
  );
}

// ---------- public route mount ----------
export function mountTelegramRoutes(app: Hono) {
  // GET is just informational; Telegram only POSTs.
  app.get("/api/telegram/webhook", (c) =>
    c.json({
      ok: true,
      service: "badr-adventures-telegram",
      configured: isTelegramConfigured(),
      docs: "POST updates here. Set TELEGRAM_BOT_TOKEN + TELEGRAM_ADMIN_CHAT_ID, then register the webhook URL with the Bot API.",
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

    // Callback queries (button presses)
    if (update.callback_query) {
      await handleCallback(update.callback_query);
      return c.json({ ok: true });
    }

    const msg = update.message;
    if (!msg) return c.json({ ok: true, skipped: "no message" });

    if (!isAllowedChat(msg.chat.id)) {
      // Silently drop. We log so an operator can see in the dev terminal.
      console.warn(
        `[telegram] rejected message from chat ${msg.chat.id} (not allow-listed)`,
      );
      return c.json({ ok: true, dropped: "unauthorized chat" });
    }

    // Photo message (with optional caption) — caption is the hike text
    if (Array.isArray(msg.photo) && msg.photo.length > 0) {
      const best = msg.photo[msg.photo.length - 1];
      const caption = msg.caption ?? "";
      const fileId = best.file_id;
      const imageUrl = await getFileDownloadUrl(fileId);
      await handleHikeDraft(chatKey(msg.chat.id), caption, msg.message_id, imageUrl ?? undefined);
      return c.json({ ok: true });
    }

    // Plain text
    if (typeof msg.text === "string") {
      await handleTextCommand(chatKey(msg.chat.id), msg.text, msg.message_id);
      return c.json({ ok: true });
    }

    return c.json({ ok: true, skipped: "unsupported message type" });
  });

  // Admin: send a test message to yourself from the dashboard.
  app.post("/api/admin/telegram/test", async (c) => {
    try {
      const { requireAdmin } = await import("./auth");
      await requireAdmin(c);
      if (!isTelegramConfigured()) {
        return c.json({ ok: false, error: "Telegram not configured" }, 503);
      }
      const r = await sendTelegramMessage(
        "✅ Telegram is connected. New hikes sent here will be parsed automatically.",
      );
      if (r.ok) return c.json({ ok: true, messageId: r.messageId });
      return c.json({ ok: false, error: r.error }, 502);
    } catch (err) {
      return c.json({ ok: false, error: err instanceof Error ? err.message : "Error" }, 500);
    }
  });
}

// ---------- handler logic ----------
function chatKey(chatId: number | string): string {
  return String(chatId);
}

async function handleTextCommand(chat: string, text: string, messageId: number) {
  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();

  if (lower === "/start" || lower === "/help") {
    await sendTelegramMessage(
      `<b>Badr Adventures admin bot</b>\n\n` +
        `Send me a hike description and I'll parse it and add it to the site.\n\n` +
        `Example:\n` +
        `<code>Yorkshire Dales 3 day trek, £85, hard, 12 spots, 2026-08-12, led by Abu Jabal</code>\n\n` +
        `Commands:\n` +
        `/help — this message\n` +
        `/drafts — your unsaved drafts\n` +
        `/cancel — discard the current draft`,
    );
    return;
  }

  if (lower === "/cancel") {
    const had = drafts.delete(chat);
    await sendTelegramMessage(had ? "Draft discarded." : "No draft to discard.");
    return;
  }

  if (lower === "/drafts") {
    const d = drafts.get(chat);
    if (!d) {
      await sendTelegramMessage("No active draft. Send a hike description to start one.");
      return;
    }
    await sendTelegramMessage(buildHikeSummary(d.parsed), {
      replyToMessageId: messageId,
      replyMarkup: buildConfirmMarkup() as any,
    });
    return;
  }

  // Otherwise treat as a hike description
  await handleHikeDraft(chat, trimmed, messageId);
}

async function handleHikeDraft(
  chat: string,
  text: string,
  sourceMessageId: number,
  imageHint?: string,
) {
  const result = parseHikeText(text, { imageHint });
  if (!result.ok) {
    await sendTelegramMessage(buildErrorReply(result.errors), { replyToMessageId: sourceMessageId });
    return;
  }

  const draft: Draft = {
    parsed: result.hike,
    sourceMessageId,
    previewMessageId: null,
  };
  drafts.set(chat, draft);

  // Send preview with confirm buttons
  const preview = await sendTelegramMessage(buildHikeSummary(result.hike), {
    replyToMessageId: sourceMessageId,
    replyMarkup: buildConfirmMarkup() as any,
  });
  if (preview.ok) draft.previewMessageId = preview.messageId;
}

async function handleCallback(cb: TelegramCallbackQuery) {
  if (!isAllowedChat(cb.message?.chat.id)) {
    await answerCallbackQuery(cb.id, "Not authorised.", true);
    return;
  }
  const chat = chatKey(cb.message!.chat.id);
  const data = cb.data ?? "";
  const draft = drafts.get(chat);

  if (data === "hike:save") {
    if (!draft) {
      await answerCallbackQuery(cb.id, "No draft to save.", true);
      return;
    }
    const inserted = saveHike(draft.parsed);
    if (!inserted.ok) {
      await answerCallbackQuery(cb.id, "Save failed: " + inserted.error, true);
      await sendTelegramMessage(
        `<b>Couldn't save the hike:</b> ${inserted.error}\nDraft is still on file. Fix and resend, or /cancel.`,
      );
      return;
    }
    drafts.delete(chat);
    await answerCallbackQuery(cb.id, "Saved.");
    await editMessageText(
      cb.message!.message_id,
      buildHikeSummary(draft.parsed) + "\n\n✅ <b>Saved and live on the site.</b>",
    );
    const siteUrl = process.env.PUBLIC_SITE_URL ?? "https://badr-adventures-blackbox.zocomputer.io";
    await sendTelegramMessage(
      `Live at <a href="${siteUrl}/hikes/${inserted.id}">${siteUrl}/hikes/${inserted.id}</a>`,
    );
    return;
  }

  if (data === "hike:discard") {
    drafts.delete(chat);
    await answerCallbackQuery(cb.id, "Discarded.");
    if (draft?.previewMessageId) {
      await editMessageText(cb.message!.message_id, "<i>Draft discarded.</i>");
    }
    return;
  }

  if (data === "hike:edit") {
    await answerCallbackQuery(cb.id, "Reply with the corrected text.");
    if (draft) {
      await sendTelegramMessage(
        "Send the full hike description again with any fields corrected. The latest message wins.",
      );
    }
    return;
  }

  await answerCallbackQuery(cb.id);
}

// ---------- DB write ----------
type SaveResult = { ok: true; id: string } | { ok: false; error: string };

function saveHike(h: ParsedHike): SaveResult {
  try {
    // Check for duplicate id (date in slug).
    const existing = db.query<{ id: string }, [string]>("SELECT id FROM hikes WHERE id = ?").get(h.id);
    if (existing) {
      return { ok: false, error: `A hike with id "${h.id}" already exists. Try changing the title or date.` };
    }
    db.run(
      `INSERT INTO hikes (
        id, title, location, region, date, duration, difficulty,
        spots_total, spots_left, price_pence, summary, description,
        image, hero, tags, guide
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        h.id,
        h.title,
        h.location,
        h.region,
        h.date,
        h.duration,
        h.difficulty,
        h.spotsTotal,
        h.spotsTotal, // spots_left = spots_total on creation
        Math.round(h.priceGbp * 100),
        h.summary,
        h.description,
        h.image,
        h.hero,
        h.tags.join(","),
        h.guide,
      ],
    );
    return { ok: true, id: h.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ---------- Telegram shape (minimal) ----------
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
  message?: { message_id: number; chat: { id: number } };
};
