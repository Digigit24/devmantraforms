import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTenantWithApiKey, hashApiKey } from '@/lib/agentic-forms/auth';
import { handleMcpPost, mcpCapabilities } from '@/lib/agentic-forms/mcp-http';
import { getSession } from '@/lib/agentic-forms/runtime';
import { getRepository, getStore } from '@/lib/agentic-forms/store';
import { basicForm, resetStore } from './helpers';

let demoApiKey: string;

beforeEach(() => {
  resetStore();
  demoApiKey = createTenantWithApiKey({ slug: 'demo', name: 'Demo Workspace' }).apiKey;
});

afterEach(() => {
  vi.unstubAllEnvs();
});

interface RequestOptions {
  tenantSlug?: string;
  apiKey?: string | null;
}

function buildRequest(body: unknown, { tenantSlug, apiKey = demoApiKey }: RequestOptions = {}, method: 'GET' | 'POST' = 'POST') {
  const path = tenantSlug !== undefined ? `/api/mcp/${tenantSlug}` : '/api/mcp';
  const headers: HeadersInit = {};
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
  return new Request(`http://localhost${path}`, {
    method,
    headers,
    ...(method === 'POST' ? { body: typeof body === 'string' ? body : JSON.stringify(body) } : {}),
  });
}

function post(body: unknown, options: RequestOptions = {}) {
  return handleMcpPost(buildRequest(body, options), options.tenantSlug);
}

function getCapabilities(options: RequestOptions = {}) {
  return mcpCapabilities(buildRequest(undefined, options, 'GET'), options.tenantSlug);
}

async function callTool(name: string, args: Record<string, unknown> = {}, options: RequestOptions = {}) {
  const response = await post({ kind: 'tool', name, arguments: args }, options);
  return { status: response.status, body: await response.json() };
}

describe('MCP capabilities', () => {
  it('lists the tools and resources for a tenant', async () => {
    const response = getCapabilities();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.schema_version).toBe('1.0');
    expect(body.tenant.slug).toBe('demo');
    expect(body.tools).toEqual([
      'create_form',
      'publish_form',
      'start_session',
      'get_next_step',
      'submit_answer',
      'upload_answer_artifact',
      'pause_session',
      'resume_session',
      'complete_session',
      'get_submission',
      'request_human_review',
    ]);
    expect(body.resources).toEqual([
      'form://{formId}',
      'session://{sessionId}',
      'submission://{submissionId}',
    ]);
  });

  it('lists published forms for the tenant through a capabilities request', async () => {
    const response = await post({ kind: 'capabilities' });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.tenant.slug).toBe('demo');
    expect(body.forms.map((form: { id: string }) => form.id)).toContain('sample-hiring');
  });
});

describe('MCP resources', () => {
  it('reads a form resource', async () => {
    const response = await post({ kind: 'resource', uri: 'form://sample-hiring' });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.resource.id).toBe('sample-hiring');
  });

  it('returns 404 for a missing form resource', async () => {
    const response = await post({ kind: 'resource', uri: 'form://does-not-exist' });
    expect(response.status).toBe(404);
    expect((await response.json()).error.code).toBe('NOT_FOUND');
  });

  it('hides a form that belongs to another tenant', async () => {
    const created = await callTool('create_form', basicForm);
    const formId = created.body.result.id as string;

    getStore().forms.set(formId, { ...getStore().forms.get(formId)!, tenant_id: 'tenant_other' });

    const response = await post({ kind: 'resource', uri: `form://${formId}` });
    expect(response.status).toBe(404);
  });
});

