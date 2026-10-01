import { NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE, createAdminSessionToken, verifyAdminCredentials } from '@/lib/agentic-forms/admin-session';

export async function POST(request: Request) {
  let body: { username?: unknown; password?: unknown; remember_me?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const username = typeof body.username === 'string' ? body.username : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const rememberMe = body.remember_me === true;

  if (!username || !password) {
    return NextResponse.json({ error: 'Email/username and password are required.' }, { status: 400 });
  }

  if (!verifyAdminCredentials(username, password)) {
    return NextResponse.json({ error: 'Invalid username or password.' }, { status: 401 });
  }

  const session = createAdminSessionToken(rememberMe);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_SESSION_COOKIE, session.value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    ...(session.maxAgeSeconds !== undefined ? { maxAge: session.maxAgeSeconds } : {}),
  });
  return response;
}
