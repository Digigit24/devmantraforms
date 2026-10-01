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
    <main className="flex min-h-screen flex-col md:flex-row">
      {/* Left: branded panel. Compact band on mobile, full height on md+. */}
      <div className="relative flex shrink-0 flex-col justify-center overflow-hidden bg-navy-deep px-8 py-12 md:w-1/2 md:px-16 md:py-0 lg:px-24">
        {/* Subtle dot-grid pattern + a single soft glow — restrained, not decorative. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: 'radial-gradient(rgba(255,255,255,0.8) 1px, transparent 1px)',
            backgroundSize: '22px 22px',
          }}
        />
        <div aria-hidden className="pointer-events-none absolute -right-24 top-1/3 h-96 w-96 rounded-full bg-brand-blue/30 blur-3xl" />

        {/* Hidden on mobile, where it would sit directly above the same text in the heading below. */}
        <div className="absolute left-16 top-10 hidden md:block lg:left-24">
          <Logo variant="dark" width={160} />
        </div>

        <div className="relative mt-10 md:mt-0">
          <h1 className="font-heading text-3xl font-black leading-tight text-white md:text-4xl">
            CeliyoForms
          </h1>
          <p className="mt-3 max-w-sm text-base leading-7 text-white/70">
            Manage forms and responses in one workspace.
          </p>
        </div>

        <p className="relative mt-10 hidden text-xs text-white/40 md:absolute md:bottom-8 md:left-16 md:mt-0 md:block lg:left-24">
          © {new Date().getFullYear()} CeliyoForms. All rights reserved.
        </p>
      </div>

      {/* Right: login form, centered on a plain light background — no floating card. */}
      <div className="flex flex-1 items-center justify-center bg-[#f8fafc] px-6 py-12 md:px-10">
        <div className="w-full max-w-[400px]">
          <LoginForm from={from} />
          <p className="mt-6 text-center text-xs text-slate-400">
            Secure access to your CeliyoForms workspace
          </p>
        </div>
      </div>
    </main>
  );
}
