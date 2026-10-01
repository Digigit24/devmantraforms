import Link from 'next/link';
import Logo from '@/components/ui/Logo';
import SignOutLink from '@/components/auth/SignOutLink';
import { listApiKeysForTenant } from '@/lib/agentic-forms/auth';
import { listTenants } from '@/lib/agentic-forms/runtime';

export const metadata = {
  title: 'MCP Settings',
};

export default function McpSettingsPage() {
  const tenant = listTenants()[0];
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3010';
  const endpoint = `${baseUrl}${tenant?.mcp_endpoint ?? '/api/mcp/demo'}`;
  const apiKeys = tenant ? listApiKeysForTenant(tenant.id) : [];
  const activeKeys = apiKeys.filter((key) => !key.revoked_at);

  return (
    <main className="min-h-screen bg-[#f6f7fb] text-slate-950">
      <Header />
      <section className="mx-auto max-w-5xl px-5 py-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-brand-blue">Tenant MCP</p>
        <h1 className="mt-2 font-heading text-3xl font-black">Agent connection settings</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Each workspace has its own MCP endpoint and API key. Requests to this endpoint must
          include <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">Authorization: Bearer &lt;api-key&gt;</code> —
          the tenant is resolved from the key, not from this URL.
        </p>

        <div className="mt-6 rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Endpoint</p>
          <pre className="mt-3 overflow-auto rounded-md bg-slate-950 p-4 text-sm text-slate-50">{endpoint}</pre>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <Metric label="Tenant" value={tenant?.name ?? 'Demo Workspace'} />
            <Metric label="Slug" value={tenant?.slug ?? 'demo'} />
          </div>
        </div>

        <div className="mt-6 rounded-lg border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-xl font-black">API keys</h2>
          </div>
          {activeKeys.length === 0 ? (
            <div className="mt-3 rounded-md border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
              No active API key yet. Create one from the host running this app:
              <pre className="mt-2 overflow-auto rounded-md bg-slate-950 p-3 text-xs leading-5 text-slate-50">
{`CELIYO_DATABASE_PATH=/path/to/celiyoforms.sqlite \\
  npm run celiyo:tenant:create -- --slug ${tenant?.slug ?? 'demo'} --name "${tenant?.name ?? 'Demo Workspace'}"`}
              </pre>
              The full key is printed once, at creation time, and is never shown again — only
              this page's key hint is retrievable afterward.
            </div>
          ) : (
            <div className="mt-3 grid gap-2">
              {activeKeys.map((key) => (
                <div key={key.id} className="flex items-center justify-between rounded-md border border-slate-200 p-3 text-sm">
                  <span className="font-mono">{key.key_prefix}...{key.key_hint}</span>
                  <span className="text-xs text-slate-500">
                    {key.last_used_at ? `Last used ${key.last_used_at}` : 'Never used'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="font-heading text-xl font-black">Capability check</h2>
          <pre className="mt-3 overflow-auto rounded-md bg-slate-950 p-4 text-xs leading-5 text-slate-50">
{`GET ${tenant?.mcp_endpoint ?? '/api/mcp/demo'}
Authorization: Bearer <api-key>

POST ${tenant?.mcp_endpoint ?? '/api/mcp/demo'}
Authorization: Bearer <api-key>
{
  "kind": "capabilities"
}`}
          </pre>
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
        <div className="flex items-center gap-2">
          <Link href="/dashboard" className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold">Dashboard</Link>
          <SignOutLink />
        </div>
      </div>
    </header>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-1 break-all text-sm font-semibold">{value}</p>
    </div>
  );
}
