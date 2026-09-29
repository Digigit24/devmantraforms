import { describe, expect, it } from 'vitest';
import { config } from '@/middleware';

// Structural check on the middleware's route matcher itself, rather than invoking
// middleware() directly — Next.js applies `config.matcher` before middleware() ever runs,
// so the real behavioral guarantee ("this path never sees the admin auth check") lives in
// this config, not in the function body.
function matcherCoversPath(matcher: string[], path: string): boolean {
  return matcher.some((pattern) => {
    // Every pattern here is either an exact path ("/") or "<prefix>/:path*".
    if (pattern === path) return true;
    const prefix = pattern.replace(/\/:path\*$/, '');
    return path === prefix || path.startsWith(`${prefix}/`);
  });
}

describe('admin middleware route matcher', () => {
  it('covers every CeliyoForms admin page and API route', () => {
    for (const path of [
      '/',
      '/dashboard',
      '/dashboard/anything',
      '/forms',
      '/responses/form_1',
      '/responses/form_1/sub_1',
      '/settings/mcp',
      '/settings/storage',
      '/api/forms',
      '/api/forms/form_1',
      '/api/forms/form_1/publish',
    ]) {
      expect(matcherCoversPath(config.matcher, path), `expected matcher to cover ${path}`).toBe(true);
    }
  });

  it('does not cover public respondent routes or the MCP transport', () => {
    for (const path of [
      '/f/form_1',
      '/api/sessions',
      '/api/sessions/sess_1/answer',
      '/api/artifacts/upload',
      '/api/mcp',
      '/api/mcp/demo',
    ]) {
      expect(matcherCoversPath(config.matcher, path), `expected matcher to NOT cover ${path}`).toBe(false);
    }
  });

  it('does not cover unrelated legacy Dev Mantra routes', () => {
    for (const path of ['/api/admin/leads', '/api/submit', '/diagnostic', '/results/abc']) {
      expect(matcherCoversPath(config.matcher, path), `expected matcher to NOT cover ${path}`).toBe(false);
    }
  });
});
