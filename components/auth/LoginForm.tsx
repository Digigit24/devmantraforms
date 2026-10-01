'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface LoginResponse {
  ok?: boolean;
  error?: string;
}

interface Props {
  from?: string;
}

export default function LoginForm({ from }: Props) {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForgotNote, setShowForgotNote] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!username.trim() || !password) {
      setError('Enter your username and password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, remember_me: rememberMe }),
      });
      const data = await response.json() as LoginResponse;
      if (!response.ok || !data.ok) {
        setError(data.error ?? 'Could not sign in. Please try again.');
        return;
      }
      router.replace(from && from.startsWith('/') ? from : '/dashboard');
      router.refresh();
    } catch {
      setError('Could not reach the server. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-sm rounded-2xl border border-slate-200/80 bg-white p-8 shadow-2xl shadow-slate-900/10">
      <h2 className="font-heading text-2xl font-black text-slate-950">Welcome back</h2>
      <p className="mt-1.5 text-sm text-slate-600">Sign in to manage forms, interviews and responses.</p>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
        {error && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="username" className="block text-sm font-semibold text-slate-700">
            Email / Username
          </label>
          <input
            id="username"
            name="username"
            type="text"
            autoComplete="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-950 placeholder:text-slate-400 focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
            placeholder="you@company.com"
          />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="block text-sm font-semibold text-slate-700">
              Password
            </label>
            <button
              type="button"
              onClick={() => setShowForgotNote((value) => !value)}
              className="text-sm font-semibold text-brand-blue hover:underline focus:outline-none focus-visible:underline"
            >
              Forgot password?
            </button>
          </div>
          <div className="relative mt-1.5">
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 pr-11 text-sm text-slate-950 placeholder:text-slate-400 focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-xs font-semibold text-slate-500 hover:text-slate-700 focus:outline-none focus-visible:text-brand-blue"
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
          {showForgotNote && (
            <p className="mt-2 text-xs text-slate-500">
              Contact your workspace administrator to reset this password.
            </p>
          )}
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(event) => setRememberMe(event.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-brand-blue focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/30"
          />
          Remember me
        </label>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-lg bg-brand-blue px-4 py-2.5 text-sm font-bold text-white transition hover:bg-brand-blue/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/50 disabled:opacity-60"
        >
          {isSubmitting ? 'Signing in…' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}
