import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  completeSession,
  createForm,
  getSession,
  publishForm,
  startSession,
  submitAnswer,
} from '@/lib/agentic-forms/runtime';

// Full-stack check that setting CELIYO_DATABASE_PATH actually routes runtime.ts through the
// SQLite repository — not just that the SQLite repository works in isolation (covered by
// sqlite-repository.test.ts). This never touches the in-memory store, resetStore(), or any
// other test file's state: it uses its own temp file and explicitly clears the SQLite
// singleton before and after so it can't leak into any other test.
let tempDir: string;
let dbPath: string;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'celiyo-sqlite-integration-'));
  dbPath = join(tempDir, 'integration.sqlite');
  globalThis.__agenticFormsSqliteRepository = undefined;
  vi.stubEnv('CELIYO_DATABASE_PATH', dbPath);
});

afterEach(() => {
  globalThis.__agenticFormsSqliteRepository?.close();
  globalThis.__agenticFormsSqliteRepository = undefined;
  vi.unstubAllEnvs();
  rmSync(tempDir, { recursive: true, force: true });
});

const basicForm = {
  title: 'SQLite Integration Form',
  fields: [
    { id: 'name', type: 'short_text', label: 'Name', required: true, validation: { min_length: 1 } },
  ],
  policy: {
    agent_can_ask_followups: false,
    requires_human_review: false,
    allowed_answer_modes: ['text'],
    prohibited_inferences: [],
  },
};

describe('runtime.ts routed through the SQLite repository', () => {
  it('runs a full create -> publish -> session -> answer -> complete flow against SQLite', () => {
    const draft = createForm(basicForm, 'tenant_demo');
    const published = publishForm(draft.id, 'tenant_demo');
    expect(published.status).toBe('published');

    const next = startSession(published.id, 'respondent_1', 'tenant_demo');
    const sessionId = next.session_id;

    submitAnswer(sessionId, { field_id: 'name', value: 'Aarav' });
    const submission = completeSession(sessionId);

    expect(submission.answers).toEqual([
      expect.objectContaining({ field_id: 'name', value: 'Aarav' }),
    ]);
    expect(getSession(sessionId).status).toBe('completed');
  });

  it('data survives closing and reopening the underlying SQLite handle', () => {
    const draft = createForm(basicForm, 'tenant_demo');
    const published = publishForm(draft.id, 'tenant_demo');
    const next = startSession(published.id, 'respondent_1', 'tenant_demo');
    submitAnswer(next.session_id, { field_id: 'name', value: 'Persisted' });

    // Simulate a process restart: close the cached handle and clear the singleton so
    // the next getRepository() call reopens the same file from scratch.
    globalThis.__agenticFormsSqliteRepository?.close();
    globalThis.__agenticFormsSqliteRepository = undefined;

    const session = getSession(next.session_id);
    expect(session.answers[0]?.value).toBe('Persisted');
  });
});
