import { beforeEach, describe, expect, it } from 'vitest';
import { ZodError } from 'zod';
import {
  completeSession,
  createForm,
  getForm,
  getNextStep,
  getSession,
  getSubmission,
  listForms,
  pauseSession,
  publishForm,
  resumeSession,
  startSession,
  submitAnswer,
  updateForm,
} from '@/lib/agentic-forms/runtime';
import {
  basicForm,
  conditionalForm,
  createPublishedForm,
  expectPublicError,
  resetStore,
  stepId,
} from './helpers';

beforeEach(() => {
  resetStore();
});

function startBasicSession() {
  const form = createPublishedForm(basicForm);
  const first = startSession(form.id);
  return { form, sessionId: first.session_id, first };
}

function answerRequiredBasicFields(sessionId: string) {
  submitAnswer(sessionId, { field_id: 'name', value: 'Aarav Mehta' });
  submitAnswer(sessionId, { field_id: 'email', value: 'aarav@example.com' });
  submitAnswer(sessionId, { field_id: 'color', value: 'red' });
}

describe('seed data', () => {
  it('starts with the published sample form in the demo tenant', () => {
    const forms = listForms();
    expect(forms).toHaveLength(1);
    expect(forms[0]?.id).toBe('sample-hiring');
    expect(forms[0]?.status).toBe('published');
    expect(forms[0]?.tenant_id).toBe('tenant_demo');
  });
});

describe('createForm', () => {
  it('creates a draft with no published version', () => {
    const form = createForm(basicForm);
    expect(form.id).toMatch(/^form_/);
    expect(form.status).toBe('draft');
    expect(form.current_version).toBeNull();
    expect(form.tenant_id).toBe('tenant_demo');
    expect(form.draft.title).toBe('Customer Intake');
    expect(form.draft.fields).toHaveLength(5);
  });

  it('stores the form so it can be listed and read', () => {
    const form = createForm(basicForm);
    expect(listForms().map((item) => item.id)).toContain(form.id);
    expect(getForm(form.id).id).toBe(form.id);
  });

  it('rejects an invalid definition', () => {
    expect(() => createForm({ title: '', fields: [] })).toThrow(ZodError);
    expect(listForms()).toHaveLength(1);
  });
});

describe('updateForm', () => {
  it('changes the draft and keeps untouched parts', () => {
    const form = createForm(basicForm);
    const updated = updateForm(form.id, { title: 'Renamed Intake' });
    expect(updated.draft.title).toBe('Renamed Intake');
    expect(updated.draft.fields).toHaveLength(5);
    expect(updated.status).toBe('draft');
  });

  it('rejects an invalid patch', () => {
    const form = createForm(basicForm);
    expect(() => updateForm(form.id, { fields: [] })).toThrow(ZodError);
    expect(getForm(form.id).draft.fields).toHaveLength(5);
  });

  it('fails for an unknown form', () => {
    expectPublicError(() => updateForm('form_missing', { title: 'X' }), 'NOT_FOUND', 404);
  });
});

describe('publishForm and versions', () => {
  it('publishes a draft as version 1', () => {
    const draft = createForm(basicForm);
    const published = publishForm(draft.id);
    expect(published.status).toBe('published');
    expect(published.current_version?.version).toBe(1);
    expect(published.current_version?.form_id).toBe(draft.id);
    expect(published.current_version?.schema_version).toBe('1.0');
    expect(published.current_version?.schema).toEqual(published.draft);
  });

  it('creates a new version on each publish', () => {
    const draft = createForm(basicForm);
    const first = publishForm(draft.id);
    const second = publishForm(draft.id);
    expect(second.current_version?.version).toBe(2);
    expect(second.current_version?.id).not.toBe(first.current_version?.id);
  });

  it('does not change a published version when the draft is edited', () => {
    const published = createPublishedForm(basicForm);
    updateForm(published.id, { title: 'Edited After Publish' });
    const current = getForm(published.id);
    expect(current.draft.title).toBe('Edited After Publish');
    expect(current.current_version?.schema.title).toBe('Customer Intake');
  });

  it('fails for an unknown form', () => {
    expectPublicError(() => publishForm('form_missing'), 'NOT_FOUND', 404);
  });

  it('hides a form from another tenant', () => {
    const draft = createForm(basicForm);
    expectPublicError(() => publishForm(draft.id, 'tenant_other'), 'NOT_FOUND', 404);
  });
});

