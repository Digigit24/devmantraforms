import { NextResponse, type NextRequest } from 'next/server';
import { ADMIN_SESSION_COOKIE, isValidAdminSessionToken } from '@/lib/agentic-forms/admin-session';

// Guards the CeliyoForms human/admin surface (dashboard, form builder, settings,
// responses UI, and the form-management API) behind a signed admin session cookie set by
// /login via /api/auth/login. Deliberately does NOT cover: /f/[formId] and the respondent
// session/artifact APIs (must stay public for people filling out a form), /api/mcp/* (has
// its own per-tenant Bearer key auth — admin credentials must never substitute for an MCP
// key), and the unrelated legacy Dev Mantra routes (/api/admin/*, /api/submit, /diagnostic,
// /results/*), which are a separate system with their own existing auth. /login itself is
// intentionally outside this matcher so it stays reachable while unauthenticated.
export function middleware(request: NextRequest) {
  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  if (isValidAdminSessionToken(token)) {
    return NextResponse.next();
  }

  if (request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: 'Admin authentication required.' } },
      { status: 401 },
    );
  }

  // Never derive the redirect's origin from request.url — behind a reverse proxy (Nginx)
  // that's the internal origin this process is actually bound to (e.g.
  // http://localhost:4015), not the public-facing host. NEXT_PUBLIC_SITE_URL is the only
  // source of truth for the public origin here; a localhost fallback would silently send
  // real browsers to an unreachable address instead of surfacing the misconfiguration, so
  // a missing value fails loudly instead.
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl) {
    return NextResponse.json(
      { error: { code: 'PROVIDER_UNAVAILABLE', message: 'NEXT_PUBLIC_SITE_URL is not configured.' } },
      { status: 500 },
    );
  }
  const loginUrl = new URL('/login', siteUrl);
  loginUrl.searchParams.set('from', request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // Node.js middleware runtime (stable since Next.js 15.2) — the session check needs
  // Node's crypto module (createHmac/timingSafeEqual) for HMAC verification, which the
  // default Edge runtime does not support.
  runtime: 'nodejs',
  matcher: [
    '/',
    '/dashboard/:path*',
    '/forms/:path*',
    '/responses/:path*',
    '/settings/mcp/:path*',
    '/settings/storage/:path*',
    '/api/forms/:path*',
  ],
};
