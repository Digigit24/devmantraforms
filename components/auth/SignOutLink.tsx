'use client';

import { useRouter } from 'next/navigation';

export default function SignOutLink() {
  const router = useRouter();

  async function handleSignOut() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={() => void handleSignOut()}
      className="ml-1 rounded-md border-l border-slate-200 px-3 py-2 pl-4 text-sm font-semibold text-slate-600 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/30"
    >
      Sign out
    </button>
  );
}
