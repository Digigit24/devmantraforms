import Link from 'next/link';
import Logo from '@/components/ui/Logo';
import { listForms, listSubmissions, listTenants, resolveAdminTenant } from '@/lib/agentic-forms/runtime';

export const metadata = {
  title: 'Dashboard',
};

interface PageProps {
  searchParams: Promise<{ tenant?: string }>;
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const { tenant: tenantSlug } = await searchParams;
  const tenants = listTenants();
  const tenant = resolveAdminTenant(tenantSlug);
  const forms = listForms(tenant.id);
  const formsWithCounts = forms.map((form) => ({
    form,
    responseCount: listSubmissions(form.id, tenant.id).length,
  }));
  const published = forms.filter((form) => form.status === 'published').length;
  const totalResponses = formsWithCounts.reduce((sum, item) => sum + item.responseCount, 0);
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3010';

  return (
    <main className="min-h-screen bg-[#f6f7fb] text-slate-950">
      <Header tenants={tenants} currentSlug={tenant.slug} />
      <section className="mx-auto max-w-7xl px-5 py-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-blue">Workspace</p>
            <h1 className="mt-2 font-heading text-3xl font-black">{tenant.name}</h1>
            <p className="mt-2 text-sm text-slate-600">Manage forms, submissions, storage, and MCP access from one place.</p>
          </div>
          <Link href="/onboarding" className="rounded-md bg-brand-blue px-4 py-2 text-sm font-bold text-white">Create form</Link>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <Metric label="Forms" value={String(forms.length)} />
          <Metric label="Published" value={String(published)} />
          <Metric label="Responses" value={String(totalResponses)} />
          <Metric label="Tenant MCP" value={tenant.mcp_endpoint} />
        </div>

        <div className="mt-6 rounded-lg border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-xl font-black">Forms</h2>
            <Link href={`/forms?tenant=${tenant.slug}`} className="text-sm font-semibold text-brand-blue">Open builder</Link>
          </div>
          <div className="mt-4 grid gap-3">
            {formsWithCounts.length === 0 && (
              <p className="text-sm text-slate-500">No forms yet for this tenant.</p>
            )}
            {formsWithCounts.map(({ form, responseCount }) => (
              <div key={form.id} className="rounded-md border border-slate-200 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="font-semibold">{form.draft.title}</h3>
                    <p className="mt-1 text-xs text-slate-500">
                      {form.id} · {form.status}
                      {form.current_version ? ` · v${form.current_version.version}` : ''}
                      {' · '}{responseCount} {responseCount === 1 ? 'response' : 'responses'}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/responses/${form.id}?tenant=${tenant.slug}`}
                      className="rounded-md bg-brand-blue px-3 py-2 text-sm font-semibold text-white"
                    >
                      View responses
                    </Link>
                    {form.status === 'published' && (
                      <a
                        href={`${baseUrl}/f/${form.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700"
                      >
                        Open public form
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

function Header({ tenants, currentSlug }: { tenants: { slug: string; name: string }[]; currentSlug: string }) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:justify-between">
        <Logo width={160} />
        <div className="flex flex-wrap items-center gap-2">
          {tenants.length > 1 && (
            <div className="flex items-center gap-1 rounded-md border border-slate-200 p-1 text-sm">
              {tenants.map((t) => (
                <Link
                  key={t.slug}
                  href={`/dashboard?tenant=${t.slug}`}
                  className={`rounded px-3 py-1 font-semibold ${
                    t.slug === currentSlug ? 'bg-brand-blue text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {t.name}
                </Link>
              ))}
            </div>
          )}
          <nav className="flex items-center gap-2 text-sm font-semibold">
            <Link href={`/forms?tenant=${currentSlug}`} className="rounded-md px-3 py-2 text-slate-600 hover:bg-slate-100">Forms</Link>
            <Link href="/settings/mcp" className="rounded-md px-3 py-2 text-slate-600 hover:bg-slate-100">MCP</Link>
            <Link href="/settings/storage" className="rounded-md px-3 py-2 text-slate-600 hover:bg-slate-100">Storage</Link>
          </nav>
        </div>
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
