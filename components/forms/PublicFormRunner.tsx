'use client';

import { useMemo, useState } from 'react';
import type { AnswerValue } from '@/lib/agentic-forms/schema';
import type { ArtifactRecord, NextStepResponse, PublishedFormView, SubmissionRecord } from '@/lib/agentic-forms/types';

interface Props {
  form: PublishedFormView;
}

interface StartResponse {
  next_step: NextStepResponse;
}

interface AnswerResponse {
  next_step?: NextStepResponse;
  submission?: SubmissionRecord;
  error?: { message?: string };
}

interface ArtifactUploadResponse {
  artifact?: ArtifactRecord;
  error?: { message?: string };
}

export default function PublicFormRunner({ form }: Props) {
  const [nextStep, setNextStep] = useState<NextStepResponse | null>(null);
  const [value, setValue] = useState<string>('');
  const [multiValue, setMultiValue] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submission, setSubmission] = useState<SubmissionRecord | null>(null);
  const fieldStep = nextStep?.step.type !== 'completion' ? nextStep?.step : null;
  const isCompleteStep = nextStep?.step.type === 'completion';
  const title = form.current_version?.schema.title ?? form.draft.title;
  const description = form.current_version?.schema.description ?? form.draft.description;
  const progress = useMemo(() => {
    if (!fieldStep || !form.current_version) return isCompleteStep ? 100 : 0;
    const fields = form.current_version.schema.fields;
    const index = fields.findIndex((field) => field.id === fieldStep.id);
    return Math.max(5, Math.round((index / Math.max(1, fields.length)) * 100));
  }, [fieldStep, form.current_version, isCompleteStep]);

  async function start() {
    setIsBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ form_id: form.id }),
      });
      const data = await response.json() as StartResponse;
      if (!response.ok) throw new Error('Could not start session.');
      setNextStep(data.next_step);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setIsBusy(false);
    }
  }

  async function submit() {
    if (!fieldStep || !nextStep) return;
    setIsBusy(true);
    setError(null);
    try {
      const answerValue = await buildAnswerValue(fieldStep.type, fieldStep.id);
      const response = await fetch(`/api/sessions/${nextStep.session_id}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          field_id: fieldStep.id,
          value: answerValue,
          idempotency_key: `${fieldStep.id}-${Date.now()}`,
        }),
      });
      const data = await response.json() as AnswerResponse;
      if (!response.ok || !data.next_step) throw new Error(data.error?.message ?? 'Answer was not accepted.');
      setNextStep(data.next_step);
      setValue('');
      setMultiValue([]);
      setSelectedFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setIsBusy(false);
    }
  }

  async function complete() {
    if (!nextStep) return;
    setIsBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/sessions/${nextStep.session_id}/answer`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'complete' }),
      });
      const data = await response.json() as AnswerResponse;
      if (!response.ok || !data.submission) throw new Error(data.error?.message ?? 'Could not complete session.');
      setSubmission(data.submission);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setIsBusy(false);
    }
  }

  async function buildAnswerValue(fieldType: string, fieldId: string): Promise<AnswerValue> {
    if (fieldType === 'number' || fieldType === 'rating') return value === '' ? '' : Number(value);
    if (fieldType === 'consent') return value === 'true';
    if (fieldType === 'multi_select') return multiValue;
    if (fieldType === 'file_upload' || fieldType === 'video_response') {
      if (!nextStep || !selectedFile) throw new Error('Choose a file before submitting.');
      const artifact = await uploadArtifact(nextStep.session_id, fieldId, selectedFile, fieldType);
      return {
        artifact_id: artifact.id,
        filename: artifact.filename,
        content_type: artifact.content_type,
        size_bytes: artifact.size_bytes,
        ...(artifact.duration_seconds ? { duration_seconds: artifact.duration_seconds } : {}),
      };
    }
    return value;
  }

  async function uploadArtifact(sessionId: string, fieldId: string, file: File, fieldType: string) {
    const body = new FormData();
    body.append('file', file);
    body.append('session_id', sessionId);
    body.append('field_id', fieldId);
    if (fieldType === 'video_response') body.append('duration_seconds', '1');

    const response = await fetch('/api/artifacts/upload', { method: 'POST', body });
    const data = await response.json() as ArtifactUploadResponse;
    if (!response.ok || !data.artifact) {
      throw new Error(data.error?.message ?? 'Could not upload the file.');
    }
    return data.artifact;
  }

  return (
    <main className="min-h-screen bg-[#f6f7fb] px-5 py-8 text-[#182033]">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-blue">Public form</p>
          <h1 className="mt-2 font-heading text-3xl font-black">{title}</h1>
          {description && <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>}
          <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full bg-brand-blue transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="mt-5 rounded-lg border border-slate-200 bg-white p-6">
          {!nextStep && !submission && (
            <button
              type="button"
              onClick={() => void start()}
              disabled={isBusy || form.status !== 'published'}
              className="w-full rounded-md bg-brand-blue px-5 py-3 font-semibold text-white disabled:opacity-50"
            >
              Start response
            </button>
          )}

          {fieldStep && !submission && (
            <div>
              <p className="text-sm font-semibold text-slate-500">{fieldStep.type}</p>
              <h2 className="mt-2 font-heading text-2xl font-black">{fieldStep.prompt}</h2>
              {fieldStep.description && <p className="mt-2 text-sm text-slate-600">{fieldStep.description}</p>}
              <div className="mt-5">{renderInput(fieldStep)}</div>
              <button
                type="button"
                onClick={() => void submit()}
                disabled={isBusy}
                className="mt-5 rounded-md bg-navy-deep px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                Submit answer
              </button>
            </div>
          )}

          {isCompleteStep && !submission && (
            <div>
              <h2 className="font-heading text-2xl font-black">Ready to submit</h2>
              <p className="mt-2 text-sm text-slate-600">All visible questions are answered.</p>
              <button
                type="button"
                onClick={() => void complete()}
                disabled={isBusy}
                className="mt-5 rounded-md bg-emerald-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                Complete submission
              </button>
            </div>
          )}

          {submission && (
            <div>
              <h2 className="font-heading text-2xl font-black">Submission received</h2>
              <p className="mt-2 text-sm text-slate-600">Submission ID: {submission.id}</p>
              <pre className="mt-5 overflow-auto rounded-md bg-slate-950 p-4 text-xs text-slate-50">
                {JSON.stringify(submission.answers, null, 2)}
              </pre>
            </div>
          )}

          {error && <p className="mt-5 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        </div>
      </div>
    </main>
  );

  function renderInput(step: NonNullable<typeof fieldStep>) {
    if (step.type === 'single_select') {
      return (
        <div className="grid gap-2">
          {step.options?.map((option) => (
            <label key={option.value} className="flex items-center gap-2 rounded-md border border-slate-200 p-3">
              <input type="radio" name={step.id} value={option.value} onChange={(event) => setValue(event.target.value)} />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      );
    }
    if (step.type === 'multi_select') {
      return (
        <div className="grid gap-2">
          {step.options?.map((option) => (
            <label key={option.value} className="flex items-center gap-2 rounded-md border border-slate-200 p-3">
              <input
                type="checkbox"
                value={option.value}
                onChange={(event) => {
                  setMultiValue((current) => event.target.checked
                    ? [...current, option.value]
                    : current.filter((item) => item !== option.value));
                }}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      );
    }
    if (step.type === 'consent') {
      return (
        <label className="flex items-center gap-3 rounded-md border border-slate-200 p-3">
          <input type="checkbox" checked={value === 'true'} onChange={(event) => setValue(event.target.checked ? 'true' : 'false')} />
          <span>I agree</span>
        </label>
      );
    }
    if (step.type === 'file_upload' || step.type === 'video_response') {
      return (
        <input
          type="file"
          accept={step.type === 'video_response' ? 'video/*' : undefined}
          capture={step.type === 'video_response' ? 'user' : undefined}
          onChange={(event) => {
            const file = event.target.files?.[0] ?? null;
            setSelectedFile(file);
            setValue(file?.name ?? '');
          }}
          className="w-full rounded-md border border-slate-300 p-3"
        />
      );
    }
    return (
      <textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        className="min-h-32 w-full rounded-md border border-slate-300 p-3 outline-none focus:border-brand-blue"
      />
    );
  }
}