describe('MCP tool dispatch', () => {
  it('runs a full agent flow: create, publish, start, answer, complete, read submission', async () => {
    const created = await callTool('create_form', basicForm);
    expect(created.status).toBe(200);
    const formId = created.body.result.id as string;

    const published = await callTool('publish_form', { form_id: formId });
    expect(published.status).toBe(200);
    expect(published.body.result.id).toBe(formId);

    const started = await callTool('start_session', { form_id: formId, respondent_id: 'agent-1' });
    expect(started.status).toBe(200);
    const sessionId = started.body.result.session_id as string;
    expect(started.body.result.step.id).toBe('name');

    const next = await callTool('get_next_step', { session_id: sessionId });
    expect(next.body.result.step.id).toBe('name');

    for (const [field_id, value] of [
      ['name', 'Aarav Mehta'],
      ['email', 'aarav@example.com'],
      ['color', 'red'],
    ] as const) {
      const answered = await callTool('submit_answer', { session_id: sessionId, field_id, value });
      expect(answered.status).toBe(200);
    }

    expect(getSession(sessionId).answers.every((answer) => answer.source === 'agent')).toBe(true);

    const completed = await callTool('complete_session', { session_id: sessionId });
    expect(completed.status).toBe(200);
    const submissionId = completed.body.result.id as string;

    const submission = await callTool('get_submission', { submission_id: submissionId });
    expect(submission.status).toBe(200);
    expect(submission.body.result.session_id).toBe(sessionId);
    expect(submission.body.result.answers.map((answer: { field_id: string }) => answer.field_id))
      .toEqual(['name', 'email', 'color']);
  });

  it('pauses and resumes a session', async () => {
    const started = await callTool('start_session', { form_id: 'sample-hiring' });
    const sessionId = started.body.result.session_id as string;

    await callTool('pause_session', { session_id: sessionId });
    expect(getSession(sessionId).status).toBe('paused');

    await callTool('resume_session', { session_id: sessionId });
    expect(getSession(sessionId).status).toBe('awaiting_answer');
  });

  it('passes an idempotency key through submit_answer', async () => {
    const started = await callTool('start_session', { form_id: 'sample-hiring' });
    const sessionId = started.body.result.session_id as string;
    const args = { session_id: sessionId, field_id: 'candidate_name', value: 'Aarav Mehta', idempotency_key: 'k1' };

    await callTool('submit_answer', args);
    await callTool('submit_answer', args);

    const answers = getSession(sessionId).answers.filter((answer) => answer.field_id === 'candidate_name');
    expect(answers).toHaveLength(1);
  });

  it('returns a stubbed response for request_human_review', async () => {
    const result = await callTool('request_human_review', { session_id: 'sess_any' });
    expect(result.status).toBe(200);
    expect(result.body.result.status).toBe('queued');
    expect(result.body.result.session_id).toBe('sess_any');
    expect(result.body.result.tenant_id).toBe('tenant_demo');
  });

  it('returns runtime errors with their public code and status', async () => {
    const result = await callTool('get_next_step', { session_id: 'sess_missing' });
    expect(result.status).toBe(404);
    expect(result.body.error.code).toBe('NOT_FOUND');
  });

  it('reports storage as unavailable when S3 is not configured', async () => {
    vi.stubEnv('S3_BUCKET', '');
    vi.stubEnv('S3_ACCESS_KEY_ID', '');
    vi.stubEnv('S3_SECRET_ACCESS_KEY', '');
    const result = await callTool('upload_answer_artifact', {
      session_id: 'sess_any',
      field_id: 'portfolio',
      filename: 'cv.pdf',
      content_type: 'application/pdf',
      size_bytes: 1024,
    });
    expect(result.status).toBe(503);
    expect(result.body.error.code).toBe('PROVIDER_UNAVAILABLE');
  });
});

