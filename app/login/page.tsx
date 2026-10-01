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
    <main className="relative flex min-h-screen items-center overflow-hidden bg-[#f6f7fb] px-6 py-16 md:px-16 lg:px-24">
      {/* Soft branded background treatment — restrained, no literal illustration. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 top-1/4 h-80 w-80 rounded-full bg-brand-blue/10 blur-3xl" />
        <div className="absolute right-0 top-10 h-96 w-96 rounded-full bg-brand-blue/[0.06] blur-3xl md:right-1/4" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(74,115,196,0.07),_transparent_55%)]" />
      </div>

      <div className="relative mx-auto flex w-full max-w-6xl flex-col items-center gap-14 md:flex-row md:items-center md:justify-between">
        {/* Branded panel */}
        <div className="flex flex-col items-center text-center md:items-start md:text-left">
          <Logo width={168} />
          <p className="mt-4 max-w-sm text-base leading-7 text-slate-600">
            Form and interview management for teams and client workspaces.
          </p>
        </div>

        {/* Floating login card, anchored right-of-center on desktop. */}
        <div className="w-full max-w-sm shrink-0 md:mr-4 lg:mr-12">
          <LoginForm from={from} />
          <p className="mt-6 text-center text-xs text-slate-400">
            Secure access to your CeliyoForms workspace
          </p>
        </div>
      </div>
    </main>
  );
}