describe('startSession', () => {
  it('starts a session on the first question', () => {
    const { form, first } = startBasicSession();
    expect(first.session_id).toMatch(/^sess_/);
    expect(first.status).toBe('awaiting_answer');
    expect(first.schema_version).toBe('1.0');
    expect(stepId(first)).toBe('name');

    const session = getSession(first.session_id);
    expect(session.form_id).toBe(form.id);
    expect(session.tenant_id).toBe('tenant_demo');
    expect(session.form_version_id).toBe(form.current_version?.id);
    expect(session.answers).toEqual([]);
    expect(session.events.map((event) => event.type)).toEqual(['session_started']);
  });

  it('records the respondent id', () => {
    const form = createPublishedForm(basicForm);
    const first = startSession(form.id, 'candidate_123');
    expect(getSession(first.session_id).respondent_id).toBe('candidate_123');
  });

  it('refuses a form that is not published', () => {
    const draft = createForm(basicForm);
    expectPublicError(() => startSession(draft.id), 'FORM_NOT_PUBLISHED', 409);
  });

  it('fails for an unknown form', () => {
    expectPublicError(() => startSession('form_missing'), 'NOT_FOUND', 404);
  });

  it('keeps a running session on the version it started with', () => {
    const { form, sessionId } = startBasicSession();
    const fields = form.draft.fields.map((field) => (
      field.id === 'name' ? { ...field, label: 'New name question' } : field
    ));
    updateForm(form.id, { fields });
    const republished = publishForm(form.id);

    expect(getSession(sessionId).form_version_id).toBe(form.current_version?.id);
    const next = getNextStep(sessionId);
    expect('prompt' in next.step ? next.step.prompt : null).toBe('What is your name?');

    const fresh = startSession(form.id);
    expect(getSession(fresh.session_id).form_version_id).toBe(republished.current_version?.id);
    expect('prompt' in fresh.step ? fresh.step.prompt : null).toBe('New name question');
  });
});

describe('getNextStep', () => {
  it('describes the current question', () => {
    const { first } = startBasicSession();
    expect(first.step).toEqual({
      id: 'name',
      type: 'short_text',
      prompt: 'What is your name?',
      description: undefined,
      required: true,
      options: undefined,
      validation: { min_length: 2, max_length: 50 },
    });
    expect(first.allowed_answer_types).toEqual(['text']);
  });

  it('walks the fields in order and ends with completion', () => {
    const { sessionId } = startBasicSession();
    const seen: Array<string | null> = [];
    seen.push(stepId(submitAnswer(sessionId, { field_id: 'name', value: 'Aarav Mehta' })));
    seen.push(stepId(submitAnswer(sessionId, { field_id: 'email', value: 'aarav@example.com' })));
    seen.push(stepId(submitAnswer(sessionId, { field_id: 'color', value: 'red' })));
    seen.push(stepId(submitAnswer(sessionId, { field_id: 'tags', value: ['a'] })));
    const last = submitAnswer(sessionId, { field_id: 'age', value: 30 });

    expect(seen).toEqual(['email', 'color', 'tags', 'age']);
    expect(last.step.type).toBe('completion');
  });

  it('returns the same step until it is answered', () => {
    const { sessionId } = startBasicSession();
    expect(stepId(getNextStep(sessionId))).toBe('name');
    expect(stepId(getNextStep(sessionId))).toBe('name');
  });

  it('fails for an unknown session', () => {
    expectPublicError(() => getNextStep('sess_missing'), 'NOT_FOUND', 404);
  });

  it('flags a video step as requiring recording consent', () => {
    const form = createPublishedForm({
      title: 'Video Intro',
      fields: [
        { id: 'recording_consent', type: 'consent', label: 'I agree to be recorded.', required: true },
        { id: 'intro_video', type: 'video_response', label: 'Record an intro', required: true },
      ],
    });
    const first = startSession(form.id);
    expect(stepId(first)).toBe('recording_consent');
    expect(first.consent).toBeUndefined();

    submitAnswer(first.session_id, { field_id: 'recording_consent', value: true });
    const next = getNextStep(first.session_id);
    expect(stepId(next)).toBe('intro_video');
    expect(next.consent).toEqual({ recording_required: true });
  });
});