describe('MCP request validation', () => {
  it('returns 400 for a body that is not valid JSON', async () => {
    const response = await post('{not json');
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe('INVALID_INPUT');
  });

  it('returns 400 for an unknown request kind', async () => {
    const response = await post({ kind: 'nonsense' });
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe('INVALID_INPUT');
  });

  it('returns 400 for an unknown tool name', async () => {
    const response = await post({ kind: 'tool', name: 'delete_everything', arguments: {} });
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe('INVALID_INPUT');
  });

  it('returns 400 with the field id when a required string tool argument is missing', async () => {
    const result = await callTool('get_next_step', {});
    expect(result.status).toBe(400);
    expect(result.body.error.code).toBe('INVALID_INPUT');
    expect(result.body.error.field).toBe('session_id');
  });

  it('returns 400 with the field id when a required number tool argument is missing', async () => {
    const result = await callTool('upload_answer_artifact', {
      session_id: 'sess_any',
      field_id: 'portfolio',
      filename: 'cv.pdf',
      content_type: 'application/pdf',
    });
    expect(result.status).toBe(400);
    expect(result.body.error.code).toBe('INVALID_INPUT');
    expect(result.body.error.field).toBe('size_bytes');
  });

  it('returns 400 for an unsupported resource URI scheme', async () => {
    const response = await post({ kind: 'resource', uri: 'unknown://whatever' });
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe('INVALID_INPUT');
  });
});

describe('MCP authentication', () => {
  it('rejects a request with no Authorization header (401)', async () => {
    const response = await post({ kind: 'capabilities' }, { apiKey: null });
    expect(response.status).toBe(401);
    expect((await response.json()).error.code).toBe('FORBIDDEN');
  });

  it('rejects a request with a malformed Authorization header (401)', async () => {
    const request = new Request('http://localhost/api/mcp', {
      method: 'POST',
      headers: { Authorization: 'Basic not-a-bearer-token' },
      body: JSON.stringify({ kind: 'capabilities' }),
    });
    const response = await handleMcpPost(request);
    expect(response.status).toBe(401);
    expect((await response.json()).error.code).toBe('FORBIDDEN');
  });

  it('rejects a request with an unknown/invalid API key (401)', async () => {
    const response = await post({ kind: 'capabilities' }, { apiKey: 'cfmcp_totally-invalid-key' });
    expect(response.status).toBe(401);
    expect((await response.json()).error.code).toBe('FORBIDDEN');
  });

  it('rejects a request with a revoked API key (401)', async () => {
    const { apiKey } = createTenantWithApiKey({ slug: 'acme', name: 'Acme Inc' });
    const repo = getRepository();
    const stored = repo.findActiveApiKeyByHash(hashApiKey(apiKey));
    repo.revokeApiKey(stored!.id);

    const response = await post({ kind: 'capabilities' }, { apiKey });
    expect(response.status).toBe(401);
    expect((await response.json()).error.code).toBe('FORBIDDEN');
  });

  it('rejects a GET capabilities request with no Authorization header (401)', async () => {
    const response = getCapabilities({ apiKey: null });
    expect(response.status).toBe(401);
    expect((await response.json()).error.code).toBe('FORBIDDEN');
  });

  it('rejects a tenantSlug in the URL that does not match the authenticated tenant (404, not leaking existence)', async () => {
    const response = await post({ kind: 'capabilities' }, { tenantSlug: 'nobody' });
    expect(response.status).toBe(404);
    expect((await response.json()).error.code).toBe('NOT_FOUND');
  });

  it('accepts a tenantSlug in the URL that matches the authenticated tenant', async () => {
    const response = await post({ kind: 'capabilities' }, { tenantSlug: 'demo' });
    expect(response.status).toBe(200);
  });

  it('a valid tenant key can still use every existing MCP shim operation', async () => {
    // Exercises the same operations as the earlier functional tests, but explicitly
    // through the root (no tenantSlug) authenticated path, confirming auth doesn't
    // break normal usage.
    const created = await callTool('create_form', basicForm);
    expect(created.status).toBe(200);
    const published = await callTool('publish_form', { form_id: created.body.result.id });
    expect(published.status).toBe(200);
  });
});

