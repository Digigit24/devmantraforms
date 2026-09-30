// CeliyoForms human/admin authentication — deliberately small (HTTP Basic Auth against a
// single set of credentials from environment variables), not shared with the legacy Dev
// Mantra admin auth (lib/admin-auth.ts) or with MCP's per-tenant API-key auth
// (lib/agentic-forms/auth.ts). This protects the CeliyoForms admin UI and form-management
// API only — public respondent routes (/f/[formId], /api/sessions/*,
// /api/artifacts/upload) and the MCP transport (/api/mcp/*) never use this.
const REALM = 'CeliyoForms Admin';

export function checkAdminBasicAuth(request: Request): boolean {
  const header = request.headers.get('authorization');
  if (!header?.startsWith('Basic ')) return false;

  const decoded = Buffer.from(header.slice(6), 'base64').toString('utf-8');
  const colonAt = decoded.indexOf(':');
  if (colonAt === -1) return false;

  const username = decoded.slice(0, colonAt);
  const password = decoded.slice(colonAt + 1);

  const expectedUsername = process.env.CELIYO_ADMIN_USERNAME;
  const expectedPassword = process.env.CELIYO_ADMIN_PASSWORD;
  if (!expectedUsername || !expectedPassword) return false;

  return username === expectedUsername && password === expectedPassword;
}

export function adminUnauthorizedResponse(): Response {
  return new Response(JSON.stringify({ error: { code: 'FORBIDDEN', message: 'Admin authentication required.' } }), {
    status: 401,
    headers: {
      'Content-Type': 'application/json',
      'WWW-Authenticate': `Basic realm="${REALM}"`,
    },
  });
}
