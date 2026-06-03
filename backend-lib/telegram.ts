// Telegram helpers. Primary transport: Bot API via fetch.
// https://core.telegram.org/bots/api
//
// All outbound messages route to a single admin chat id configured via
// `TELEGRAM_ADMIN_CHAT_ID`. Inbound updates (text + photos) come in on a
// webhook registered at /api/telegram/webhook.
//
// The bot is intentionally read-only from the public web: only the
// allow-listed admin chat can issue commands. Any message from another
// chat id is silently dropped.

const TELEGRAM_API = "https://api.telegram.org/bot";

export function adminChatId(): string | null {
  const id = process.env.TELEGRAM_ADMIN_CHAT_ID;
  return id && id.length > 0 ? id : null;
}

export function isTelegramConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_ADMIN_CHAT_ID);
}

function botToken(): string | null {
  const t = process.env.TELEGRAM_BOT_TOKEN;
  return t && t.length > 0 ? t : null;
}

export type TelegramSendResult =
  | { ok: true; messageId: number }
  | { ok: false; error: string };

export async function sendTelegramMessage(
  text: string,
  opts?: { replyToMessageId?: number; parseMode?: "HTML" | "Markdown" | "MarkdownV2" },
): Promise<TelegramSendResult> {
  const token = botToken();
  const chatId = adminChatId();
  if (!token || !chatId) return { ok: false, error: "Telegram not configured" };
  try {
    const res = await fetch(`${TELEGRAM_API}${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: opts?.parseMode ?? "HTML",
        disable_web_page_preview: true,
        reply_to_message_id: opts?.replyToMessageId,
      }),
    });
    const body = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      result?: { message_id?: number };
      description?: string;
    };
    if (!res.ok || !body.ok) {
      return { ok: false, error: body.description || `HTTP ${res.status}` };
    }
    return { ok: true, messageId: body.result?.message_id ?? 0 };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export type TelegramPhotoResult =
  | { ok: true; messageId: number }
  | { ok: false; error: string };

export async function sendTelegramPhoto(
  photoUrl: string,
  caption?: string,
  opts?: { replyToMessageId?: number },
): Promise<TelegramPhotoResult> {
  const token = botToken();
  const chatId = adminChatId();
  if (!token || !chatId) return { ok: false, error: "Telegram not configured" };
  try {
    const res = await fetch(`${TELEGRAM_API}${token}/sendPhoto`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        photo: photoUrl,
        caption: caption?.slice(0, 1024),
        parse_mode: "HTML",
        reply_to_message_id: opts?.replyToMessageId,
      }),
    });
    const body = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      result?: { message_id?: number };
      description?: string;
    };
    if (!res.ok || !body.ok) {
      return { ok: false, error: body.description || `HTTP ${res.status}` };
    }
    return { ok: true, messageId: body.result?.message_id ?? 0 };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function answerCallbackQuery(
  callbackQueryId: string,
  text?: string,
  showAlert = false,
): Promise<boolean> {
  const token = botToken();
  if (!token) return false;
  try {
    const res = await fetch(`${TELEGRAM_API}${token}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text,
        show_alert: showAlert,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function editMessageText(
  messageId: number,
  text: string,
  opts?: { replyMarkup?: unknown },
): Promise<boolean> {
  const token = botToken();
  const chatId = adminChatId();
  if (!token || !chatId) return false;
  try {
    const res = await fetch(`${TELEGRAM_API}${token}/editMessageText`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
        reply_markup: opts?.replyMarkup,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function isAllowedChat(chatId: unknown): boolean {
  if (typeof chatId !== "number" && typeof chatId !== "string") return false;
  const allowed = adminChatId();
  if (!allowed) return false;
  return String(chatId) === String(allowed);
}
