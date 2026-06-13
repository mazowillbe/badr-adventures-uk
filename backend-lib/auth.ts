import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import type { Context } from "hono";
import { db } from "./db";

const COOKIE_NAME = "badr_session";
const ALG = "HS256";

function getSecret(): Uint8Array {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 16) {
    throw new Error("JWT_SECRET is missing or too short (min 16 chars).");
  }
  return new TextEncoder().encode(s);
}

export type SessionPayload = {
  sub: string;
  email: string;
  name: string;
  isAdmin: boolean;
};

export type UserRow = {
  id: number;
  email: string;
  name: string;
  password_hash: string;
  is_admin: number;
  created_at: number;
};

export class HTTPError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function isSecureFromContext(c: Context): boolean {
  const url = new URL(c.req.url);
  return url.protocol === "https:";
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (
      typeof payload.sub === "string" &&
      typeof payload.email === "string" &&
      typeof payload.name === "string"
    ) {
      return {
        sub: payload.sub,
        email: payload.email,
        name: payload.name,
        isAdmin: Boolean((payload as { isAdmin?: unknown }).isAdmin),
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function setSessionCookie(c: Context, token: string, secure: boolean) {
  c.header(
    "Set-Cookie",
    `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax${
      secure ? "; Secure" : ""
    }; Max-Age=${60 * 60 * 24 * 7}`,
  );
}

export function clearSessionCookie(c: Context, secure: boolean) {
  c.header(
    "Set-Cookie",
    `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax${
      secure ? "; Secure" : ""
    }; Max-Age=0`,
  );
}

export function readSession(c: Context): SessionPayload | null {
  const raw = c.req.header("cookie") || "";
  const match = raw
    .split(/;\s*/)
    .map((p) => p.split("="))
    .find(([k]) => k === COOKIE_NAME);
  if (!match) return null;
  const token = decodeURIComponent(match.slice(1).join("="));
  // Synchronous JWT verify not available; use a cached promise pattern.
  // We accept a small race in that extremely unusual case.
  const cached = (verifySession as unknown as { __cache?: Map<string, SessionPayload | null> }).__cache;
  if (cached && cached.has(token)) return cached.get(token) ?? null;
  return null;
}

export async function readSessionAsync(c: Context): Promise<SessionPayload | null> {
  const raw = c.req.header("cookie") || "";
  const match = raw
    .split(/;\s*/)
    .map((p) => p.split("="))
    .find(([k]) => k === COOKIE_NAME);
  if (!match) return null;
  const token = decodeURIComponent(match.slice(1).join("="));
  return verifySession(token);
}

export function loadUserRow(email: string): UserRow | null {
  const row = db
    .query<UserRow, [string]>(
      "SELECT id, email, name, password_hash, is_admin, created_at FROM users WHERE LOWER(email) = LOWER(?)",
    )
    .get(email);
  return row ?? null;
}

export async function requireUser(c: Context): Promise<SessionPayload> {
  const session = await readSessionAsync(c);
  if (!session) throw new HTTPError(401, "You need to be signed in.");
  return session;
}

export async function requireAdmin(c: Context): Promise<SessionPayload> {
  const session = await requireUser(c);
  if (!session.isAdmin) throw new HTTPError(403, "Admin access only.");
  return session;
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