describe('conditional visibility', () => {
  it('shows a dependent question when the condition matches', () => {
    const form = createPublishedForm(conditionalForm);
    const first = startSession(form.id);
    const next = submitAnswer(first.session_id, { field_id: 'has_pet', value: 'yes' });
    expect(stepId(next)).toBe('pet_name');
  });

  it('skips a dependent question when the condition does not match', () => {
    const form = createPublishedForm(conditionalForm);
    const first = startSession(form.id);
    const next = submitAnswer(first.session_id, { field_id: 'has_pet', value: 'no' });
    expect(next.step.type).toBe('completion');
  });

  it('hides a dependent question before its controlling question is answered', () => {
    const form = createPublishedForm(conditionalForm);
    const first = startSession(form.id);
    const error = expectPublicError(
      () => submitAnswer(first.session_id, { field_id: 'pet_name', value: 'Bruno' }),
      'INVALID_INPUT',
      400,
    );
    expect(error.field).toBe('pet_name');
  });

  it('rejects an answer to a hidden question', () => {
    const form = createPublishedForm(conditionalForm);
    const first = startSession(form.id);
    submitAnswer(first.session_id, { field_id: 'has_pet', value: 'no' });
    expectPublicError(
      () => submitAnswer(first.session_id, { field_id: 'pet_name', value: 'Bruno' }),
      'INVALID_INPUT',
      400,
    );
  });

  it('does not require a hidden required question at completion', () => {
    const form = createPublishedForm(conditionalForm);
    const first = startSession(form.id);
    submitAnswer(first.session_id, { field_id: 'has_pet', value: 'no' });
    const submission = completeSession(first.session_id);
    expect(submission.answers.map((answer) => answer.field_id)).toEqual(['has_pet']);
  });

  it('supports not_equals and includes operators', () => {
    const form = createPublishedForm({
      title: 'Operators',
      fields: [
        {
          id: 'plan',
          type: 'single_select',
          label: 'Plan',
          options: [{ label: 'Free', value: 'free' }, { label: 'Pro', value: 'pro' }],
        },
        {
          id: 'topics',
          type: 'multi_select',
          label: 'Topics',
          options: [{ label: 'Billing', value: 'billing' }, { label: 'Other', value: 'other' }],
        },
        {
          id: 'paid_feedback',
          type: 'short_text',
          label: 'Paid feedback',
          visible_if: { field_id: 'plan', operator: 'not_equals', value: 'free' },
        },
        {
          id: 'billing_detail',
          type: 'short_text',
          label: 'Billing detail',
          visible_if: { field_id: 'topics', operator: 'includes', value: 'billing' },
        },
      ],
    });
    const first = startSession(form.id);
    submitAnswer(first.session_id, { field_id: 'plan', value: 'pro' });
    const next = submitAnswer(first.session_id, { field_id: 'topics', value: ['billing'] });
    expect(stepId(next)).toBe('paid_feedback');
    const afterFeedback = submitAnswer(first.session_id, { field_id: 'paid_feedback', value: 'Great' });
    expect(stepId(afterFeedback)).toBe('billing_detail');
  });
});

