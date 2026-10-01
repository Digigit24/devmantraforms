import Logo from '@/components/ui/Logo';
import LoginForm from '@/components/auth/LoginForm';

export const metadata = {
  title: 'Sign in',
};

interface PageProps {
  searchParams: Promise<{ from?: string }>;
}

export default async function LoginPage({ searchParams }: PageProps) {
  const { from } = await searchParams;
  return (
    <main className="flex min-h-screen bg-[#f6f7fb] text-slate-950">
      {/* Left: minimal brand panel. Hidden below md — the login card alone is the mobile experience. */}
      <div className="hidden w-1/2 flex-col justify-center px-16 lg:px-24 md:flex">
        <Logo width={160} />
        <p className="mt-4 max-w-sm text-base leading-7 text-slate-600">
          Form and interview management for teams and client workspaces.
        </p>
      </div>

      {/* Right: login card. Full width on mobile, half width on md+. */}
      <div className="flex w-full flex-col items-center justify-center px-5 py-10 md:w-1/2 md:px-10">
        <div className="w-full max-w-sm md:hidden">
          <Logo width={140} className="mb-8" />
        </div>
        <LoginForm from={from} />
        <p className="mt-6 text-center text-xs text-slate-400">
          Secure access to your CeliyoForms workspace
        </p>
      </div>
    </main>
  );
}
