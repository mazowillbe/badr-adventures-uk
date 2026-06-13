// Lightweight Stripe REST helper. Avoids depending on the official SDK so the
// project stays small. Only the endpoints we need are implemented.

const STRIPE_API = "https://api.stripe.com/v1";

export class StripeError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

function basicAuthHeader(): Record<string, string> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new StripeError(503, "Stripe is not configured.");
  return { Authorization: `Basic ${Buffer.from(key + ":").toString("base64")}` };
}

async function stripePost<T>(path: string, body: Record<string, string>): Promise<T> {
  const form = new URLSearchParams();
  for (const [k, v] of Object.entries(body)) form.append(k, v);
  const res = await fetch(`${STRIPE_API}${path}`, {
    method: "POST",
    headers: { ...basicAuthHeader(), "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new StripeError(res.status, text || `Stripe error ${res.status}`);
  }
  return JSON.parse(text) as T;
}

async function stripeGet<T>(path: string): Promise<T> {
  const res = await fetch(`${STRIPE_API}${path}`, { headers: basicAuthHeader() });
  const text = await res.text();
  if (!res.ok) {
    throw new StripeError(res.status, text || `Stripe error ${res.status}`);
  }
  return JSON.parse(text) as T;
}

export type StripeCheckoutSession = {
  id: string;
  url: string;
  amount_total: number | null;
  payment_status: string;
  customer_email: string | null;
  metadata: Record<string, string>;
};

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export async function createCheckoutSession(args: {
  hikeTitle: string;
  amountPence: number;
  successUrl: string;
  cancelUrl: string;
  customerEmail: string;
  metadata: Record<string, string>;
}): Promise<StripeCheckoutSession> {
  return stripePost<StripeCheckoutSession>("/checkout/sessions", {
    "payment_method_types[0]": "card",
    mode: "payment",
    "line_items[0][price_data][currency]": "gbp",
    "line_items[0][price_data][unit_amount]": String(args.amountPence),
    "line_items[0][price_data][product_data][name]": args.hikeTitle,
    "line_items[0][quantity]": "1",
    success_url: args.successUrl,
    cancel_url: args.cancelUrl,
    customer_email: args.customerEmail,
    ...Object.fromEntries(
      Object.entries(args.metadata).map(([k, v]) => [`metadata[${k}]`, v]),
    ),
  });
}

export async function retrieveCheckoutSession(
  id: string,
): Promise<StripeCheckoutSession> {
  return stripeGet<StripeCheckoutSession>(`/checkout/sessions/${id}`);
}

// Lightweight Stripe webhook signature verifier (HMAC SHA-256 over
// `${timestamp}.${body}`). Returns true when the signature is valid.
export async function verifyStripeSignature(
  body: string,
  header: string,
  secret: string,
): Promise<boolean> {
  const parts = header.split(",").reduce<Record<string, string>>((acc, part) => {
    const [k, v] = part.split("=");
    if (k && v) acc[k] = v;
    return acc;
  }, {});
  const t = parts["t"];
  const v1 = parts["v1"];
  if (!t || !v1) return false;
  const expected = await hmacSha256Hex(secret, `${t}.${body}`);
  return timingSafeEqual(expected, v1);
}

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
