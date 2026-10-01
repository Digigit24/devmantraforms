import { createHmac, timingSafeEqual } from 'crypto';

// CeliyoForms admin session — replaces HTTP Basic Auth as the admin-UI transport so a real
// login page can exist (a browser's native Basic Auth prompt can't be styled or driven by
// a custom form). The credential source is unchanged: still the same single
// CELIYO_ADMIN_USERNAME/CELIYO_ADMIN_PASSWORD pair from lib/agentic-forms/admin-auth.ts's
// prior implementation. Session tokens are signed with HMAC-SHA256 keyed by the admin
// password itself, so no separate session secret needs to be provisioned, and validation
// needs no server-side session store — just recompute the signature and check the
// embedded expiry. This is deliberately the smallest mechanism that supports a real login
// form, not a general-purpose auth system.
export const ADMIN_SESSION_COOKIE = 'celiyo_admin_session';

const REMEMBER_ME_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const DEFAULT_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex');
}

export function verifyAdminCredentials(username: string, password: string): boolean {
  const expectedUsername = process.env.CELIYO_ADMIN_USERNAME;
  const expectedPassword = process.env.CELIYO_ADMIN_PASSWORD;
  if (!expectedUsername || !expectedPassword) return false;
  return username === expectedUsername && password === expectedPassword;
}

export interface AdminSessionToken {
  value: string;
  /** Cookie Max-Age in seconds; omit entirely for a browser-session-only cookie. */
  maxAgeSeconds?: number;
}

export function createAdminSessionToken(rememberMe: boolean): AdminSessionToken {
  const password = process.env.CELIYO_ADMIN_PASSWORD;
  if (!password) {
    throw new Error('CELIYO_ADMIN_PASSWORD is not configured.');
  }
  const ttlMs = rememberMe ? REMEMBER_ME_TTL_MS : DEFAULT_TTL_MS;
  const expiresAt = Date.now() + ttlMs;
  const payload = String(expiresAt);
  const value = `${payload}.${sign(payload, password)}`;
  return rememberMe ? { value, maxAgeSeconds: Math.floor(ttlMs / 1000) } : { value };
}

export function isValidAdminSessionToken(token: string | null | undefined): boolean {
  if (!token) return false;
  const password = process.env.CELIYO_ADMIN_PASSWORD;
  if (!password) return false;

  const separatorAt = token.lastIndexOf('.');
  if (separatorAt === -1) return false;
  const payload = token.slice(0, separatorAt);
  const signature = token.slice(separatorAt + 1);
  if (!payload || !signature) return false;

  const expected = sign(payload, password);
  const expectedBuf = Buffer.from(expected, 'utf8');
  const actualBuf = Buffer.from(signature, 'utf8');
  if (expectedBuf.length !== actualBuf.length || !timingSafeEqual(expectedBuf, actualBuf)) {
    return false;
  }

  const expiresAt = Number(payload);
  if (!Number.isFinite(expiresAt)) return false;
  return Date.now() < expiresAt;
}
