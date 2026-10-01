import { NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE } from '@/lib/agentic-forms/admin-session';

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_SESSION_COOKIE, '', { path: '/', maxAge: 0 });
  return response;
}