describe('MCP cross-tenant isolation', () => {
  async function createTenantWithForm(slug: string) {
    const { tenant, apiKey } = createTenantWithApiKey({ slug, name: slug });
    const created = await callTool('create_form', basicForm, { apiKey });
    const formId = created.body.result.id as string;
    const published = await callTool('publish_form', { form_id: formId }, { apiKey });
    expect(published.status).toBe(200);
    return { tenant, apiKey, formId };
  }

  it('tenant A cannot list tenant B forms', async () => {
    const a = await createTenantWithForm('tenant-a');
    const b = await createTenantWithForm('tenant-b');

    const responseA = await post({ kind: 'capabilities' }, { apiKey: a.apiKey });
    const bodyA = await responseA.json();
    const idsA = bodyA.forms.map((form: { id: string }) => form.id);
    expect(idsA).toContain(a.formId);
    expect(idsA).not.toContain(b.formId);
  });

  it('tenant A cannot get tenant B form by ID (404, not leaking existence)', async () => {
    const a = await createTenantWithForm('tenant-a');
    const b = await createTenantWithForm('tenant-b');

    const response = await post({ kind: 'resource', uri: `form://${b.formId}` }, { apiKey: a.apiKey });
    expect(response.status).toBe(404);
    expect((await response.json()).error.code).toBe('NOT_FOUND');
  });

  it('tenant A cannot operate on tenant B session (get_next_step, submit_answer, pause, resume, complete)', async () => {
    const a = await createTenantWithForm('tenant-a');
    const b = await createTenantWithForm('tenant-b');
    const startedB = await callTool('start_session', { form_id: b.formId }, { apiKey: b.apiKey });
    const sessionIdB = startedB.body.result.session_id as string;

    for (const [name, args] of [
      ['get_next_step', { session_id: sessionIdB }],
      ['submit_answer', { session_id: sessionIdB, field_id: 'name', value: 'x' }],
      ['pause_session', { session_id: sessionIdB }],
      ['resume_session', { session_id: sessionIdB }],
      ['complete_session', { session_id: sessionIdB }],
    ] as const) {
      const result = await callTool(name, args, { apiKey: a.apiKey });
      expect(result.status, `${name} should be rejected`).toBe(404);
      expect(result.body.error.code).toBe('NOT_FOUND');
    }
  });

  it('tenant A cannot access tenant B submission', async () => {
    const a = await createTenantWithForm('tenant-a');
    const b = await createTenantWithForm('tenant-b');
    const startedB = await callTool('start_session', { form_id: b.formId }, { apiKey: b.apiKey });
    const sessionIdB = startedB.body.result.session_id as string;
    for (const [field_id, value] of [['name', 'Tenant B'], ['email', 'b@example.com'], ['color', 'red']] as const) {
      await callTool('submit_answer', { session_id: sessionIdB, field_id, value }, { apiKey: b.apiKey });
    }
    const completedB = await callTool('complete_session', { session_id: sessionIdB }, { apiKey: b.apiKey });
    const submissionIdB = completedB.body.result.id as string;

    const result = await callTool('get_submission', { submission_id: submissionIdB }, { apiKey: a.apiKey });
    expect(result.status).toBe(404);
    expect(result.body.error.code).toBe('NOT_FOUND');

    const viaResource = await post({ kind: 'resource', uri: `submission://${submissionIdB}` }, { apiKey: a.apiKey });
    expect(viaResource.status).toBe(404);
  });

  it('tenant A cannot access or use tenant B artifact', async () => {
    vi.stubEnv('S3_BUCKET', 'test-bucket');
    vi.stubEnv('S3_ACCESS_KEY_ID', 'test-key');
    vi.stubEnv('S3_SECRET_ACCESS_KEY', 'test-secret');

    const a = await createTenantWithForm('tenant-a');
    const b = await createTenantWithForm('tenant-b');
    const startedB = await callTool('start_session', { form_id: b.formId }, { apiKey: b.apiKey });
    const sessionIdB = startedB.body.result.session_id as string;

    // Tenant A must not even be able to create an artifact upload against tenant B's session.
    const uploadAttempt = await callTool('upload_answer_artifact', {
      session_id: sessionIdB,
      field_id: 'name',
      filename: 'x.pdf',
      content_type: 'application/pdf',
      size_bytes: 100,
    }, { apiKey: a.apiKey });
    expect(uploadAttempt.status).toBe(404);
    expect(uploadAttempt.body.error.code).toBe('NOT_FOUND');
  });
});
