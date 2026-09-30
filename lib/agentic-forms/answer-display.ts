// Pure formatting logic for rendering a submitted answer in the admin responses UI —
// deliberately separate from the page component (app/responses/[formId]/[submissionId]/page.tsx)
// so it's directly unit-testable without a React/DOM test environment. Does not touch
// business rules or persistence; it only decides how to *display* an already-validated
// answer value, using the field metadata from the form version the submission was made
// against.
import type { AnswerValue, FormField } from './schema';
import type { SessionAnswer } from './types';

export type AnswerDisplay =
  | { kind: 'text'; text: string }
  | { kind: 'artifact'; filename: string; contentType: string; sizeLabel: string; url?: string }
  | { kind: 'json'; value: unknown };

export function isArtifactAnswerValue(value: AnswerValue): value is Extract<AnswerValue, { artifact_id: string }> {
  return typeof value === 'object' && value !== null && !Array.isArray(value) && 'artifact_id' in value;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Describes how to render one answer value, given the field definition it belongs to
 * (undefined if the field was since removed from the form). Does not resolve artifact
 * URLs itself — the caller (which has access to the repository/tenant context) passes
 * `artifactUrl` in for file_upload/video_response answers when available.
 */
export function describeAnswerValue(
  answer: SessionAnswer,
  field: FormField | undefined,
  artifactUrl?: string,
): AnswerDisplay {
  const value = answer.value;
  const type = field?.type;

  if (type === 'consent') {
    return { kind: 'text', text: value === true ? 'Yes' : 'No' };
  }

  if (type === 'single_select') {
    const option = field?.options?.find((candidate) => candidate.value === value);
    return { kind: 'text', text: option?.label ?? String(value) };
  }

  if (type === 'multi_select' && Array.isArray(value)) {
    const labels = value.map((item) => field?.options?.find((option) => option.value === item)?.label ?? item);
    return { kind: 'text', text: labels.join(', ') || '—' };
  }

  if ((type === 'file_upload' || type === 'video_response') && isArtifactAnswerValue(value)) {
    return {
      kind: 'artifact',
      filename: value.filename,
      contentType: value.content_type,
      sizeLabel: formatBytes(value.size_bytes),
      url: artifactUrl,
    };
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return { kind: 'text', text: String(value) };
  }

  // No better representation exists for this shape (e.g. an artifact value on a field
  // whose type changed since submission) — fall back to raw JSON rather than guessing.
  return { kind: 'json', value };
}
