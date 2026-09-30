import { afterEach, describe, expect, it, vi } from 'vitest';
import { adminUnauthorizedResponse, checkAdminBasicAuth } from '@/lib/agentic-forms/admin-auth';

function basicAuthRequest(username: string, password: string) {
  const token = Buffer.from(`${username}:${password}`).toString('base64');
  return new Request('http://localhost/dashboard', {
    headers: { Authorization: `Basic ${token}` },
  });
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('checkAdminBasicAuth', () => {
  it('rejects a request with no Authorization header', () => {
    vi.stubEnv('CELIYO_ADMIN_USERNAME', 'admin');
    vi.stubEnv('CELIYO_ADMIN_PASSWORD', 'secret');
    const request = new Request('http://localhost/dashboard');
    expect(checkAdminBasicAuth(request)).toBe(false);
  });

  it('rejects a non-Basic Authorization header', () => {
    vi.stubEnv('CELIYO_ADMIN_USERNAME', 'admin');
    vi.stubEnv('CELIYO_ADMIN_PASSWORD', 'secret');
    const request = new Request('http://localhost/dashboard', { headers: { Authorization: 'Bearer whatever' } });
    expect(checkAdminBasicAuth(request)).toBe(false);
  });

  it('accepts valid admin credentials', () => {
    vi.stubEnv('CELIYO_ADMIN_USERNAME', 'admin');
    vi.stubEnv('CELIYO_ADMIN_PASSWORD', 'secret');
    expect(checkAdminBasicAuth(basicAuthRequest('admin', 'secret'))).toBe(true);
  });

  it('rejects an invalid password', () => {
    vi.stubEnv('CELIYO_ADMIN_USERNAME', 'admin');
    vi.stubEnv('CELIYO_ADMIN_PASSWORD', 'secret');
    expect(checkAdminBasicAuth(basicAuthRequest('admin', 'wrong'))).toBe(false);
  });

  it('rejects an invalid username', () => {
    vi.stubEnv('CELIYO_ADMIN_USERNAME', 'admin');
    vi.stubEnv('CELIYO_ADMIN_PASSWORD', 'secret');
    expect(checkAdminBasicAuth(basicAuthRequest('someone-else', 'secret'))).toBe(false);
  });

  it('fails closed when admin credentials are not configured at all', () => {
    vi.stubEnv('CELIYO_ADMIN_USERNAME', '');
    vi.stubEnv('CELIYO_ADMIN_PASSWORD', '');
    // Even a request that would otherwise "match" two empty strings must still be
    // rejected — unset credentials must never mean "auth disabled".
    expect(checkAdminBasicAuth(basicAuthRequest('', ''))).toBe(false);
  });

  it('never reuses legacy Dev Mantra admin env vars', () => {
    vi.stubEnv('ADMIN_API_USERNAME', 'legacy-admin');
    vi.stubEnv('ADMIN_API_PASSWORD', 'legacy-secret');
    vi.stubEnv('CELIYO_ADMIN_USERNAME', '');
    vi.stubEnv('CELIYO_ADMIN_PASSWORD', '');
    // Valid legacy credentials must not authenticate CeliyoForms admin routes.
    expect(checkAdminBasicAuth(basicAuthRequest('legacy-admin', 'legacy-secret'))).toBe(false);
  });
});

describe('adminUnauthorizedResponse', () => {
  it('returns 401 with a WWW-Authenticate Basic challenge and no secret leakage', async () => {
    const response = adminUnauthorizedResponse();
    expect(response.status).toBe(401);
    expect(response.headers.get('WWW-Authenticate')).toContain('Basic');
    expect(response.headers.get('WWW-Authenticate')).toContain('CeliyoForms');
    const body = await response.json();
    expect(JSON.stringify(body)).not.toMatch(/CELIYO_ADMIN|password/i);
  });
});
