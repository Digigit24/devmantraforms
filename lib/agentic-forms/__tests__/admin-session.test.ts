import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ADMIN_SESSION_COOKIE,
  createAdminSessionToken,
  isValidAdminSessionToken,
  verifyAdminCredentials,
} from '@/lib/agentic-forms/admin-session';

beforeEach(() => {
  vi.stubEnv('CELIYO_ADMIN_USERNAME', 'admin');
  vi.stubEnv('CELIYO_ADMIN_PASSWORD', 'secret');
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe('verifyAdminCredentials', () => {
  it('accepts the configured username and password', () => {
    expect(verifyAdminCredentials('admin', 'secret')).toBe(true);
  });

  it('rejects a wrong password', () => {
    expect(verifyAdminCredentials('admin', 'wrong')).toBe(false);
  });

  it('rejects a wrong username', () => {
    expect(verifyAdminCredentials('someone-else', 'secret')).toBe(false);
  });

  it('fails closed when admin credentials are not configured at all', () => {
    vi.stubEnv('CELIYO_ADMIN_USERNAME', '');
    vi.stubEnv('CELIYO_ADMIN_PASSWORD', '');
    expect(verifyAdminCredentials('', '')).toBe(false);
  });

  it('never reuses legacy Dev Mantra admin env vars', () => {
    vi.stubEnv('ADMIN_API_USERNAME', 'legacy-admin');
    vi.stubEnv('ADMIN_API_PASSWORD', 'legacy-secret');
    vi.stubEnv('CELIYO_ADMIN_USERNAME', '');
    vi.stubEnv('CELIYO_ADMIN_PASSWORD', '');
    expect(verifyAdminCredentials('legacy-admin', 'legacy-secret')).toBe(false);
  });
});

describe('createAdminSessionToken / isValidAdminSessionToken', () => {
  it('round-trips a valid token', () => {
    const token = createAdminSessionToken(false);
    expect(isValidAdminSessionToken(token.value)).toBe(true);
  });

  it('omits maxAgeSeconds for a non-remember-me (browser-session) token', () => {
    const token = createAdminSessionToken(false);
    expect(token.maxAgeSeconds).toBeUndefined();
  });

  it('sets a 30-day maxAgeSeconds for a remember-me token', () => {
    const token = createAdminSessionToken(true);
    expect(token.maxAgeSeconds).toBe(30 * 24 * 60 * 60);
  });

  it('rejects a missing token', () => {
    expect(isValidAdminSessionToken(undefined)).toBe(false);
    expect(isValidAdminSessionToken(null)).toBe(false);
    expect(isValidAdminSessionToken('')).toBe(false);
  });

  it('rejects a malformed token', () => {
    expect(isValidAdminSessionToken('not-a-real-token')).toBe(false);
    expect(isValidAdminSessionToken('123456.')).toBe(false);
    expect(isValidAdminSessionToken('.somesignature')).toBe(false);
  });

  it('rejects a token whose signature was tampered with', () => {
    const token = createAdminSessionToken(false);
    const tampered = `${token.value}f`;
    expect(isValidAdminSessionToken(tampered)).toBe(false);
  });

  it('rejects a token signed under a different password', () => {
    const token = createAdminSessionToken(false);
    vi.stubEnv('CELIYO_ADMIN_PASSWORD', 'a-different-secret');
    expect(isValidAdminSessionToken(token.value)).toBe(false);
  });

  it('rejects a token whose embedded expiry has passed', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    const token = createAdminSessionToken(false);
    expect(isValidAdminSessionToken(token.value)).toBe(true);

    vi.setSystemTime(new Date('2026-01-02T00:00:01.000Z')); // past the 12h default TTL
    expect(isValidAdminSessionToken(token.value)).toBe(false);
  });

  it('is invalid when CELIYO_ADMIN_PASSWORD becomes unset after the token was issued', () => {
    const token = createAdminSessionToken(false);
    vi.stubEnv('CELIYO_ADMIN_PASSWORD', '');
    expect(isValidAdminSessionToken(token.value)).toBe(false);
  });
});

describe('ADMIN_SESSION_COOKIE', () => {
  it('is a stable, specific cookie name', () => {
    expect(ADMIN_SESSION_COOKIE).toBe('celiyo_admin_session');
  });
});
