import { randomUUID } from 'crypto';
import type {
  FormRecord,
  FormVersionRecord,
  ArtifactRecord,
  SessionAnswer,
  SessionRecord,
  SubmissionRecord,
  TenantRecord,
} from './types';
import type { FormSchemaDefinition } from './schema';
import type { AgenticFormsRepository } from './repository';

interface StoreState {
  forms: Map<string, FormRecord>;
  tenants: Map<string, TenantRecord>;
  versions: Map<string, FormVersionRecord>;
  sessions: Map<string, SessionRecord>;
  submissions: Map<string, SubmissionRecord>;
  artifacts: Map<string, ArtifactRecord>;
}

declare global {
  // eslint-disable-next-line no-var
  var __agenticFormsStore: StoreState | undefined;
}

const sampleHiringForm: FormSchemaDefinition = {
  title: 'Frontend Engineer Async Interview',
  description: 'A lightweight async interview with text, portfolio, consent, and video response.',
  fields: [
    {
      id: 'candidate_name',
      type: 'short_text',
      label: 'What is your full name?',
      required: true,
      validation: { min_length: 2, max_length: 100 },
    },
    {
      id: 'email',
      type: 'email',
      label: 'What email should we use for follow-up?',
      required: true,
      validation: {},
    },
    {
      id: 'portfolio',
      type: 'file_upload',
      label: 'Upload your resume or portfolio.',
      description: 'PDF, DOC, or a portfolio export. Link support will come next.',
      required: false,
      validation: { max_files: 1, max_file_mb: 20 },
    },
    {
      id: 'work_sample',
      type: 'long_text',
      label: 'Tell us about a product UI you made better.',
      description: 'Focus on your role, constraints, tradeoffs, and result.',
      required: true,
      validation: { min_length: 40, max_length: 1200 },
    },
    {
      id: 'recording_consent',
      type: 'consent',
      label: 'I consent to submitting a recorded video response for this interview.',
      required: true,
      validation: {},
    },
    {
      id: 'intro_video',
      type: 'video_response',
      label: 'Record or upload a 2 minute intro video.',
      description: 'Answer: why this role, what you are strongest at, and one area you are improving.',
      required: true,
      validation: { max_duration_seconds: 120, max_file_mb: 100 },
      visible_if: { field_id: 'recording_consent', operator: 'equals', value: true },
    },
  ],
  policy: {
    agent_can_ask_followups: false,
    requires_human_review: true,
    allowed_answer_modes: ['text', 'file', 'video'],
    prohibited_inferences: [
      'facial appearance',
      'emotion',
      'accent',
      'protected traits',
      'non-job-related signals',
    ],
  },
};

function now() {
  return new Date().toISOString();
}

function createSeedStore(): StoreState {
  const forms = new Map<string, FormRecord>();
  const tenants = new Map<string, TenantRecord>();
  const versions = new Map<string, FormVersionRecord>();
  const sessions = new Map<string, SessionRecord>();
  const submissions = new Map<string, SubmissionRecord>();
  const artifacts = new Map<string, ArtifactRecord>();

  const formId = 'sample-hiring';
  const tenantId = 'tenant_demo';
  const versionId = 'fv_sample_hiring_1';
  const createdAt = now();

  tenants.set(tenantId, {
    id: tenantId,
    slug: 'demo',
    name: 'Demo Workspace',
    plan: 'local',
    mcp_endpoint: '/api/mcp/demo',
    api_key_hint: 'cf_demo_...',
    created_at: createdAt,
  });

  forms.set(formId, {
    id: formId,
    tenant_id: tenantId,
    owner_id: 'local-owner',
    status: 'published',
    draft: sampleHiringForm,
    current_version_id: versionId,
    created_at: createdAt,
    updated_at: createdAt,
  });

  versions.set(versionId, {
    id: versionId,
    form_id: formId,
    version: 1,
    schema_version: '1.0',
    schema: sampleHiringForm,
    created_at: createdAt,
  });

  return { tenants, forms, versions, sessions, submissions, artifacts };
}

export function getStore(): StoreState {
  globalThis.__agenticFormsStore ??= createSeedStore();
  return globalThis.__agenticFormsStore;
}

// The only persistence implementation today. Wraps the same singleton StoreState
// getStore() returns, so getRepository() always reflects the current store —
// including after resetStore() clears it between tests — and doesn't cache
// anything across calls.
function createInMemoryRepository(state: StoreState): AgenticFormsRepository {
  return {
    listTenants: () => [...state.tenants.values()],
    getTenantBySlug: (slug) => [...state.tenants.values()].find((tenant) => tenant.slug === slug),

    listFormsByTenant: (tenantId) => [...state.forms.values()].filter((form) => form.tenant_id === tenantId),
    getForm: (formId) => state.forms.get(formId),
    saveForm: (form) => {
      state.forms.set(form.id, form);
    },

    listVersionsByForm: (formId) => [...state.versions.values()].filter((version) => version.form_id === formId),
    getVersion: (versionId) => state.versions.get(versionId),
    saveVersion: (version) => {
      state.versions.set(version.id, version);
    },

    getSession: (sessionId) => state.sessions.get(sessionId),
    saveSession: (session) => {
      state.sessions.set(session.id, session);
    },

    getSubmission: (submissionId) => state.submissions.get(submissionId),
    findSubmissionBySession: (sessionId) =>
      [...state.submissions.values()].find((submission) => submission.session_id === sessionId),
    saveSubmission: (submission) => {
      state.submissions.set(submission.id, submission);
    },

    getArtifact: (artifactId) => state.artifacts.get(artifactId),
    saveArtifact: (artifact) => {
      state.artifacts.set(artifact.id, artifact);
    },
  };
}

export function getRepository(): AgenticFormsRepository {
  return createInMemoryRepository(getStore());
}

export function createId(prefix: string) {
  return `${prefix}_${randomUUID().replace(/-/g, '').slice(0, 16)}`;
}

export function getDefaultTenantId() {
  return 'tenant_demo';
}

export function createEvent(sessionId: string, type: SessionRecord['events'][number]['type'], input?: Record<string, unknown>, result?: Record<string, unknown>) {
  return {
    id: createId('evt'),
    session_id: sessionId,
    type,
    schema_version: '1.0' as const,
    input,
    result,
    created_at: now(),
  };
}

export function createAnswer(fieldId: string, value: SessionAnswer['value'], source: SessionAnswer['source']): SessionAnswer {
  return {
    field_id: fieldId,
    value,
    source,
    answered_at: now(),
  };
}

export { now };