describe('submitAnswer: valid answers', () => {
  it('stores the answer and records an event', () => {
    const { sessionId } = startBasicSession();
    submitAnswer(sessionId, { field_id: 'name', value: 'Aarav Mehta' });

    const session = getSession(sessionId);
    expect(session.answers).toHaveLength(1);
    expect(session.answers[0]?.field_id).toBe('name');
    expect(session.answers[0]?.value).toBe('Aarav Mehta');
    expect(session.answers[0]?.source).toBe('human');
    expect(session.events.map((event) => event.type)).toEqual(['session_started', 'answer_submitted']);
    expect(session.events[1]?.input?.field_id).toBe('name');
  });

  it('marks the source of an agent answer', () => {
    const { sessionId } = startBasicSession();
    submitAnswer(sessionId, { field_id: 'name', value: 'Aarav Mehta' }, 'agent');
    expect(getSession(sessionId).answers[0]?.source).toBe('agent');
  });

  it('replaces an earlier answer to the same question', () => {
    const { sessionId } = startBasicSession();
    submitAnswer(sessionId, { field_id: 'name', value: 'Aarav Mehta' });
    submitAnswer(sessionId, { field_id: 'name', value: 'Aarav M.' });

    const session = getSession(sessionId);
    expect(session.answers).toHaveLength(1);
    expect(session.answers[0]?.value).toBe('Aarav M.');
  });

  it('accepts select and number answers', () => {
    const { sessionId } = startBasicSession();
    submitAnswer(sessionId, { field_id: 'color', value: 'blue' });
    submitAnswer(sessionId, { field_id: 'tags', value: ['a', 'b'] });
    submitAnswer(sessionId, { field_id: 'age', value: 30 });
    expect(getSession(sessionId).answers.map((answer) => answer.value)).toEqual(['blue', ['a', 'b'], 30]);
  });

  it('accepts a number field without min/max at any value', () => {
    const { sessionId } = startBasicSession();
    submitAnswer(sessionId, { field_id: 'age', value: -100 });
    expect(getSession(sessionId).answers.find((answer) => answer.field_id === 'age')?.value).toBe(-100);
  });

  it('accepts a number equal to the declared min or max, and inside the range', () => {
    const form = createPublishedForm({
      title: 'Bounded Number',
      fields: [{ id: 'score', type: 'number', label: 'Score', validation: { min: 1, max: 10 } }],
    });

    const atMin = startSession(form.id);
    submitAnswer(atMin.session_id, { field_id: 'score', value: 1 });
    expect(getSession(atMin.session_id).answers[0]?.value).toBe(1);

    const atMax = startSession(form.id);
    submitAnswer(atMax.session_id, { field_id: 'score', value: 10 });
    expect(getSession(atMax.session_id).answers[0]?.value).toBe(10);

    const inRange = startSession(form.id);
    submitAnswer(inRange.session_id, { field_id: 'score', value: 5 });
    expect(getSession(inRange.session_id).answers[0]?.value).toBe(5);
  });

  it('accepts a rating field without min/max at any numeric value', () => {
    const form = createPublishedForm({
      title: 'Unbounded Rating',
      fields: [{ id: 'satisfaction', type: 'rating', label: 'How satisfied are you?' }],
    });
    const first = startSession(form.id);
    submitAnswer(first.session_id, { field_id: 'satisfaction', value: 42 });
    expect(getSession(first.session_id).answers[0]?.value).toBe(42);
  });

  it('accepts a rating equal to the declared min or max, and inside the range', () => {
    const form = createPublishedForm({
      title: 'Bounded Rating',
      fields: [{ id: 'satisfaction', type: 'rating', label: 'How satisfied are you?', validation: { min: 1, max: 5 } }],
    });

    const atMin = startSession(form.id);
    submitAnswer(atMin.session_id, { field_id: 'satisfaction', value: 1 });
    expect(getSession(atMin.session_id).answers[0]?.value).toBe(1);

    const atMax = startSession(form.id);
    submitAnswer(atMax.session_id, { field_id: 'satisfaction', value: 5 });
    expect(getSession(atMax.session_id).answers[0]?.value).toBe(5);

    const inRange = startSession(form.id);
    submitAnswer(inRange.session_id, { field_id: 'satisfaction', value: 3 });
    expect(getSession(inRange.session_id).answers[0]?.value).toBe(3);
  });

  it('accepts a decimal rating value', () => {
    const form = createPublishedForm({
      title: 'Bounded Rating',
      fields: [{ id: 'satisfaction', type: 'rating', label: 'How satisfied are you?', validation: { min: 1, max: 5 } }],
    });
    const first = startSession(form.id);
    submitAnswer(first.session_id, { field_id: 'satisfaction', value: 3.5 });
    expect(getSession(first.session_id).answers[0]?.value).toBe(3.5);
  });

  it('accepts an empty answer for a non-required number field even with a positive min', () => {
    const form = createPublishedForm({
      title: 'Optional Bounded Number',
      fields: [{ id: 'score', type: 'number', label: 'Score', required: false, validation: { min: 1, max: 10 } }],
    });
    const first = startSession(form.id);
    submitAnswer(first.session_id, { field_id: 'score', value: '' });
    expect(getSession(first.session_id).answers[0]?.value).toBe('');
  });

  it('accepts an empty answer for a non-required rating field even with a positive min', () => {
    const form = createPublishedForm({
      title: 'Optional Bounded Rating',
      fields: [{ id: 'satisfaction', type: 'rating', label: 'How satisfied are you?', required: false, validation: { min: 1, max: 5 } }],
    });
    const first = startSession(form.id);
    submitAnswer(first.session_id, { field_id: 'satisfaction', value: '' });
    expect(getSession(first.session_id).answers[0]?.value).toBe('');
  });

  it('still rejects an empty answer for a required number or rating field', () => {
    const form = createPublishedForm({
      title: 'Required Bounded Fields',
      fields: [
        { id: 'score', type: 'number', label: 'Score', required: true, validation: { min: 1, max: 10 } },
        { id: 'satisfaction', type: 'rating', label: 'Satisfaction', required: true, validation: { min: 1, max: 5 } },
      ],
    });
    const first = startSession(form.id);
    expectPublicError(() => submitAnswer(first.session_id, { field_id: 'score', value: '' }), 'INVALID_INPUT', 400);

    const second = startSession(form.id);
    expectPublicError(() => submitAnswer(second.session_id, { field_id: 'satisfaction', value: '' }), 'INVALID_INPUT', 400);
  });

  it('accepts a valid YYYY-MM-DD date', () => {
    const form = createPublishedForm({
      title: 'Date Form',
      fields: [{ id: 'birthday', type: 'date', label: 'Birthday' }],
    });
    const first = startSession(form.id);
    submitAnswer(first.session_id, { field_id: 'birthday', value: '2026-09-29' });
    expect(getSession(first.session_id).answers[0]?.value).toBe('2026-09-29');
  });

  it('accepts a valid leap-year date', () => {
    const form = createPublishedForm({
      title: 'Date Form',
      fields: [{ id: 'birthday', type: 'date', label: 'Birthday' }],
    });
    const first = startSession(form.id);
    submitAnswer(first.session_id, { field_id: 'birthday', value: '2024-02-29' });
    expect(getSession(first.session_id).answers[0]?.value).toBe('2024-02-29');
  });
});

