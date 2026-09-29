import Link from 'next/link';
import Logo from '@/components/ui/Logo';
import { listForms, listTenants } from '@/lib/agentic-forms/runtime';

export const metadata = {
  title: 'Dashboard',
};

export default function DashboardPage() {
  const tenant = listTenants()[0];
  const forms = listForms(tenant?.id);
  const published = forms.filter((form) => form.status === 'published').length;

  return (
    <main className="min-h-screen bg-[#f6f7fb] text-slate-950">
      <Header />
      <section className="mx-auto max-w-7xl px-5 py-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-blue">Workspace</p>
            <h1 className="mt-2 font-heading text-3xl font-black">{tenant?.name ?? 'Demo Workspace'}</h1>
            <p className="mt-2 text-sm text-slate-600">Manage forms, submissions, storage, and MCP access from one place.</p>
          </div>
          <Link href="/onboarding" className="rounded-md bg-brand-blue px-4 py-2 text-sm font-bold text-white">Create form</Link>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <Metric label="Forms" value={String(forms.length)} />
          <Metric label="Published" value={String(published)} />
          <Metric label="Tenant MCP" value={tenant?.mcp_endpoint ?? '/api/mcp/demo'} />
          <Metric label="Storage" value={process.env.S3_BUCKET ? 'Configured' : 'Needs setup'} />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="rounded-lg border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-xl font-black">Recent forms</h2>
              <Link href="/forms" className="text-sm font-semibold text-brand-blue">Open builder</Link>
            </div>
            <div className="mt-4 grid gap-3">
              {forms.map((form) => (
                <div key={form.id} className="rounded-md border border-slate-200 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h3 className="font-semibold">{form.draft.title}</h3>
                      <p className="mt-1 text-xs text-slate-500">{form.id} · {form.status}</p>
                    </div>
                    <Link href={`/f/${form.id}`} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700">Open</Link>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <aside className="rounded-lg border border-slate-200 bg-white p-5">
            <h2 className="font-heading text-xl font-black">Next setup steps</h2>
            <div className="mt-4 grid gap-3 text-sm">
              <Link href="/settings/storage" className="rounded-md border border-slate-200 p-3 font-semibold hover:bg-slate-50">Configure S3 storage</Link>
              <Link href="/settings/mcp" className="rounded-md border border-slate-200 p-3 font-semibold hover:bg-slate-50">Copy tenant MCP endpoint</Link>
              <Link href="/forms" className="rounded-md border border-slate-200 p-3 font-semibold hover:bg-slate-50">Publish your first form</Link>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}

function Header() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
        <Logo width={160} />
        <nav className="flex items-center gap-2 text-sm font-semibold">
          <Link href="/forms" className="rounded-md px-3 py-2 text-slate-600 hover:bg-slate-100">Forms</Link>
          <Link href="/settings/mcp" className="rounded-md px-3 py-2 text-slate-600 hover:bg-slate-100">MCP</Link>
          <Link href="/settings/storage" className="rounded-md px-3 py-2 text-slate-600 hover:bg-slate-100">Storage</Link>
        </nav>
      </div>
    </header>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-2 break-all font-heading text-xl font-black">{value}</p>
    </div>
  );
}

