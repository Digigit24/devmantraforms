import { z } from 'zod';
import {
  CreateFormInputSchema,
  FormSchemaDefinitionSchema,
  SubmitAnswerInputSchema,
  UpdateFormInputSchema,
  type AnswerValue,
  type FormField,
  type FormSchemaDefinition,
} from './schema';
import { AgenticFormError, publicError } from './errors';
import { createAnswer, createEvent, createId, getDefaultTenantId, getStore, now } from './store';
import { getArtifact, markArtifactAttached } from './storage';
import type {
  FormRecord,
  FormVersionRecord,
  NextStepResponse,
  PublishedFormView,
  SessionAnswer,
  SessionRecord,
  SubmissionRecord,
  TenantRecord,
} from './types';

export function listTenants(): TenantRecord[] {
  return [...getStore().tenants.values()];
}

export function getTenantBySlug(slug: string): TenantRecord {
  const tenant = [...getStore().tenants.values()].find((candidate) => candidate.slug === slug);
  if (!tenant) throw publicError('NOT_FOUND', 'Tenant was not found.', 404);
  return tenant;
}

export function listForms(tenantId = getDefaultTenantId()): PublishedFormView[] {
  const store = getStore();
  return [...store.forms.values()]
    .filter((form) => form.tenant_id === tenantId)
    .map((form) => toPublishedView(form));
}

export function createForm(input: unknown, tenantId = getDefaultTenantId()): PublishedFormView {
  const data = CreateFormInputSchema.parse(input);
  const store = getStore();
  const timestamp = now();
  const form: FormRecord = {
    id: createId('form'),
    tenant_id: tenantId,
    owner_id: data.owner_id,
    status: 'draft',
    draft: {
      title: data.title,
      description: data.description,
      fields: data.fields,
      policy: data.policy,
    },
    current_version_id: null,
    created_at: timestamp,
    updated_at: timestamp,
  };
  store.forms.set(form.id, form);
  return toPublishedView(form);
}

export function getForm(formId: string, tenantId?: string): PublishedFormView {
  const form = getStore().forms.get(formId);
  if (!form) throw publicError('NOT_FOUND', 'Form was not found.', 404);
  if (tenantId && form.tenant_id !== tenantId) throw publicError('NOT_FOUND', 'Form was not found.', 404);
  return toPublishedView(form);
}

export function updateForm(formId: string, input: unknown): PublishedFormView {
  const patch = UpdateFormInputSchema.parse(input);
  const store = getStore();
  const form = store.forms.get(formId);
  if (!form) throw publicError('NOT_FOUND', 'Form was not found.', 404);
  const draft = FormSchemaDefinitionSchema.parse({ ...form.draft, ...patch });
  const next: FormRecord = { ...form, draft, updated_at: now() };
  store.forms.set(formId, next);
  return toPublishedView(next);
}

export function publishForm(formId: string, tenantId?: string): PublishedFormView {
  const store = getStore();
  const form = store.forms.get(formId);
  if (!form) throw publicError('NOT_FOUND', 'Form was not found.', 404);
  if (tenantId && form.tenant_id !== tenantId) throw publicError('NOT_FOUND', 'Form was not found.', 404);
  const existingVersions = [...store.versions.values()].filter((version) => version.form_id === formId);
  const version: FormVersionRecord = {
    id: createId('fv'),
    form_id: formId,
    version: existingVersions.length + 1,
    schema_version: '1.0',
    schema: FormSchemaDefinitionSchema.parse(form.draft),
    created_at: now(),
  };
  const next: FormRecord = {
    ...form,
    status: 'published',
    current_version_id: version.id,
    updated_at: now(),
  };
  store.versions.set(version.id, version);
  store.forms.set(formId, next);
  return toPublishedView(next);
}

