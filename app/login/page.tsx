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
      {/* Left: marketing panel. Hidden below md — the login card alone is the mobile experience. */}
      <div className="hidden w-1/2 flex-col justify-center px-16 lg:px-24 md:flex">
        <Logo width={160} />
        <h1 className="mt-10 font-heading text-4xl font-black leading-tight text-slate-950">
          Build smarter forms with AI.
        </h1>
        <p className="mt-4 max-w-md text-base leading-7 text-slate-600">
          Create, publish and manage intelligent forms and async interviews from one workspace.
        </p>

        <FormPreviewCard />
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

function FormPreviewCard() {
  return (
    <div className="mt-12 w-full max-w-sm rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full bg-brand-blue" />
        <span className="h-2 w-24 rounded-full bg-slate-200" />
      </div>
      <div className="mt-5 space-y-3">
        <div className="h-2.5 w-3/4 rounded-full bg-slate-100" />
        <div className="h-9 rounded-lg border border-slate-200 bg-slate-50" />
      </div>
      <div className="mt-4 space-y-3">
        <div className="h-2.5 w-1/2 rounded-full bg-slate-100" />
        <div className="h-9 rounded-lg border border-slate-200 bg-slate-50" />
      </div>
      <div className="mt-5 h-9 w-28 rounded-lg bg-brand-blue" />
    </div>
  );
}