describe('submitAnswer: invalid answers', () => {
  it('rejects a video answer when no consent has been given', () => {
    const form = createPublishedForm({
      title: 'Video Only',
      fields: [{ id: 'intro_video', type: 'video_response', label: 'Record an intro', required: true }],
    });
    const first = startSession(form.id);
    expectPublicError(
      () => submitAnswer(first.session_id, {
        field_id: 'intro_video',
        value: { artifact_id: 'art_1', filename: 'intro.webm', content_type: 'video/webm', size_bytes: 1024 },
      }),
      'CONSENT_REQUIRED',
      400,
    );
  });

  it('rejects text that is too short or too long', () => {
    const { sessionId } = startBasicSession();
    const tooShort = expectPublicError(
      () => submitAnswer(sessionId, { field_id: 'name', value: 'A' }),
      'INVALID_INPUT',
      400,
    );
    expect(tooShort.field).toBe('name');
    expectPublicError(
      () => submitAnswer(sessionId, { field_id: 'name', value: 'A'.repeat(51) }),
      'INVALID_INPUT',
      400,
    );
    expect(getSession(sessionId).answers).toEqual([]);
  });

  it('rejects an empty required answer', () => {
    const { sessionId } = startBasicSession();
    expectPublicError(() => submitAnswer(sessionId, { field_id: 'name', value: '' }), 'INVALID_INPUT', 400);
  });

  it('rejects a malformed email', () => {
    const { sessionId } = startBasicSession();
    expect(() => submitAnswer(sessionId, { field_id: 'email', value: 'not-an-email' })).toThrow(ZodError);
    expect(getSession(sessionId).answers).toEqual([]);
  });

  describe('date field', () => {
    function startDateSession() {
      const form = createPublishedForm({
        title: 'Date Form',
        fields: [{ id: 'birthday', type: 'date', label: 'Birthday' }],
      });
      return startSession(form.id);
    }

    it('rejects an impossible day of month (2026-02-31)', () => {
      const first = startDateSession();
      const error = expectPublicError(
        () => submitAnswer(first.session_id, { field_id: 'birthday', value: '2026-02-31' }),
        'INVALID_INPUT',
        400,
      );
      expect(error.field).toBe('birthday');
    });

    it('rejects an impossible month (2026-13-01)', () => {
      const first = startDateSession();
      expectPublicError(
        () => submitAnswer(first.session_id, { field_id: 'birthday', value: '2026-13-01' }),
        'INVALID_INPUT',
        400,
      );
    });

    it('rejects a zero month (2026-00-10)', () => {
      const first = startDateSession();
      expectPublicError(
        () => submitAnswer(first.session_id, { field_id: 'birthday', value: '2026-00-10' }),
        'INVALID_INPUT',
        400,
      );
    });

    it('rejects February 29 in a non-leap year (2023-02-29)', () => {
      const first = startDateSession();
      expectPublicError(
        () => submitAnswer(first.session_id, { field_id: 'birthday', value: '2023-02-29' }),
        'INVALID_INPUT',
        400,
      );
    });

    it('rejects a full timestamp instead of a date-only string', () => {
      const first = startDateSession();
      expectPublicError(
        () => submitAnswer(first.session_id, { field_id: 'birthday', value: '2026-09-29T10:00:00Z' }),
        'INVALID_INPUT',
        400,
      );
    });

    it('rejects a non-string value', () => {
      const first = startDateSession();
      expectPublicError(
        () => submitAnswer(first.session_id, { field_id: 'birthday', value: 20260929 }),
        'INVALID_INPUT',
        400,
      );
    });
  });

  it('rejects an option that is not in the list', () => {
    const { sessionId } = startBasicSession();
    expectPublicError(() => submitAnswer(sessionId, { field_id: 'color', value: 'green' }), 'INVALID_INPUT', 400);
    expectPublicError(() => submitAnswer(sessionId, { field_id: 'tags', value: ['a', 'z'] }), 'INVALID_INPUT', 400);
  });

  it('rejects a non-number for a number field', () => {
    const { sessionId } = startBasicSession();
    expectPublicError(() => submitAnswer(sessionId, { field_id: 'age', value: 'thirty' }), 'INVALID_INPUT', 400);
  });

  it('enforces min/max bounds on a number field that declares them', () => {
    const form = createPublishedForm({
      title: 'Bounded Number',
      fields: [{ id: 'score', type: 'number', label: 'Score', validation: { min: 1, max: 10 } }],
    });
    const first = startSession(form.id);

    const tooLow = expectPublicError(
      () => submitAnswer(first.session_id, { field_id: 'score', value: 0 }),
      'INVALID_INPUT',
      400,
    );
    expect(tooLow.field).toBe('score');

    const tooHigh = expectPublicError(
      () => submitAnswer(first.session_id, { field_id: 'score', value: 11 }),
      'INVALID_INPUT',
      400,
    );
    expect(tooHigh.field).toBe('score');
  });

  it('rejects a non-number for a rating field', () => {
    const form = createPublishedForm({
      title: 'Unbounded Rating',
      fields: [{ id: 'satisfaction', type: 'rating', label: 'How satisfied are you?' }],
    });
    const first = startSession(form.id);
    expectPublicError(
      () => submitAnswer(first.session_id, { field_id: 'satisfaction', value: 'great' }),
      'INVALID_INPUT',
      400,
    );
  });

  it('enforces min/max bounds on a rating field that declares them', () => {
    const form = createPublishedForm({
      title: 'Bounded Rating',
      fields: [{ id: 'satisfaction', type: 'rating', label: 'How satisfied are you?', validation: { min: 1, max: 5 } }],
    });
    const first = startSession(form.id);

    const tooLow = expectPublicError(
      () => submitAnswer(first.session_id, { field_id: 'satisfaction', value: 0 }),
      'INVALID_INPUT',
      400,
    );
    expect(tooLow.field).toBe('satisfaction');

    const tooHigh = expectPublicError(
      () => submitAnswer(first.session_id, { field_id: 'satisfaction', value: 6 }),
      'INVALID_INPUT',
      400,
    );
    expect(tooHigh.field).toBe('satisfaction');
  });

  it('rejects an unknown field id', () => {
    const { sessionId } = startBasicSession();
    const error = expectPublicError(
      () => submitAnswer(sessionId, { field_id: 'nickname', value: 'Avi' }),
      'INVALID_INPUT',
      400,
    );
    expect(error.field).toBe('field_id');
  });

  it('rejects a malformed request body', () => {
    const { sessionId } = startBasicSession();
    expect(() => submitAnswer(sessionId, { value: 'Aarav Mehta' })).toThrow(ZodError);
  });

  it('rejects a consent answer that is not true', () => {
    const first = startSession('sample-hiring');
    expectPublicError(
      () => submitAnswer(first.session_id, { field_id: 'recording_consent', value: false }),
      'INVALID_INPUT',
      400,
    );
  });

  it('rejects a video answer when nothing has been consented to', () => {
    const form = createPublishedForm({
      title: 'Video Only',
      fields: [{ id: 'intro_video', type: 'video_response', label: 'Record an intro', required: true }],
    });
    const first = startSession(form.id);
    expectPublicError(
      () => submitAnswer(first.session_id, {
        field_id: 'intro_video',
        value: { artifact_id: 'art_1', filename: 'intro.webm', content_type: 'video/webm', size_bytes: 1024 },
      }),
      'CONSENT_REQUIRED',
      400,
    );
  });
});