export function startSession(formId: string, respondentId?: string, tenantId?: string): NextStepResponse {
  const store = getStore();
  const form = store.forms.get(formId);
  if (!form) throw publicError('NOT_FOUND', 'Form was not found.', 404);
  if (tenantId && form.tenant_id !== tenantId) throw publicError('NOT_FOUND', 'Form was not found.', 404);
  if (form.status !== 'published' || !form.current_version_id) {
    throw publicError('FORM_NOT_PUBLISHED', 'Form is not published yet.', 409);
  }
  const version = getVersion(form.current_version_id);
  const sessionId = createId('sess');
  const session: SessionRecord = {
    id: sessionId,
    tenant_id: form.tenant_id,
    form_id: formId,
    form_version_id: version.id,
    status: 'awaiting_answer',
    respondent_id: respondentId,
    answers: [],
    events: [],
    created_at: now(),
    updated_at: now(),
  };
  session.events.push(createEvent(sessionId, 'session_started', { form_id: formId }, { form_version_id: version.id }));
  store.sessions.set(sessionId, session);
  return getNextStep(sessionId);
}

export function getSession(sessionId: string): SessionRecord {
  const session = getStore().sessions.get(sessionId);
  if (!session) throw publicError('NOT_FOUND', 'Session was not found.', 404);
  return session;
}

export function getNextStep(sessionId: string): NextStepResponse {
  const session = getSession(sessionId);
  const version = getVersion(session.form_version_id);
  const nextField = version.schema.fields.find((field) => isVisible(field, session.answers) && !hasAnswer(session.answers, field.id));
  const allowed = version.schema.policy.allowed_answer_modes;

  if (!nextField) {
    return {
      session_id: session.id,
      schema_version: '1.0',
      status: session.status,
      step: { type: 'completion', prompt: 'All required steps have been answered.' },
      allowed_answer_types: allowed,
    };
  }

  return {
    session_id: session.id,
    schema_version: '1.0',
    status: session.status,
    step: {
      id: nextField.id,
      type: nextField.type,
      prompt: nextField.label,
      description: nextField.description,
      required: nextField.required,
      options: nextField.options,
      validation: nextField.validation,
    },
    allowed_answer_types: allowed,
    ...(nextField.type === 'video_response' ? { consent: { recording_required: true } } : {}),
  };
}

export function submitAnswer(sessionId: string, input: unknown, source: SessionAnswer['source'] = 'human'): NextStepResponse {
  const data = SubmitAnswerInputSchema.parse(input);
  const store = getStore();
  const session = getSession(sessionId);
  if (session.status !== 'awaiting_answer') {
    throw publicError('SESSION_CONFLICT', 'Session is not awaiting an answer.', 409);
  }

  if (data.idempotency_key) {
    const repeated = session.events.find((event) => event.input?.idempotency_key === data.idempotency_key);
    if (repeated) return getNextStep(sessionId);
  }

  const version = getVersion(session.form_version_id);
  const field = version.schema.fields.find((candidate) => candidate.id === data.field_id);
  if (!field) throw publicError('INVALID_INPUT', 'Unknown field id.', 400, 'field_id');
  if (!isVisible(field, session.answers)) throw publicError('INVALID_INPUT', 'Field is not currently visible.', 400, field.id);

  validateAnswer(field, data.value, session.answers, version.schema.fields);
  attachArtifactAnswerIfNeeded(session, field, data.value);
  const answer = createAnswer(field.id, data.value, source);
  const nextAnswers = [...session.answers.filter((item) => item.field_id !== field.id), answer];
  const nextSession: SessionRecord = {
    ...session,
    answers: nextAnswers,
    updated_at: now(),
    events: [
      ...session.events,
      createEvent(session.id, 'answer_submitted', { field_id: field.id, idempotency_key: data.idempotency_key }, { source }),
    ],
  };

  store.sessions.set(session.id, nextSession);
  return getNextStep(sessionId);
}

export function pauseSession(sessionId: string) {
  return setSessionStatus(sessionId, 'paused', 'session_paused');
}

export function resumeSession(sessionId: string) {
  return setSessionStatus(sessionId, 'awaiting_answer', 'session_resumed');
}

