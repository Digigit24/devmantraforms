import Link from 'next/link';
import Logo from '@/components/ui/Logo';
import { listForms, listTenants } from '@/lib/agentic-forms/runtime';

const setupSteps = [
  'Create a workspace',
  'Pick a form template',
  'Publish the public link',
  'Connect the tenant MCP endpoint',
];

export default function HomePage() {
  const tenants = listTenants();
  const forms = listForms();
  const tenant = tenants[0];

  return (
    <main className="min-h-screen bg-[#f6f7fb] text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <Logo width={160} />
          <nav className="flex items-center gap-2 text-sm font-semibold">
            <Link href="/forms" className="rounded-md px-3 py-2 text-slate-600 hover:bg-slate-100">Forms</Link>
            <Link href="/settings/mcp" className="rounded-md px-3 py-2 text-slate-600 hover:bg-slate-100">MCP</Link>
            <Link href="/dashboard" className="rounded-md bg-slate-950 px-4 py-2 text-white">Dashboard</Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-8 px-5 py-10 lg:grid-cols-[1fr_420px]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-blue">Agentic forms for every workspace</p>
          <h1 className="mt-4 max-w-4xl font-heading text-5xl font-black leading-tight text-slate-950">
            Build forms that humans answer and agents can operate through MCP.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
            CeliyoForms is a tenant-aware form builder for async interviews, client intake, evidence collection,
            and agent-led workflows with text, files, video, S3-compatible storage, and a per-workspace MCP surface.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/onboarding" className="rounded-md bg-brand-blue px-5 py-3 text-sm font-bold text-white hover:bg-navy-light">
              Create first form
            </Link>
            <Link href="/f/sample-hiring" className="rounded-md border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-800 hover:bg-slate-50">
              Try sample interview
            </Link>
          </div>
        </div>

        <aside className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Default workspace</p>
          <h2 className="mt-2 font-heading text-2xl font-black">{tenant?.name ?? 'Demo Workspace'}</h2>
          <div className="mt-5 grid gap-3">
            <Metric label="Tenant slug" value={tenant?.slug ?? 'demo'} />
            <Metric label="Forms" value={String(forms.length)} />
            <Metric label="MCP endpoint" value={`/api/mcp/${tenant?.slug ?? 'demo'}`} />
          </div>
        </aside>
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-5 pb-12 md:grid-cols-4">
        {setupSteps.map((step, index) => (
          <div key={step} className="rounded-lg border border-slate-200 bg-white p-5">
            <p className="text-xs font-black text-brand-blue">0{index + 1}</p>
            <h3 className="mt-3 font-heading text-lg font-black">{step}</h3>
          </div>
        ))}
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-1 break-all text-sm font-semibold text-slate-800">{value}</p>
    </div>
  );
}
