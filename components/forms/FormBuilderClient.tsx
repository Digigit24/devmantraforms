'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import type { PublishedFormView } from '@/lib/agentic-forms/types';

const starterForm = {
  title: 'Customer Intake',
  description: 'A simple intake form that can later be run by an agent.',
  fields: [
    {
      id: 'name',
      type: 'short_text',
      label: 'What is your name?',
      required: true,
      validation: { min_length: 2, max_length: 100 },
    },
    {
      id: 'email',
      type: 'email',
      label: 'What is your email?',
      required: true,
      validation: {},
    },
    {
      id: 'need',
      type: 'long_text',
      label: 'What do you need help with?',
      required: true,
      validation: { min_length: 10, max_length: 1000 },
    },
  ],
  policy: {
    agent_can_ask_followups: false,
    requires_human_review: false,
    allowed_answer_modes: ['text'],
    prohibited_inferences: ['protected traits', 'non-job-related signals'],
  },
};

interface FormsResponse {
  forms: PublishedFormView[];
}

interface FormResponse {
  form: PublishedFormView;
}

interface FormBuilderClientProps {
  tenantSlug: string;
}

export default function FormBuilderClient({ tenantSlug }: FormBuilderClientProps) {
  const [forms, setForms] = useState<PublishedFormView[]>([]);
  const [json, setJson] = useState(JSON.stringify(starterForm, null, 2));
  const [selectedId, setSelectedId] = useState<string>('sample-hiring');
  const [message, setMessage] = useState<string | null>(null);
  const selected = useMemo(() => forms.find((form) => form.id === selectedId) ?? forms[0], [forms, selectedId]);

  useEffect(() => {
    void refreshForms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantSlug]);

  async function refreshForms() {
    const response = await fetch(`/api/forms?tenant=${tenantSlug}`);
    const data = await response.json() as FormsResponse;
    setForms(data.forms);
    if (!selectedId && data.forms[0]) setSelectedId(data.forms[0].id);
  }

  async function createFromJson() {
    setMessage(null);
    const payload = JSON.parse(json) as unknown;
    const response = await fetch(`/api/forms?tenant=${tenantSlug}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await response.json() as FormResponse;
    if (!response.ok) throw new Error(JSON.stringify(data));
    setSelectedId(data.form.id);
    setMessage(`Draft created: ${data.form.id}`);
    await refreshForms();
  }

  async function publish(formId: string) {
    setMessage(null);
    const response = await fetch(`/api/forms/${formId}/publish?tenant=${tenantSlug}`, { method: 'POST' });
    const data = await response.json() as FormResponse;
    if (!response.ok) throw new Error(JSON.stringify(data));
    setSelectedId(data.form.id);
    setMessage(`Published version ${data.form.current_version?.version ?? 1}.`);
    await refreshForms();
  }

  return (
    <main className="min-h-screen bg-[#f6f7fb] text-[#182033]">
      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-6 px-5 py-8 lg:grid-cols-[340px_1fr]">
        <aside className="rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-blue">CeliyoForms</p>
            <h1 className="mt-2 font-heading text-2xl font-black">Forms</h1>
            <p className="mt-2 text-sm text-slate-500">Create, publish, and run tenant-scoped forms through UI or MCP.</p>
          </div>
          <div className="p-3">
            {forms.map((form) => (
              <button
                key={form.id}
                type="button"
                onClick={() => setSelectedId(form.id)}
                className={`mb-2 w-full rounded-md border px-3 py-3 text-left text-sm transition ${
                  selected?.id === form.id ? 'border-brand-blue bg-blue-50' : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <span className="block font-semibold text-slate-900">{form.draft.title}</span>
                <span className="mt-1 block text-xs text-slate-500">{form.id} · {form.status}</span>
              </button>
            ))}
          </div>
        </aside>

        <section className="grid gap-6">
          <div className="rounded-lg border border-slate-200 bg-white p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Selected form</p>
                <h2 className="mt-2 font-heading text-2xl font-black">{selected?.draft.title ?? 'No form selected'}</h2>
                <p className="mt-2 max-w-2xl text-sm text-slate-600">{selected?.draft.description}</p>
              </div>
              {selected && (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void publish(selected.id)}
                    className="rounded-md bg-brand-blue px-4 py-2 text-sm font-semibold text-white hover:bg-navy-light"
                  >
                    Publish
                  </button>
                  <Link
                    href={`/f/${selected.id}`}
                    className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Open form
                  </Link>
                </div>
              )}
            </div>
            {message && <p className="mt-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>}
            {selected && (
              <div className="mt-5 grid gap-3 md:grid-cols-3">
                <Stat label="Status" value={selected.status} />
                <Stat label="Fields" value={String(selected.draft.fields.length)} />
                <Stat label="MCP endpoint" value="/api/mcp" />
                <Stat label="Form ID" value={selected.id} />
              </div>
            )}
          </div>

          <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
            <div className="rounded-lg border border-slate-200 bg-white p-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="font-heading text-lg font-black">Create form from JSON</h3>
                <button
                  type="button"
                  onClick={() => void createFromJson()}
                  className="rounded-md bg-navy-deep px-4 py-2 text-sm font-semibold text-white hover:bg-navy-mid"
                >
                  Create draft
                </button>
              </div>
              <textarea
                value={json}
                onChange={(event) => setJson(event.target.value)}
                spellCheck={false}
                className="h-[560px] w-full resize-none rounded-md border border-slate-300 bg-slate-950 p-4 font-mono text-xs leading-5 text-slate-50 outline-none focus:border-brand-blue"
              />
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-5">
              <h3 className="font-heading text-lg font-black">Connect an agent</h3>
              <pre className="mt-4 overflow-auto rounded-md bg-slate-950 p-4 text-xs leading-5 text-slate-50">
{`POST /api/mcp
Authorization: Bearer <tenant-api-key>

MCP tools/call "start_session"
{ "form_id": "${selected?.id ?? 'sample-hiring'}" }`}
              </pre>
              <p className="mt-4 text-sm text-slate-600">
                See the MCP settings page for this tenant&apos;s endpoint and API key.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-1 break-all text-sm font-semibold text-slate-800">{value}</p>
    </div>
  );
}