export function completeSession(sessionId: string): SubmissionRecord {
  const store = getStore();
  const session = getSession(sessionId);
  const version = getVersion(session.form_version_id);
  const missingRequired = version.schema.fields.filter((field) => {
    return field.required && isVisible(field, session.answers) && !hasAnswer(session.answers, field.id);
  });

  if (missingRequired.length > 0) {
    throw new AgenticFormError({
      code: 'INVALID_INPUT',
      message: 'Required answers are missing.',
      details: { fields: missingRequired.map((field) => field.id) },
    }, 400);
  }

  const timestamp = now();
  const nextSession: SessionRecord = {
    ...session,
    status: 'completed',
    updated_at: timestamp,
    completed_at: timestamp,
    events: [...session.events, createEvent(session.id, 'session_completed')],
  };
  const existing = [...store.submissions.values()].find((submission) => submission.session_id === sessionId);
  if (existing) return existing;

  const submission: SubmissionRecord = {
    id: createId('sub'),
    tenant_id: session.tenant_id,
    session_id: sessionId,
    form_id: session.form_id,
    form_version_id: session.form_version_id,
    answers: nextSession.answers,
    created_at: timestamp,
  };

  store.sessions.set(sessionId, nextSession);
  store.submissions.set(submission.id, submission);
  return submission;
}

export function getSubmission(submissionId: string): SubmissionRecord {
  const submission = getStore().submissions.get(submissionId);
  if (!submission) throw publicError('NOT_FOUND', 'Submission was not found.', 404);
  return submission;
}

function setSessionStatus(sessionId: string, status: SessionRecord['status'], eventType: SessionRecord['events'][number]['type']) {
  const store = getStore();
  const session = getSession(sessionId);
  if (session.status === 'completed') {
    throw publicError('SESSION_CONFLICT', 'Session is already completed.', 409);
  }
  const next: SessionRecord = {
    ...session,
    status,
    updated_at: now(),
    events: [...session.events, createEvent(session.id, eventType)],
  };
  store.sessions.set(session.id, next);
  return getNextStep(sessionId);
}

function getVersion(versionId: string): FormVersionRecord {
  const version = getStore().versions.get(versionId);
  if (!version) throw publicError('NOT_FOUND', 'Form version was not found.', 404);
  return version;
}

function toPublishedView(form: FormRecord): PublishedFormView {
  const currentVersion = form.current_version_id ? getStore().versions.get(form.current_version_id) ?? null : null;
  return {
    id: form.id,
    tenant_id: form.tenant_id,
    status: form.status,
    current_version: currentVersion,
    draft: form.draft,
    policy: form.draft.policy,
  };
}

function hasAnswer(answers: SessionAnswer[], fieldId: string) {
  return answers.some((answer) => answer.field_id === fieldId);
}

function isVisible(field: FormField, answers: SessionAnswer[]) {
  if (!field.visible_if) return true;
  const prior = answers.find((answer) => answer.field_id === field.visible_if?.field_id);
  if (!prior) return false;
  const expected = field.visible_if.value;
  const actual = prior.value;
  if (field.visible_if.operator === 'equals') return actual === expected;
  if (field.visible_if.operator === 'not_equals') return actual !== expected;
  return Array.isArray(actual) && actual.includes(String(expected));
}

