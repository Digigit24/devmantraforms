import Database from 'better-sqlite3';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createSqliteRepository, type SqliteRepositoryHandle } from '@/lib/agentic-forms/sqlite-repository';
import type {
  ArtifactRecord,
  FormRecord,
  FormVersionRecord,
  SessionRecord,
  SubmissionRecord,
} from '@/lib/agentic-forms/types';
import type { FormSchemaDefinition } from '@/lib/agentic-forms/schema';

// Every test gets its own throwaway database file under a temp directory — never the
// production path, and never shared between tests, so nothing here can collide with or
// depend on CELIYO_DATABASE_PATH.
let tempDir: string;
let dbPath: string;
let repo: SqliteRepositoryHandle;

// AgenticFormsRepository intentionally has no tenant-write method — no real flow creates
// tenants today (Phase 1's interface was derived strictly from current usage, and tenant
// creation is Phase 3 work). Forms/sessions/etc. correctly enforce a foreign key against
// tenants(id), so fixtures need a real tenant row to reference. This opens a second raw
// connection to the same test file (schema already created by createSqliteRepository in
// beforeEach) purely to seed that row — it never touches the production module's public
// surface.
function insertTenant(id: string, slug: string) {
  const raw = new Database(dbPath);
  raw.prepare(`
    INSERT OR IGNORE INTO tenants (id, slug, name, plan, mcp_endpoint, api_key_hint, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, slug, slug, 'local', `/api/mcp/${slug}`, 'cf_test_...', '2026-01-01T00:00:00.000Z');
  raw.close();
}

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'celiyo-sqlite-test-'));
  dbPath = join(tempDir, 'test.sqlite');
  repo = createSqliteRepository(dbPath);
  insertTenant('tenant_1', 'acme');
});

afterEach(() => {
  repo.close();
  rmSync(tempDir, { recursive: true, force: true });
});

const sampleSchema: FormSchemaDefinition = {
  title: 'Test Form',
  fields: [{ id: 'name', type: 'short_text', label: 'Name', required: true, validation: {} }],
  policy: {
    agent_can_ask_followups: false,
    requires_human_review: false,
    allowed_answer_modes: ['text'],
    prohibited_inferences: [],
  },
};

function makeForm(overrides: Partial<FormRecord> = {}): FormRecord {
  return {
    id: 'form_1',
    tenant_id: 'tenant_1',
    owner_id: 'owner_1',
    status: 'draft',
    draft: sampleSchema,
    current_version_id: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeVersion(overrides: Partial<FormVersionRecord> = {}): FormVersionRecord {
  return {
    id: 'fv_1',
    form_id: 'form_1',
    version: 1,
    schema_version: '1.0',
    schema: sampleSchema,
    created_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeSession(overrides: Partial<SessionRecord> = {}): SessionRecord {
  return {
    id: 'sess_1',
    tenant_id: 'tenant_1',
    form_id: 'form_1',
    form_version_id: 'fv_1',
    status: 'awaiting_answer',
    answers: [],
    events: [],
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('SQLite repository: tenants', () => {
  // AgenticFormsRepository has no saveTenant/createTenant method — no runtime.ts caller
  // creates tenants today (matching Phase 1's interface, derived strictly from current
  // usage). The only way a tenant row exists is the seed step, so that's what's tested here.
  it('persists and retrieves the seeded tenant by slug', () => {
    repo.close();
    repo = createSqliteRepository(dbPath, { seed: true });

    const tenant = repo.getTenantBySlug('demo');
    expect(tenant).toBeDefined();
    expect(tenant?.id).toBe('tenant_demo');
    expect(tenant?.name).toBe('Demo Workspace');
  });

  it('lists all tenants', () => {
    repo.close();
    repo = createSqliteRepository(dbPath, { seed: true });

    // beforeEach already inserted tenant_1 ("acme") against this same file before
    // seeding ran, so both rows are expected here.
    const slugs = repo.listTenants().map((tenant) => tenant.slug).sort();
    expect(slugs).toEqual(['acme', 'demo']);
  });

  it('returns undefined for an unknown tenant slug', () => {
    expect(repo.getTenantBySlug('nobody')).toBeUndefined();
  });
});

describe('SQLite repository: forms', () => {
  it('persists a form and retrieves it by id', () => {
    const form = makeForm();
    repo.saveForm(form);
    expect(repo.getForm('form_1')).toEqual(form);
  });

  it('returns undefined for a form that does not exist', () => {
    expect(repo.getForm('missing')).toBeUndefined();
  });

  it('updates an existing form in place (upsert, not duplicate)', () => {
    repo.saveForm(makeForm());
    const updated = makeForm({ status: 'published', current_version_id: 'fv_1', updated_at: '2026-01-02T00:00:00.000Z' });
    repo.saveForm(updated);

    expect(repo.getForm('form_1')).toEqual(updated);
    expect(repo.listFormsByTenant('tenant_1')).toHaveLength(1);
  });

  it('filters forms by tenant', () => {
    insertTenant('tenant_2', 'globex');
    repo.saveForm(makeForm({ id: 'form_a', tenant_id: 'tenant_1' }));
    repo.saveForm(makeForm({ id: 'form_b', tenant_id: 'tenant_2' }));
    repo.saveForm(makeForm({ id: 'form_c', tenant_id: 'tenant_1' }));

    const tenant1Forms = repo.listFormsByTenant('tenant_1').map((form) => form.id).sort();
    expect(tenant1Forms).toEqual(['form_a', 'form_c']);
    expect(repo.listFormsByTenant('tenant_2').map((form) => form.id)).toEqual(['form_b']);
    expect(repo.listFormsByTenant('tenant_nobody')).toEqual([]);
  });
});

describe('SQLite repository: form versions', () => {
  it('persists a version and retrieves it by id', () => {
    repo.saveForm(makeForm());
    const version = makeVersion();
    repo.saveVersion(version);
    expect(repo.getVersion('fv_1')).toEqual(version);
  });

  it('lists versions for a form in creation order and supports version-number lookup', () => {
    repo.saveForm(makeForm());
    repo.saveVersion(makeVersion({ id: 'fv_1', version: 1 }));
    repo.saveVersion(makeVersion({ id: 'fv_2', version: 2 }));
    repo.saveVersion(makeVersion({ id: 'fv_3', version: 3 }));

    const versions = repo.listVersionsByForm('form_1');
    expect(versions.map((version) => version.version)).toEqual([1, 2, 3]);
    expect(versions).toHaveLength(3);
  });

  it('returns undefined for a version that does not exist', () => {
    expect(repo.getVersion('missing')).toBeUndefined();
  });
});

describe('SQLite repository: sessions', () => {
  it('persists a session with no answers/events and retrieves it', () => {
    repo.saveForm(makeForm());
    repo.saveVersion(makeVersion());
    const session = makeSession();
    repo.saveSession(session);
    expect(repo.getSession('sess_1')).toEqual(session);
  });

  it('replaces (upserts) an existing answer for the same field rather than duplicating it', () => {
    repo.saveForm(makeForm());
    repo.saveVersion(makeVersion());
    repo.saveSession(makeSession({
      answers: [{ field_id: 'name', value: 'Aarav', source: 'human', answered_at: '2026-01-01T00:00:01.000Z' }],
    }));
    repo.saveSession(makeSession({
      answers: [{ field_id: 'name', value: 'Aarav M.', source: 'human', answered_at: '2026-01-01T00:00:02.000Z' }],
    }));

    const reloaded = repo.getSession('sess_1');
    expect(reloaded?.answers).toHaveLength(1);
    expect(reloaded?.answers[0]?.value).toBe('Aarav M.');
  });

  it('preserves multiple answers across different fields', () => {
    repo.saveForm(makeForm());
    repo.saveVersion(makeVersion());
    repo.saveSession(makeSession({
      answers: [
        { field_id: 'name', value: 'Aarav', source: 'human', answered_at: '2026-01-01T00:00:01.000Z' },
        { field_id: 'color', value: 'blue', source: 'agent', answered_at: '2026-01-01T00:00:02.000Z' },
      ],
    }));

    const reloaded = repo.getSession('sess_1');
    expect(reloaded?.answers.map((answer) => answer.field_id).sort()).toEqual(['color', 'name']);
  });

  it('persists session events and survives a reload, preserving order', () => {
    repo.saveForm(makeForm());
    repo.saveVersion(makeVersion());
    const session = makeSession({
      events: [
        {
          id: 'evt_1',
          session_id: 'sess_1',
          type: 'session_started',
          schema_version: '1.0',
          input: { form_id: 'form_1' },
          result: { form_version_id: 'fv_1' },
          created_at: '2026-01-01T00:00:00.000Z',
        },
        {
          id: 'evt_2',
          session_id: 'sess_1',
          type: 'answer_submitted',
          schema_version: '1.0',
          input: { field_id: 'name', idempotency_key: 'k1' },
          result: { source: 'human' },
          created_at: '2026-01-01T00:00:01.000Z',
        },
      ],
    });
    repo.saveSession(session);

    const reloaded = repo.getSession('sess_1');
    expect(reloaded?.events).toHaveLength(2);
    expect(reloaded?.events.map((event) => event.id)).toEqual(['evt_1', 'evt_2']);
    expect(reloaded?.events[0]?.input).toEqual({ form_id: 'form_1' });
    expect(reloaded?.events[1]?.input?.idempotency_key).toBe('k1');
  });

  it('returns undefined for a session that does not exist', () => {
    expect(repo.getSession('missing')).toBeUndefined();
  });
});

describe('SQLite repository: submissions', () => {
  it('persists a submission and retrieves it by id, with answers hydrated from the session', () => {
    repo.saveForm(makeForm());
    repo.saveVersion(makeVersion());
    repo.saveSession(makeSession({
      status: 'completed',
      answers: [{ field_id: 'name', value: 'Aarav', source: 'human', answered_at: '2026-01-01T00:00:01.000Z' }],
    }));

    const submission: SubmissionRecord = {
      id: 'sub_1',
      tenant_id: 'tenant_1',
      session_id: 'sess_1',
      form_id: 'form_1',
      form_version_id: 'fv_1',
      answers: [{ field_id: 'name', value: 'Aarav', source: 'human', answered_at: '2026-01-01T00:00:01.000Z' }],
      created_at: '2026-01-01T00:00:02.000Z',
    };
    repo.saveSubmission(submission);

    expect(repo.getSubmission('sub_1')).toEqual(submission);
    expect(repo.findSubmissionBySession('sess_1')).toEqual(submission);
  });

  it('enforces one submission per session: a second save for the same session is ignored', () => {
    repo.saveForm(makeForm());
    repo.saveVersion(makeVersion());
    repo.saveSession(makeSession({ status: 'completed' }));

    const first: SubmissionRecord = {
      id: 'sub_1',
      tenant_id: 'tenant_1',
      session_id: 'sess_1',
      form_id: 'form_1',
      form_version_id: 'fv_1',
      answers: [],
      created_at: '2026-01-01T00:00:02.000Z',
    };
    const second: SubmissionRecord = { ...first, id: 'sub_2', created_at: '2026-01-01T00:00:03.000Z' };

    repo.saveSubmission(first);
    repo.saveSubmission(second);

    expect(repo.findSubmissionBySession('sess_1')?.id).toBe('sub_1');
    expect(repo.getSubmission('sub_2')).toBeUndefined();
  });

  it('returns undefined when no submission exists for a session', () => {
    expect(repo.findSubmissionBySession('sess_missing')).toBeUndefined();
  });
});

describe('SQLite repository: artifacts', () => {
  it('persists an artifact and retrieves it by id', () => {
    repo.saveForm(makeForm());
    repo.saveVersion(makeVersion());
    repo.saveSession(makeSession());

    const artifact: ArtifactRecord = {
      id: 'art_1',
      tenant_id: 'tenant_1',
      session_id: 'sess_1',
      field_id: 'portfolio',
      filename: 'cv.pdf',
      content_type: 'application/pdf',
      size_bytes: 1024,
      bucket: 'test-bucket',
      key: 'forms/form_1/sessions/sess_1/portfolio/cv.pdf',
      status: 'upload_pending',
      created_at: '2026-01-01T00:00:00.000Z',
    };
    repo.saveArtifact(artifact);
    expect(repo.getArtifact('art_1')).toEqual(artifact);
  });

  it('updates artifact status in place (e.g. upload_pending -> attached)', () => {
    repo.saveForm(makeForm());
    repo.saveVersion(makeVersion());
    repo.saveSession(makeSession());

    const artifact: ArtifactRecord = {
      id: 'art_1',
      tenant_id: 'tenant_1',
      session_id: 'sess_1',
      field_id: 'portfolio',
      filename: 'cv.pdf',
      content_type: 'application/pdf',
      size_bytes: 1024,
      bucket: 'test-bucket',
      key: 'forms/form_1/sessions/sess_1/portfolio/cv.pdf',
      status: 'upload_pending',
      created_at: '2026-01-01T00:00:00.000Z',
    };
    repo.saveArtifact(artifact);
    repo.saveArtifact({ ...artifact, status: 'attached' });

    expect(repo.getArtifact('art_1')?.status).toBe('attached');
  });

  it('returns undefined for an artifact that does not exist', () => {
    expect(repo.getArtifact('missing')).toBeUndefined();
  });
});

describe('SQLite repository: restart/persistence verification', () => {
  it('data survives closing the repository and reopening a new one at the same file path', () => {
    // 1. Create data using a SQLite repository.
    repo.saveForm(makeForm());
    repo.saveVersion(makeVersion());
    repo.saveSession(makeSession({
      answers: [{ field_id: 'name', value: 'Aarav', source: 'human', answered_at: '2026-01-01T00:00:01.000Z' }],
      events: [{
        id: 'evt_1',
        session_id: 'sess_1',
        type: 'session_started',
        schema_version: '1.0',
        created_at: '2026-01-01T00:00:00.000Z',
      }],
    }));
    repo.saveArtifact({
      id: 'art_1',
      tenant_id: 'tenant_1',
      session_id: 'sess_1',
      field_id: 'portfolio',
      filename: 'cv.pdf',
      content_type: 'application/pdf',
      size_bytes: 1024,
      bucket: 'test-bucket',
      key: 'k',
      status: 'upload_pending',
      created_at: '2026-01-01T00:00:00.000Z',
    });

    // 2. Close/release the repository (simulates the app process stopping).
    repo.close();

    // 3. Construct a brand new SQLite repository pointed at the same DB file
    //    (simulates the app process restarting).
    const reopened = createSqliteRepository(dbPath);

    try {
      // 4. Confirm the data still exists.
      expect(reopened.getForm('form_1')).toBeDefined();
      expect(reopened.getVersion('fv_1')).toBeDefined();
      const session = reopened.getSession('sess_1');
      expect(session?.answers).toHaveLength(1);
      expect(session?.events).toHaveLength(1);
      expect(reopened.getArtifact('art_1')).toBeDefined();
      expect(existsSync(dbPath)).toBe(true);
    } finally {
      reopened.close();
    }

    // afterEach still calls repo.close() on the original handle; hand it a
    // harmless no-op repository reference so it doesn't redundantly close a
    // handle this test already closed itself.
    repo = { close: () => {} } as SqliteRepositoryHandle;
  });
});

describe('SQLite repository: seeding is idempotent and non-destructive', () => {
  it('does not overwrite an existing row on a repeated seeded open', () => {
    const seeded = createSqliteRepository(dbPath, { seed: true });
    const original = seeded.getForm('sample-hiring');
    expect(original).toBeDefined();

    // Simulate an admin edit to the seeded demo form.
    seeded.saveForm({ ...original!, status: 'archived' });
    seeded.close();

    // Reopening with seed:true again must not revert that edit.
    const reopened = createSqliteRepository(dbPath, { seed: true });
    expect(reopened.getForm('sample-hiring')?.status).toBe('archived');
    reopened.close();

    repo = { close: () => {} } as SqliteRepositoryHandle;
  });
});
