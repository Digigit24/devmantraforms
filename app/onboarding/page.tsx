import Link from 'next/link';
import Logo from '@/components/ui/Logo';

export const metadata = {
  title: 'Onboarding',
};

const templates = [
  { title: 'Async hiring interview', href: '/forms', detail: 'Video intro, resume upload, consent, and work sample prompts.' },
  { title: 'Client intake', href: '/forms', detail: 'Contact details, project goals, files, budget, and timeline.' },
  { title: 'Research screening', href: '/forms', detail: 'Eligibility, consent, availability, and structured evidence.' },
];

export default function OnboardingPage() {
  return (
    <main className="min-h-screen bg-[#f6f7fb] text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <Logo width={160} />
          <Link href="/dashboard" className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold">Skip to dashboard</Link>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-5 py-10">
        <p className="text-xs font-semibold uppercase tracking-widest text-brand-blue">First workspace setup</p>
        <h1 className="mt-3 font-heading text-4xl font-black">Create your first agent-ready form.</h1>
        <p className="mt-3 max-w-2xl text-slate-600">
          Start with a template, publish it, then connect the tenant MCP endpoint so any compatible agent can run the same workflow.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {templates.map((template) => (
            <Link key={template.title} href={template.href} className="rounded-lg border border-slate-200 bg-white p-5 hover:border-brand-blue">
              <h2 className="font-heading text-xl font-black">{template.title}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">{template.detail}</p>
              <p className="mt-5 text-sm font-bold text-brand-blue">Use template</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}