function validateAnswer(field: FormField, value: AnswerValue, answers: SessionAnswer[], fields: FormField[]) {
  if (field.required && (value === '' || value === false || (Array.isArray(value) && value.length === 0))) {
    throw publicError('INVALID_INPUT', 'This field is required.', 400, field.id);
  }
  if (field.type === 'email') {
    z.string().email().parse(value);
  }
  if ((field.type === 'short_text' || field.type === 'long_text') && typeof value === 'string') {
    if (field.validation.min_length && value.length < field.validation.min_length) {
      throw publicError('INVALID_INPUT', `Must be at least ${field.validation.min_length} characters.`, 400, field.id);
    }
    if (field.validation.max_length && value.length > field.validation.max_length) {
      throw publicError('INVALID_INPUT', `Must be no more than ${field.validation.max_length} characters.`, 400, field.id);
    }
  }
  if (field.type === 'number') {
    if (typeof value !== 'number') {
      throw publicError('INVALID_INPUT', 'Expected a number.', 400, field.id);
    }
    if (field.validation.min !== undefined && value < field.validation.min) {
      throw publicError('INVALID_INPUT', `Must be at least ${field.validation.min}.`, 400, field.id);
    }
    if (field.validation.max !== undefined && value > field.validation.max) {
      throw publicError('INVALID_INPUT', `Must be no more than ${field.validation.max}.`, 400, field.id);
    }
  }
  if (field.type === 'rating') {
    if (typeof value !== 'number') {
      throw publicError('INVALID_INPUT', 'Expected a number.', 400, field.id);
    }
    if (field.validation.min !== undefined && value < field.validation.min) {
      throw publicError('INVALID_INPUT', `Must be at least ${field.validation.min}.`, 400, field.id);
    }
    if (field.validation.max !== undefined && value > field.validation.max) {
      throw publicError('INVALID_INPUT', `Must be no more than ${field.validation.max}.`, 400, field.id);
    }
  }
  if (field.type === 'single_select') validateChoice(field, value);
  if (field.type === 'multi_select') validateMultiChoice(field, value);
  if (field.type === 'consent' && value !== true) {
    throw publicError('CONSENT_REQUIRED', 'Consent is required for this step.', 400, field.id);
  }
  if (field.type === 'video_response') {
    const consentFieldId = field.visible_if?.field_id;
    const consentField = consentFieldId ? fields.find((candidate) => candidate.id === consentFieldId) : undefined;
    const consentGiven =
      consentField?.type === 'consent' &&
      answers.some((answer) => answer.field_id === consentFieldId && answer.value === true);
    if (!consentGiven) throw publicError('CONSENT_REQUIRED', 'Recording consent is required before video submission.', 400, field.id);
  }
}

function attachArtifactAnswerIfNeeded(session: SessionRecord, field: FormField, value: AnswerValue) {
  if (field.type !== 'file_upload' && field.type !== 'video_response') return;
  if (!isArtifactValue(value)) {
    throw publicError('INVALID_INPUT', 'Expected an uploaded artifact reference.', 400, field.id);
  }
  const artifact = getArtifact(value.artifact_id);
  if (artifact.session_id !== session.id || artifact.field_id !== field.id) {
    throw publicError('FORBIDDEN', 'Artifact does not belong to this session field.', 403, field.id);
  }
  if (field.validation.max_file_mb && artifact.size_bytes > field.validation.max_file_mb * 1024 * 1024) {
    throw publicError('INVALID_INPUT', `File exceeds ${field.validation.max_file_mb} MB.`, 400, field.id);
  }
  if (field.validation.max_duration_seconds && artifact.duration_seconds && artifact.duration_seconds > field.validation.max_duration_seconds) {
    throw publicError('INVALID_INPUT', `Video exceeds ${field.validation.max_duration_seconds} seconds.`, 400, field.id);
  }
  markArtifactAttached(artifact.id);
}

function isArtifactValue(value: AnswerValue): value is Extract<AnswerValue, { artifact_id: string }> {
  return typeof value === 'object' && value !== null && !Array.isArray(value) && 'artifact_id' in value;
}

function validateChoice(field: FormField, value: AnswerValue) {
  if (typeof value !== 'string') throw publicError('INVALID_INPUT', 'Expected one selected option.', 400, field.id);
  const allowed = field.options?.some((option) => option.value === value) ?? false;
  if (!allowed) throw publicError('INVALID_INPUT', 'Selected option is not allowed.', 400, field.id);
}

function validateMultiChoice(field: FormField, value: AnswerValue) {
  if (!Array.isArray(value)) throw publicError('INVALID_INPUT', 'Expected selected options.', 400, field.id);
  const allowed = new Set(field.options?.map((option) => option.value) ?? []);
  const invalid = value.find((item) => !allowed.has(item));
  if (invalid) throw publicError('INVALID_INPUT', 'One or more selected options are not allowed.', 400, field.id);
}
