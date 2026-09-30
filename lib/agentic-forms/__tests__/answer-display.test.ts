import { describe, expect, it } from 'vitest';
import { describeAnswerValue, formatBytes, isArtifactAnswerValue } from '@/lib/agentic-forms/answer-display';
import type { FormField } from '@/lib/agentic-forms/schema';
import type { SessionAnswer } from '@/lib/agentic-forms/types';

function answer(fieldId: string, value: SessionAnswer['value']): SessionAnswer {
  return { field_id: fieldId, value, source: 'human', answered_at: '2026-01-01T00:00:00.000Z' };
}

function field(overrides: Partial<FormField>): FormField {
  return {
    id: 'f1',
    type: 'short_text',
    label: 'Field',
    required: false,
    validation: {},
    ...overrides,
  } as FormField;
}

describe('describeAnswerValue', () => {
  it('renders short_text/long_text/email/number/date/rating as plain text', () => {
    expect(describeAnswerValue(answer('f1', 'Aarav'), field({ type: 'short_text' }))).toEqual({ kind: 'text', text: 'Aarav' });
    expect(describeAnswerValue(answer('f1', 'a@b.com'), field({ type: 'email' }))).toEqual({ kind: 'text', text: 'a@b.com' });
    expect(describeAnswerValue(answer('f1', 42), field({ type: 'number' }))).toEqual({ kind: 'text', text: '42' });
    expect(describeAnswerValue(answer('f1', '2026-09-29'), field({ type: 'date' }))).toEqual({ kind: 'text', text: '2026-09-29' });
    expect(describeAnswerValue(answer('f1', 4), field({ type: 'rating' }))).toEqual({ kind: 'text', text: '4' });
  });

  it('renders consent as Yes/No', () => {
    expect(describeAnswerValue(answer('f1', true), field({ type: 'consent' }))).toEqual({ kind: 'text', text: 'Yes' });
    expect(describeAnswerValue(answer('f1', false), field({ type: 'consent' }))).toEqual({ kind: 'text', text: 'No' });
  });

  it('renders single_select as the matching option label, not the raw value', () => {
    const f = field({
      type: 'single_select',
      options: [{ label: 'Red', value: 'red' }, { label: 'Blue', value: 'blue' }],
    });
    expect(describeAnswerValue(answer('f1', 'blue'), f)).toEqual({ kind: 'text', text: 'Blue' });
  });

  it('falls back to the raw value if a single_select option is not found (schema drift)', () => {
    const f = field({ type: 'single_select', options: [{ label: 'Red', value: 'red' }] });
    expect(describeAnswerValue(answer('f1', 'green'), f)).toEqual({ kind: 'text', text: 'green' });
  });

  it('renders multi_select as comma-joined option labels', () => {
    const f = field({
      type: 'multi_select',
      options: [{ label: 'Alpha', value: 'a' }, { label: 'Beta', value: 'b' }, { label: 'Gamma', value: 'g' }],
    });
    expect(describeAnswerValue(answer('f1', ['a', 'g']), f)).toEqual({ kind: 'text', text: 'Alpha, Gamma' });
  });

  it('renders an empty multi_select as an em dash', () => {
    const f = field({ type: 'multi_select', options: [] });
    expect(describeAnswerValue(answer('f1', []), f)).toEqual({ kind: 'text', text: '—' });
  });

  it('renders file_upload as artifact metadata with a resolved URL', () => {
    const f = field({ type: 'file_upload' });
    const value = { artifact_id: 'art_1', filename: 'resume.pdf', content_type: 'application/pdf', size_bytes: 204800 };
    const result = describeAnswerValue(answer('f1', value), f, 'https://cdn.example.com/resume.pdf');
    expect(result).toEqual({
      kind: 'artifact',
      filename: 'resume.pdf',
      contentType: 'application/pdf',
      sizeLabel: '200.0 KB',
      url: 'https://cdn.example.com/resume.pdf',
    });
  });

  it('renders video_response artifact metadata without a URL when none is configured', () => {
    const f = field({ type: 'video_response' });
    const value = { artifact_id: 'art_2', filename: 'intro.webm', content_type: 'video/webm', size_bytes: 3_500_000 };
    const result = describeAnswerValue(answer('f1', value), f);
    expect(result.kind).toBe('artifact');
    expect(result).toMatchObject({ filename: 'intro.webm', url: undefined });
  });

  it('falls back to JSON when the field metadata is missing entirely (removed field)', () => {
    const value = { artifact_id: 'art_3', filename: 'x.pdf', content_type: 'application/pdf', size_bytes: 10 };
    const result = describeAnswerValue(answer('gone', value), undefined);
    expect(result.kind).toBe('json');
  });
});

describe('isArtifactAnswerValue', () => {
  it('identifies artifact-shaped values and rejects everything else', () => {
    expect(isArtifactAnswerValue({ artifact_id: 'a', filename: 'x', content_type: 'y', size_bytes: 1 })).toBe(true);
    expect(isArtifactAnswerValue('text')).toBe(false);
    expect(isArtifactAnswerValue(42)).toBe(false);
    expect(isArtifactAnswerValue(true)).toBe(false);
    expect(isArtifactAnswerValue(['a', 'b'])).toBe(false);
  });
});

describe('formatBytes', () => {
  it('formats bytes, kilobytes, and megabytes', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2048)).toBe('2.0 KB');
    expect(formatBytes(5_242_880)).toBe('5.0 MB');
  });
});