describe('required fields at completion', () => {
  it('refuses to complete while required answers are missing', () => {
    const { sessionId } = startBasicSession();
    submitAnswer(sessionId, { field_id: 'name', value: 'Aarav Mehta' });

    const error = expectPublicError(() => completeSession(sessionId), 'INVALID_INPUT', 400);
    expect(error.details).toEqual({ fields: ['email', 'color'] });
    expect(getSession(sessionId).status).toBe('awaiting_answer');
  });

  it('completes without optional answers', () => {
    const { sessionId } = startBasicSession();
    answerRequiredBasicFields(sessionId);
    const submission = completeSession(sessionId);
    expect(submission.answers.map((answer) => answer.field_id)).toEqual(['name', 'email', 'color']);
  });
});

describe('pause and resume', () => {
  it('pauses and resumes a running session', () => {
    const { sessionId } = startBasicSession();

    const paused = pauseSession(sessionId);
    expect(paused.status).toBe('paused');
    expect(getSession(sessionId).status).toBe('paused');

    const resumed = resumeSession(sessionId);
    expect(resumed.status).toBe('awaiting_answer');
    expect(stepId(resumed)).toBe('name');
    expect(getSession(sessionId).events.map((event) => event.type)).toEqual([
      'session_started',
      'session_paused',
      'session_resumed',
    ]);
  });

  it('refuses answers while paused', () => {
    const { sessionId } = startBasicSession();
    pauseSession(sessionId);
    expectPublicError(
      () => submitAnswer(sessionId, { field_id: 'name', value: 'Aarav Mehta' }),
      'SESSION_CONFLICT',
      409,
    );
  });

  it('keeps earlier answers across pause and resume', () => {
    const { sessionId } = startBasicSession();
    submitAnswer(sessionId, { field_id: 'name', value: 'Aarav Mehta' });
    pauseSession(sessionId);
    const resumed = resumeSession(sessionId);
    expect(stepId(resumed)).toBe('email');
    expect(getSession(sessionId).answers).toHaveLength(1);
  });

  it('fails for an unknown session', () => {
    expectPublicError(() => pauseSession('sess_missing'), 'NOT_FOUND', 404);
    expectPublicError(() => resumeSession('sess_missing'), 'NOT_FOUND', 404);
  });
});

