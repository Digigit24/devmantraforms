import { NextResponse, type NextRequest } from 'next/server';
import { adminUnauthorizedResponse, checkAdminBasicAuth } from '@/lib/agentic-forms/admin-auth';

// Guards the CeliyoForms human/admin surface (dashboard, form builder, settings,
// responses UI, and the form-management API) behind HTTP Basic Auth. Deliberately does
// NOT cover: /f/[formId] and the respondent session/artifact APIs (must stay public for
// people filling out a form), /api/mcp/* (has its own per-tenant Bearer key auth — admin
// credentials must never substitute for an MCP key), and the unrelated legacy Dev Mantra
// routes (/api/admin/*, /api/submit, /diagnostic, /results/*), which are a separate system
// with their own existing auth.
export function middleware(request: NextRequest) {
  if (!checkAdminBasicAuth(request)) {
    return adminUnauthorizedResponse();
  }
  return NextResponse.next();
}

export const config = {
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
