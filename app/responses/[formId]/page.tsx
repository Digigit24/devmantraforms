import Link from 'next/link';
import { notFound } from 'next/navigation';
import Logo from '@/components/ui/Logo';
import { AgenticFormError } from '@/lib/agentic-forms/errors';
import { getForm, listSubmissions, resolveAdminTenant } from '@/lib/agentic-forms/runtime';

export const metadata = {
  title: 'Responses',
};

interface PageProps {
  params: Promise<{ formId: string }>;
  searchParams: Promise<{ tenant?: string }>;
}

export default async function ResponsesListPage({ params, searchParams }: PageProps) {
  const { formId } = await params;
  const { tenant: tenantSlug } = await searchParams;
  const tenant = resolveAdminTenant(tenantSlug);

  let form;
  let submissions;
  try {
    form = getForm(formId, tenant.id);
    submissions = listSubmissions(formId, tenant.id);
  } catch (error) {
    if (error instanceof AgenticFormError && error.code === 'NOT_FOUND') notFound();
    throw error;
  }

  return (
    <main className="min-h-screen bg-[#f6f7fb] text-slate-950">
      <Header tenantSlug={tenant.slug} />
      <section className="mx-auto max-w-5xl px-5 py-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-brand-blue">Responses</p>
        <h1 className="mt-2 font-heading text-3xl font-black">{form.draft.title}</h1>
        <p className="mt-2 text-sm text-slate-600">
          {submissions.length} {submissions.length === 1 ? 'response' : 'responses'} · {form.id}
        </p>

        <div className="mt-6 rounded-lg border border-slate-200 bg-white">
          {submissions.length === 0 ? (
            <p className="p-5 text-sm text-slate-500">No responses yet.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-widest text-slate-400">
                  <th className="px-5 py-3">Submission ID</th>
                  <th className="px-5 py-3">Submitted</th>
                  <th className="px-5 py-3">Session ID</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {submissions.map((submission) => (
                  <tr key={submission.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-5 py-3 font-mono text-xs">{submission.id}</td>
                    <td className="px-5 py-3">{new Date(submission.created_at).toLocaleString()}</td>
                    <td className="px-5 py-3 font-mono text-xs text-slate-500">{submission.session_id}</td>
                    <td className="px-5 py-3 text-right">
                      <Link
                        href={`/responses/${form.id}/${submission.id}?tenant=${tenant.slug}`}
                        className="text-sm font-semibold text-brand-blue"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </main>
  );
}

function Header({ tenantSlug }: { tenantSlug: string }) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
        <Logo width={160} />
        <Link href={`/dashboard?tenant=${tenantSlug}`} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold">Dashboard</Link>
      </div>
    </header>
  );
}