describe('completeSession', () => {
  it('creates a submission and completes the session', () => {
    const { form, sessionId } = startBasicSession();
    answerRequiredBasicFields(sessionId);

    const submission = completeSession(sessionId);
    expect(submission.id).toMatch(/^sub_/);
    expect(submission.session_id).toBe(sessionId);
    expect(submission.form_id).toBe(form.id);
    expect(submission.form_version_id).toBe(form.current_version?.id);
    expect(submission.tenant_id).toBe('tenant_demo');
    expect(submission.answers.map((answer) => answer.value)).toEqual(['Aarav Mehta', 'aarav@example.com', 'red']);

    const session = getSession(sessionId);
    expect(session.status).toBe('completed');
    expect(session.completed_at).toBeDefined();
    expect(session.events.at(-1)?.type).toBe('session_completed');
  });

  it('makes the submission readable by id', () => {
    const { sessionId } = startBasicSession();
    answerRequiredBasicFields(sessionId);
    const submission = completeSession(sessionId);
    expect(getSubmission(submission.id)).toEqual(submission);
  });

  it('returns the same submission when completed twice', () => {
    const { sessionId } = startBasicSession();
    answerRequiredBasicFields(sessionId);
    const first = completeSession(sessionId);
    const second = completeSession(sessionId);
    expect(second.id).toBe(first.id);
  });

  it('refuses answers after completion', () => {
    const { sessionId } = startBasicSession();
    answerRequiredBasicFields(sessionId);
    completeSession(sessionId);
    expectPublicError(
      () => submitAnswer(sessionId, { field_id: 'name', value: 'Someone Else' }),
      'SESSION_CONFLICT',
      409,
    );
  });

  it('fails for an unknown session or submission', () => {
    expectPublicError(() => completeSession('sess_missing'), 'NOT_FOUND', 404);
    expectPublicError(() => getSubmission('sub_missing'), 'NOT_FOUND', 404);
  });
});

