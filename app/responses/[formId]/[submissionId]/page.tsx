import Link from 'next/link';
import { notFound } from 'next/navigation';
import Logo from '@/components/ui/Logo';
import SignOutLink from '@/components/auth/SignOutLink';
import { describeAnswerValue, isArtifactAnswerValue } from '@/lib/agentic-forms/answer-display';
import { AgenticFormError } from '@/lib/agentic-forms/errors';
import { getForm, getSubmission, getVersion, resolveAdminTenant } from '@/lib/agentic-forms/runtime';
import { getArtifact } from '@/lib/agentic-forms/storage';

export const metadata = {
  title: 'Response detail',
};

interface PageProps {
  params: Promise<{ formId: string; submissionId: string }>;
  searchParams: Promise<{ tenant?: string }>;
}

export default async function ResponseDetailPage({ params, searchParams }: PageProps) {
  const { formId, submissionId } = await params;
  const { tenant: tenantSlug } = await searchParams;
  const tenant = resolveAdminTenant(tenantSlug);

  let form;
  let submission;
  try {
    form = getForm(formId, tenant.id);
    submission = getSubmission(submissionId, tenant.id);
  } catch (error) {
    if (error instanceof AgenticFormError && error.code === 'NOT_FOUND') notFound();
    throw error;
  }
  if (submission.form_id !== formId) notFound();

  const version = getVersion(submission.form_version_id);
  const fieldsById = new Map(version.schema.fields.map((field) => [field.id, field]));

  const rows = submission.answers.map((answer) => {
    const field = fieldsById.get(answer.field_id);
    let artifactUrl: string | undefined;
    if (isArtifactAnswerValue(answer.value)) {
      try {
        artifactUrl = getArtifact(answer.value.artifact_id, tenant.id).url;
      } catch {
        artifactUrl = undefined;
      }
    }
    return { answer, field, display: describeAnswerValue(answer, field, artifactUrl) };
  });

  return (
    <main className="min-h-screen bg-[#f6f7fb] text-slate-950">
      <Header formId={form.id} tenantSlug={tenant.slug} />
      <section className="mx-auto max-w-3xl px-5 py-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-brand-blue">Response</p>
        <h1 className="mt-2 font-heading text-3xl font-black">{form.draft.title}</h1>
        <p className="mt-2 text-sm text-slate-600">
          Submitted {new Date(submission.created_at).toLocaleString()} · Submission {submission.id}
        </p>

        <div className="mt-6 grid gap-4">
          {rows.map(({ answer, field, display }) => (
            <div key={answer.field_id} className="rounded-lg border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                {field?.label ?? answer.field_id}
              </p>
              <div className="mt-2 text-sm text-slate-800">
                {display.kind === 'text' && <span className="whitespace-pre-wrap">{display.text}</span>}
                {display.kind === 'artifact' && (
                  <div>
                    <p>{display.filename} <span className="text-xs text-slate-500">({display.contentType}, {display.sizeLabel})</span></p>
                    {display.url ? (
                      <a href={display.url} target="_blank" rel="noreferrer" className="text-sm font-semibold text-brand-blue">Open file</a>
                    ) : (
                      <p className="text-xs text-slate-400">No public link configured for this artifact.</p>
                    )}
                  </div>
                )}
                {display.kind === 'json' && (
                  <pre className="overflow-auto rounded bg-slate-950 p-3 text-xs text-slate-50">{JSON.stringify(display.value, null, 2)}</pre>
                )}
              </div>
            </div>
          ))}
          {rows.length === 0 && (
            <p className="text-sm text-slate-500">This submission has no recorded answers.</p>
          )}
        </div>
      </section>
    </main>
  );
}

function Header({ formId, tenantSlug }: { formId: string; tenantSlug: string }) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
        <Logo width={160} />
        <div className="flex items-center gap-2">
          <Link href={`/responses/${formId}?tenant=${tenantSlug}`} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold">
            Back to responses
          </Link>
          <SignOutLink />
        </div>
      </div>
    </header>
  );
}
