import Link from 'next/link';
import Logo from '@/components/ui/Logo';
import { listTenants } from '@/lib/agentic-forms/runtime';

export const metadata = {
  title: 'MCP Settings',
};

export default function McpSettingsPage() {
  const tenant = listTenants()[0];
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3010';
  const endpoint = `${baseUrl}${tenant?.mcp_endpoint ?? '/api/mcp/demo'}`;

  return (
    <main className="min-h-screen bg-[#f6f7fb] text-slate-950">
      <Header />
      <section className="mx-auto max-w-5xl px-5 py-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-brand-blue">Tenant MCP</p>
        <h1 className="mt-2 font-heading text-3xl font-black">Agent connection settings</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Each workspace gets its own MCP endpoint. API keys are planned for the persisted tenant layer; this local build shows the contract.
        </p>

        <div className="mt-6 rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Endpoint</p>
          <pre className="mt-3 overflow-auto rounded-md bg-slate-950 p-4 text-sm text-slate-50">{endpoint}</pre>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <Metric label="Tenant" value={tenant?.name ?? 'Demo Workspace'} />
            <Metric label="Slug" value={tenant?.slug ?? 'demo'} />
            <Metric label="Key hint" value={tenant?.api_key_hint ?? 'cf_demo_...'} />
          </div>
        </div>

        <div className="mt-6 rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="font-heading text-xl font-black">Capability check</h2>
          <pre className="mt-3 overflow-auto rounded-md bg-slate-950 p-4 text-xs leading-5 text-slate-50">
{`GET ${tenant?.mcp_endpoint ?? '/api/mcp/demo'}

POST ${tenant?.mcp_endpoint ?? '/api/mcp/demo'}
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
        <Link href="/dashboard" className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold">Dashboard</Link>
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