describe('idempotent answer submission', () => {
  it('ignores a repeated idempotency key', () => {
    const { sessionId } = startBasicSession();
    const first = submitAnswer(sessionId, { field_id: 'name', value: 'Aarav Mehta', idempotency_key: 'name-1' });
    const repeat = submitAnswer(sessionId, { field_id: 'name', value: 'Aarav Mehta', idempotency_key: 'name-1' });

    expect(stepId(repeat)).toBe(stepId(first));
    const session = getSession(sessionId);
    expect(session.answers).toHaveLength(1);
    expect(session.events.filter((event) => event.type === 'answer_submitted')).toHaveLength(1);
  });

  it('applies a new idempotency key as a new answer', () => {
    const { sessionId } = startBasicSession();
    submitAnswer(sessionId, { field_id: 'name', value: 'Aarav Mehta', idempotency_key: 'name-1' });
    submitAnswer(sessionId, { field_id: 'name', value: 'Aarav M.', idempotency_key: 'name-2' });

    const session = getSession(sessionId);
    expect(session.answers[0]?.value).toBe('Aarav M.');
    expect(session.events.filter((event) => event.type === 'answer_submitted')).toHaveLength(2);
  });

  it('stores the key on the event', () => {
    const { sessionId } = startBasicSession();
    submitAnswer(sessionId, { field_id: 'name', value: 'Aarav Mehta', idempotency_key: 'name-1' });
    expect(getSession(sessionId).events[1]?.input?.idempotency_key).toBe('name-1');
  });
});

describe('known bugs (pending fixes)', () => {
  // BUG: setSessionStatus() in runtime.ts changes the status without checking the current one,
  // so resumeSession() reopens a completed session and it accepts new answers again.
  // EXPECTED: 'completed' is final. Pause and resume on a completed session must fail with
  // SESSION_CONFLICT (409), and the session must stay 'completed'.
  it('does not allow a completed session to be resumed or paused', () => {
    const { sessionId } = startBasicSession();
    answerRequiredBasicFields(sessionId);
    completeSession(sessionId);

    expectPublicError(() => resumeSession(sessionId), 'SESSION_CONFLICT', 409);
    expectPublicError(() => pauseSession(sessionId), 'SESSION_CONFLICT', 409);
    expect(getSession(sessionId).status).toBe('completed');
    expectPublicError(
      () => submitAnswer(sessionId, { field_id: 'name', value: 'Changed Later' }),
      'SESSION_CONFLICT',
      409,
    );
  });

  // BUG: validateAnswer() in runtime.ts treats any earlier answer whose value is `true`
  // as recording consent, even when that answer belongs to an unrelated question.
  // EXPECTED: a video answer is accepted only after the respondent has agreed to a consent
  // question that covers recording. A `true` answer to an unrelated question must not count,
  // so this submission must fail with CONSENT_REQUIRED (400).
  it('does not treat an unrelated true answer as recording consent', () => {
    const form = createPublishedForm({
      title: 'Video Without Recording Consent',
      fields: [
        { id: 'newsletter_opt_in', type: 'consent', label: 'Send me the newsletter.' },
        { id: 'intro_video', type: 'video_response', label: 'Record an intro', required: true },
      ],
    });
    const first = startSession(form.id);
    submitAnswer(first.session_id, { field_id: 'newsletter_opt_in', value: true });

    expectPublicError(
      () => submitAnswer(first.session_id, {
        field_id: 'intro_video',
        value: { artifact_id: 'art_1', filename: 'intro.webm', content_type: 'video/webm', size_bytes: 1024 },
      }),
      'CONSENT_REQUIRED',
      400,
    );
  });
});
