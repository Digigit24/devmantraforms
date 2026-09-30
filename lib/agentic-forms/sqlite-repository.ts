import Database from 'better-sqlite3';
import type { AgenticFormsRepository } from './repository';
import type {
  ArtifactRecord,
  FormRecord,
  FormVersionRecord,
  SessionAnswer,
  SessionEvent,
  SessionRecord,
  SubmissionRecord,
  TenantApiKeyRecord,
  TenantRecord,
} from './types';
import type { FormSchemaDefinition } from './schema';

// Tables are created in dependency order so foreign keys resolve. forms.current_version_id
// intentionally has no FK constraint: it points at a form_versions row created *after* the
// form itself (on first publish), which would otherwise require a circular/deferred
// constraint. The relationship is still enforced at the application level, exactly as it
// is today for the in-memory store.
const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  plan TEXT NOT NULL,
  mcp_endpoint TEXT NOT NULL,
  api_key_hint TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS forms (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  owner_id TEXT NOT NULL,
  status TEXT NOT NULL,
  draft TEXT NOT NULL,
  current_version_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_forms_tenant_id ON forms(tenant_id);

CREATE TABLE IF NOT EXISTS form_versions (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  form_id TEXT NOT NULL REFERENCES forms(id),
  version INTEGER NOT NULL,
  schema_version TEXT NOT NULL,
  schema TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(form_id, version)
);
CREATE INDEX IF NOT EXISTS idx_form_versions_form_id ON form_versions(form_id);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  form_id TEXT NOT NULL REFERENCES forms(id),
  form_version_id TEXT NOT NULL REFERENCES form_versions(id),
  status TEXT NOT NULL,
  respondent_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  completed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_sessions_tenant_id ON sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sessions_form_id ON sessions(form_id);

CREATE TABLE IF NOT EXISTS session_answers (
  session_id TEXT NOT NULL REFERENCES sessions(id),
  field_id TEXT NOT NULL,
  value TEXT NOT NULL,
  source TEXT NOT NULL,
  answered_at TEXT NOT NULL,
  PRIMARY KEY (session_id, field_id)
);

CREATE TABLE IF NOT EXISTS session_events (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id),
  type TEXT NOT NULL,
  schema_version TEXT NOT NULL,
  input TEXT,
  result TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_session_events_session_id ON session_events(session_id);

CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  session_id TEXT NOT NULL UNIQUE REFERENCES sessions(id),
  form_id TEXT NOT NULL REFERENCES forms(id),
  form_version_id TEXT NOT NULL REFERENCES form_versions(id),
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_submissions_form_id ON submissions(form_id);

CREATE TABLE IF NOT EXISTS artifacts (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  session_id TEXT NOT NULL REFERENCES sessions(id),
  field_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  duration_seconds INTEGER,
  bucket TEXT NOT NULL,
  key TEXT NOT NULL,
  url TEXT,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_artifacts_session_id ON artifacts(session_id);
CREATE INDEX IF NOT EXISTS idx_artifacts_tenant_id ON artifacts(tenant_id);

CREATE TABLE IF NOT EXISTS tenant_api_keys (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  key_prefix TEXT NOT NULL,
  key_hint TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  revoked_at TEXT,
  last_used_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_tenant_api_keys_tenant_id ON tenant_api_keys(tenant_id);
`;

export interface SqliteRepositoryHandle extends AgenticFormsRepository {
  close(): void;
}

export interface CreateSqliteRepositoryOptions {
  /** Idempotently insert the demo tenant/form (INSERT OR IGNORE — never overwrites existing rows). */
  seed?: boolean;
}

export function createSqliteRepository(
  databasePath: string,
  options: CreateSqliteRepositoryOptions = {},
): SqliteRepositoryHandle {
  const db = new Database(databasePath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(SCHEMA_SQL);

  if (options.seed) {
    seedDemoTenantAndForm(db);
  }

  const stmt = {
    getTenantBySlug: db.prepare('SELECT * FROM tenants WHERE slug = ?'),
    getTenantById: db.prepare('SELECT * FROM tenants WHERE id = ?'),
    listTenants: db.prepare('SELECT * FROM tenants'),
    upsertTenant: db.prepare(`
      INSERT INTO tenants (id, slug, name, plan, mcp_endpoint, api_key_hint, created_at)
      VALUES (@id, @slug, @name, @plan, @mcp_endpoint, @api_key_hint, @created_at)
      ON CONFLICT(id) DO UPDATE SET
        slug = excluded.slug,
        name = excluded.name,
        plan = excluded.plan,
        mcp_endpoint = excluded.mcp_endpoint,
        api_key_hint = excluded.api_key_hint
    `),

    getForm: db.prepare('SELECT * FROM forms WHERE id = ?'),
    getFormForTenant: db.prepare('SELECT * FROM forms WHERE id = ? AND tenant_id = ?'),
    listFormsByTenant: db.prepare('SELECT * FROM forms WHERE tenant_id = ?'),
    upsertForm: db.prepare(`
      INSERT INTO forms (id, tenant_id, owner_id, status, draft, current_version_id, created_at, updated_at)
      VALUES (@id, @tenant_id, @owner_id, @status, @draft, @current_version_id, @created_at, @updated_at)
      ON CONFLICT(id) DO UPDATE SET
        tenant_id = excluded.tenant_id,
        owner_id = excluded.owner_id,
        status = excluded.status,
        draft = excluded.draft,
        current_version_id = excluded.current_version_id,
        updated_at = excluded.updated_at
    `),

    getVersion: db.prepare('SELECT * FROM form_versions WHERE id = ?'),
    listVersionsByForm: db.prepare('SELECT * FROM form_versions WHERE form_id = ?'),
    upsertVersion: db.prepare(`
      INSERT INTO form_versions (id, tenant_id, form_id, version, schema_version, schema, created_at)
      VALUES (@id, @tenant_id, @form_id, @version, @schema_version, @schema, @created_at)
      ON CONFLICT(id) DO UPDATE SET
        version = excluded.version,
        schema_version = excluded.schema_version,
        schema = excluded.schema,
        created_at = excluded.created_at
    `),

    getSession: db.prepare('SELECT * FROM sessions WHERE id = ?'),
    getSessionForTenant: db.prepare('SELECT * FROM sessions WHERE id = ? AND tenant_id = ?'),
    upsertSession: db.prepare(`
      INSERT INTO sessions (id, tenant_id, form_id, form_version_id, status, respondent_id, created_at, updated_at, completed_at)
      VALUES (@id, @tenant_id, @form_id, @form_version_id, @status, @respondent_id, @created_at, @updated_at, @completed_at)
      ON CONFLICT(id) DO UPDATE SET
        status = excluded.status,
        respondent_id = excluded.respondent_id,
        updated_at = excluded.updated_at,
        completed_at = excluded.completed_at
    `),

    listAnswers: db.prepare('SELECT field_id, value, source, answered_at FROM session_answers WHERE session_id = ?'),
    deleteAnswers: db.prepare('DELETE FROM session_answers WHERE session_id = ?'),
    insertAnswer: db.prepare(`
      INSERT INTO session_answers (session_id, field_id, value, source, answered_at)
      VALUES (@session_id, @field_id, @value, @source, @answered_at)
    `),

    listEvents: db.prepare('SELECT id, session_id, type, schema_version, input, result, created_at FROM session_events WHERE session_id = ? ORDER BY rowid ASC'),
    deleteEvents: db.prepare('DELETE FROM session_events WHERE session_id = ?'),
    insertEvent: db.prepare(`
      INSERT INTO session_events (id, session_id, type, schema_version, input, result, created_at)
      VALUES (@id, @session_id, @type, @schema_version, @input, @result, @created_at)
    `),

    getSubmission: db.prepare('SELECT * FROM submissions WHERE id = ?'),
    getSubmissionForTenant: db.prepare('SELECT * FROM submissions WHERE id = ? AND tenant_id = ?'),
    findSubmissionBySession: db.prepare('SELECT * FROM submissions WHERE session_id = ?'),
    listSubmissionsByForm: db.prepare('SELECT * FROM submissions WHERE form_id = ? AND tenant_id = ? ORDER BY created_at ASC'),
    insertSubmission: db.prepare(`
      INSERT INTO submissions (id, tenant_id, session_id, form_id, form_version_id, created_at)
      VALUES (@id, @tenant_id, @session_id, @form_id, @form_version_id, @created_at)
      ON CONFLICT(session_id) DO NOTHING
    `),

    getArtifact: db.prepare('SELECT * FROM artifacts WHERE id = ?'),
    getArtifactForTenant: db.prepare('SELECT * FROM artifacts WHERE id = ? AND tenant_id = ?'),
    upsertArtifact: db.prepare(`
      INSERT INTO artifacts (id, tenant_id, session_id, field_id, filename, content_type, size_bytes, duration_seconds, bucket, key, url, status, created_at)
      VALUES (@id, @tenant_id, @session_id, @field_id, @filename, @content_type, @size_bytes, @duration_seconds, @bucket, @key, @url, @status, @created_at)
      ON CONFLICT(id) DO UPDATE SET
        filename = excluded.filename,
        content_type = excluded.content_type,
        size_bytes = excluded.size_bytes,
        duration_seconds = excluded.duration_seconds,
        bucket = excluded.bucket,
        key = excluded.key,
        url = excluded.url,
        status = excluded.status
    `),

    insertApiKey: db.prepare(`
      INSERT INTO tenant_api_keys (id, tenant_id, key_prefix, key_hint, key_hash, created_at, revoked_at, last_used_at)
      VALUES (@id, @tenant_id, @key_prefix, @key_hint, @key_hash, @created_at, @revoked_at, @last_used_at)
    `),
    findActiveApiKeyByHash: db.prepare('SELECT * FROM tenant_api_keys WHERE key_hash = ? AND revoked_at IS NULL'),
    listApiKeysByTenant: db.prepare('SELECT * FROM tenant_api_keys WHERE tenant_id = ? ORDER BY created_at ASC'),
    revokeApiKey: db.prepare('UPDATE tenant_api_keys SET revoked_at = @revoked_at WHERE id = @id AND revoked_at IS NULL'),
    touchApiKeyLastUsed: db.prepare('UPDATE tenant_api_keys SET last_used_at = @last_used_at WHERE id = @id'),
  };

  function rowToTenant(row: Record<string, unknown>): TenantRecord {
    return {
      id: row.id as string,
      slug: row.slug as string,
      name: row.name as string,
      plan: row.plan as TenantRecord['plan'],
      mcp_endpoint: row.mcp_endpoint as string,
      api_key_hint: row.api_key_hint as string,
      created_at: row.created_at as string,
    };
  }

  function rowToApiKey(row: Record<string, unknown>): TenantApiKeyRecord {
    return {
      id: row.id as string,
      tenant_id: row.tenant_id as string,
      key_prefix: row.key_prefix as string,
      key_hint: row.key_hint as string,
      key_hash: row.key_hash as string,
      created_at: row.created_at as string,
      revoked_at: (row.revoked_at as string | null) ?? undefined,
      last_used_at: (row.last_used_at as string | null) ?? undefined,
    };
  }

  function rowToForm(row: Record<string, unknown>): FormRecord {
    return {
      id: row.id as string,
      tenant_id: row.tenant_id as string,
      owner_id: row.owner_id as string,
      status: row.status as FormRecord['status'],
      draft: JSON.parse(row.draft as string) as FormSchemaDefinition,
      current_version_id: (row.current_version_id as string | null) ?? null,
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
    };
  }

  function rowToVersion(row: Record<string, unknown>): FormVersionRecord {
    return {
      id: row.id as string,
      form_id: row.form_id as string,
      version: row.version as number,
      schema_version: row.schema_version as '1.0',
      schema: JSON.parse(row.schema as string) as FormSchemaDefinition,
      created_at: row.created_at as string,
    };
  }

  function loadAnswers(sessionId: string): SessionAnswer[] {
    return (stmt.listAnswers.all(sessionId) as Record<string, unknown>[]).map((row) => ({
      field_id: row.field_id as string,
      value: JSON.parse(row.value as string) as SessionAnswer['value'],
      source: row.source as SessionAnswer['source'],
      answered_at: row.answered_at as string,
    }));
  }

  function loadEvents(sessionId: string): SessionEvent[] {
    return (stmt.listEvents.all(sessionId) as Record<string, unknown>[]).map((row) => ({
      id: row.id as string,
      session_id: row.session_id as string,
      type: row.type as SessionEvent['type'],
      schema_version: row.schema_version as '1.0',
      input: row.input ? (JSON.parse(row.input as string) as Record<string, unknown>) : undefined,
      result: row.result ? (JSON.parse(row.result as string) as Record<string, unknown>) : undefined,
      created_at: row.created_at as string,
    }));
  }

  function rowToSession(row: Record<string, unknown>): SessionRecord {
    const id = row.id as string;
    return {
      id,
      tenant_id: row.tenant_id as string,
      form_id: row.form_id as string,
      form_version_id: row.form_version_id as string,
      status: row.status as SessionRecord['status'],
      respondent_id: (row.respondent_id as string | null) ?? undefined,
      answers: loadAnswers(id),
      events: loadEvents(id),
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
      completed_at: (row.completed_at as string | null) ?? undefined,
    };
  }

  function rowToSubmission(row: Record<string, unknown>): SubmissionRecord {
    const sessionId = row.session_id as string;
    return {
      id: row.id as string,
      tenant_id: row.tenant_id as string,
      session_id: sessionId,
      form_id: row.form_id as string,
      form_version_id: row.form_version_id as string,
      answers: loadAnswers(sessionId),
      created_at: row.created_at as string,
    };
  }

  function rowToArtifact(row: Record<string, unknown>): ArtifactRecord {
    return {
      id: row.id as string,
      tenant_id: row.tenant_id as string,
      session_id: row.session_id as string,
      field_id: row.field_id as string,
      filename: row.filename as string,
      content_type: row.content_type as string,
      size_bytes: row.size_bytes as number,
      duration_seconds: (row.duration_seconds as number | null) ?? undefined,
      bucket: row.bucket as string,
      key: row.key as string,
      url: (row.url as string | null) ?? undefined,
      status: row.status as ArtifactRecord['status'],
      created_at: row.created_at as string,
    };
  }

  // Fully replaces a session's answers/events to match the arrays on the given record —
  // the same "whole object is the source of truth" semantics Map.set(session.id, session)
  // has today. Wrapped in a transaction so the sessions row and its child rows never
  // diverge if an error occurs partway through.
  function saveSession(session: SessionRecord): void {
    db.exec('BEGIN');
    try {
      stmt.upsertSession.run({
        id: session.id,
        tenant_id: session.tenant_id,
        form_id: session.form_id,
        form_version_id: session.form_version_id,
        status: session.status,
        respondent_id: session.respondent_id ?? null,
        created_at: session.created_at,
        updated_at: session.updated_at,
        completed_at: session.completed_at ?? null,
      });

      stmt.deleteAnswers.run(session.id);
      for (const answer of session.answers) {
        stmt.insertAnswer.run({
          session_id: session.id,
          field_id: answer.field_id,
          value: JSON.stringify(answer.value),
          source: answer.source,
          answered_at: answer.answered_at,
        });
      }

      stmt.deleteEvents.run(session.id);
      for (const event of session.events) {
        stmt.insertEvent.run({
          id: event.id,
          session_id: session.id,
          type: event.type,
          schema_version: event.schema_version,
          input: event.input ? JSON.stringify(event.input) : null,
          result: event.result ? JSON.stringify(event.result) : null,
          created_at: event.created_at,
        });
      }

      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  }

  const repository: SqliteRepositoryHandle = {
    listTenants: () => (stmt.listTenants.all() as Record<string, unknown>[]).map(rowToTenant),
    getTenantBySlug: (slug) => {
      const row = stmt.getTenantBySlug.get(slug) as Record<string, unknown> | undefined;
      return row ? rowToTenant(row) : undefined;
    },
    getTenantById: (tenantId) => {
      const row = stmt.getTenantById.get(tenantId) as Record<string, unknown> | undefined;
      return row ? rowToTenant(row) : undefined;
    },
    saveTenant: (tenant) => {
      stmt.upsertTenant.run({
        id: tenant.id,
        slug: tenant.slug,
        name: tenant.name,
        plan: tenant.plan,
        mcp_endpoint: tenant.mcp_endpoint,
        api_key_hint: tenant.api_key_hint,
        created_at: tenant.created_at,
      });
    },

    listFormsByTenant: (tenantId) =>
      (stmt.listFormsByTenant.all(tenantId) as Record<string, unknown>[]).map(rowToForm),
    getForm: (formId) => {
      const row = stmt.getForm.get(formId) as Record<string, unknown> | undefined;
      return row ? rowToForm(row) : undefined;
    },
    getFormForTenant: (formId, tenantId) => {
      const row = stmt.getFormForTenant.get(formId, tenantId) as Record<string, unknown> | undefined;
      return row ? rowToForm(row) : undefined;
    },
    saveForm: (form) => {
      stmt.upsertForm.run({
        id: form.id,
        tenant_id: form.tenant_id,
        owner_id: form.owner_id,
        status: form.status,
        draft: JSON.stringify(form.draft),
        current_version_id: form.current_version_id,
        created_at: form.created_at,
        updated_at: form.updated_at,
      });
    },

    listVersionsByForm: (formId) =>
      (stmt.listVersionsByForm.all(formId) as Record<string, unknown>[]).map(rowToVersion),
    getVersion: (versionId) => {
      const row = stmt.getVersion.get(versionId) as Record<string, unknown> | undefined;
      return row ? rowToVersion(row) : undefined;
    },
    saveVersion: (version) => {
      // A version's tenant_id isn't part of FormVersionRecord; look it up via its form
      // so form_versions.tenant_id (kept for safe tenant-scoped queries) stays correct.
      const form = stmt.getForm.get(version.form_id) as Record<string, unknown> | undefined;
      stmt.upsertVersion.run({
        id: version.id,
        tenant_id: (form?.tenant_id as string | undefined) ?? '',
        form_id: version.form_id,
        version: version.version,
        schema_version: version.schema_version,
        schema: JSON.stringify(version.schema),
        created_at: version.created_at,
      });
    },

    getSession: (sessionId) => {
      const row = stmt.getSession.get(sessionId) as Record<string, unknown> | undefined;
      return row ? rowToSession(row) : undefined;
    },
    getSessionForTenant: (sessionId, tenantId) => {
      const row = stmt.getSessionForTenant.get(sessionId, tenantId) as Record<string, unknown> | undefined;
      return row ? rowToSession(row) : undefined;
    },
    saveSession,

    getSubmission: (submissionId) => {
      const row = stmt.getSubmission.get(submissionId) as Record<string, unknown> | undefined;
      return row ? rowToSubmission(row) : undefined;
    },
    getSubmissionForTenant: (submissionId, tenantId) => {
      const row = stmt.getSubmissionForTenant.get(submissionId, tenantId) as Record<string, unknown> | undefined;
      return row ? rowToSubmission(row) : undefined;
    },
    findSubmissionBySession: (sessionId) => {
      const row = stmt.findSubmissionBySession.get(sessionId) as Record<string, unknown> | undefined;
      return row ? rowToSubmission(row) : undefined;
    },
    listSubmissionsByForm: (formId, tenantId) =>
      (stmt.listSubmissionsByForm.all(formId, tenantId) as Record<string, unknown>[]).map(rowToSubmission),
    saveSubmission: (submission) => {
      stmt.insertSubmission.run({
        id: submission.id,
        tenant_id: submission.tenant_id,
        session_id: submission.session_id,
        form_id: submission.form_id,
        form_version_id: submission.form_version_id,
        created_at: submission.created_at,
      });
    },

    getArtifact: (artifactId) => {
      const row = stmt.getArtifact.get(artifactId) as Record<string, unknown> | undefined;
      return row ? rowToArtifact(row) : undefined;
    },
    getArtifactForTenant: (artifactId, tenantId) => {
      const row = stmt.getArtifactForTenant.get(artifactId, tenantId) as Record<string, unknown> | undefined;
      return row ? rowToArtifact(row) : undefined;
    },
    saveArtifact: (artifact) => {
      stmt.upsertArtifact.run({
        id: artifact.id,
        tenant_id: artifact.tenant_id,
        session_id: artifact.session_id,
        field_id: artifact.field_id,
        filename: artifact.filename,
        content_type: artifact.content_type,
        size_bytes: artifact.size_bytes,
        duration_seconds: artifact.duration_seconds ?? null,
        bucket: artifact.bucket,
        key: artifact.key,
        url: artifact.url ?? null,
        status: artifact.status,
        created_at: artifact.created_at,
      });
    },

    saveApiKey: (apiKey) => {
      stmt.insertApiKey.run({
        id: apiKey.id,
        tenant_id: apiKey.tenant_id,
        key_prefix: apiKey.key_prefix,
        key_hint: apiKey.key_hint,
        key_hash: apiKey.key_hash,
        created_at: apiKey.created_at,
        revoked_at: apiKey.revoked_at ?? null,
        last_used_at: apiKey.last_used_at ?? null,
      });
    },
    findActiveApiKeyByHash: (keyHash) => {
      const row = stmt.findActiveApiKeyByHash.get(keyHash) as Record<string, unknown> | undefined;
      return row ? rowToApiKey(row) : undefined;
    },
    listApiKeysByTenant: (tenantId) =>
      (stmt.listApiKeysByTenant.all(tenantId) as Record<string, unknown>[]).map(rowToApiKey),
    revokeApiKey: (apiKeyId) => {
      stmt.revokeApiKey.run({ id: apiKeyId, revoked_at: new Date().toISOString() });
    },
    touchApiKeyLastUsed: (apiKeyId, timestamp) => {
      stmt.touchApiKeyLastUsed.run({ id: apiKeyId, last_used_at: timestamp });
    },

    close: () => db.close(),
  };

  return repository;
}

// Idempotent: INSERT OR IGNORE keys on each row's primary key, so an existing demo
// tenant/form/version — including one an admin has since edited — is never overwritten.
function seedDemoTenantAndForm(db: Database.Database): void {
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

  const createdAt = new Date().toISOString();
  const tenantId = 'tenant_demo';
  const formId = 'sample-hiring';
  const versionId = 'fv_sample_hiring_1';

  db.prepare(`
    INSERT OR IGNORE INTO tenants (id, slug, name, plan, mcp_endpoint, api_key_hint, created_at)
    VALUES (@id, @slug, @name, @plan, @mcp_endpoint, @api_key_hint, @created_at)
  `).run({
    id: tenantId,
    slug: 'demo',
    name: 'Demo Workspace',
    plan: 'local',
    mcp_endpoint: '/api/mcp/demo',
    api_key_hint: 'cf_demo_...',
    created_at: createdAt,
  });

  db.prepare(`
    INSERT OR IGNORE INTO forms (id, tenant_id, owner_id, status, draft, current_version_id, created_at, updated_at)
    VALUES (@id, @tenant_id, @owner_id, @status, @draft, @current_version_id, @created_at, @updated_at)
  `).run({
    id: formId,
    tenant_id: tenantId,
    owner_id: 'local-owner',
    status: 'published',
    draft: JSON.stringify(sampleHiringForm),
    current_version_id: versionId,
    created_at: createdAt,
    updated_at: createdAt,
  });

  db.prepare(`
    INSERT OR IGNORE INTO form_versions (id, tenant_id, form_id, version, schema_version, schema, created_at)
    VALUES (@id, @tenant_id, @form_id, @version, @schema_version, @schema, @created_at)
  `).run({
    id: versionId,
    tenant_id: tenantId,
    form_id: formId,
    version: 1,
    schema_version: '1.0',
    schema: JSON.stringify(sampleHiringForm),
    created_at: createdAt,
  });
}
