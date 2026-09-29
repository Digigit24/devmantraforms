import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { handleMcpPost, mcpCapabilities } from '@/lib/agentic-forms/mcp-http';
import { getSession } from '@/lib/agentic-forms/runtime';
import { getStore } from '@/lib/agentic-forms/store';
import { basicForm, resetStore } from './helpers';

beforeEach(() => {
  resetStore();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

function post(body: unknown, tenantSlug = 'demo') {
  const request = new Request('http://localhost/api/mcp/demo', {
    method: 'POST',
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
  return handleMcpPost(request, tenantSlug);
}

async function callTool(name: string, args: Record<string, unknown> = {}, tenantSlug = 'demo') {
  const response = await post({ kind: 'tool', name, arguments: args }, tenantSlug);
  return { status: response.status, body: await response.json() };
}

describe('MCP capabilities', () => {
  it('lists the tools and resources for a tenant', async () => {
    const response = mcpCapabilities('demo');
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
  it('returns 404 for an unknown tenant', async () => {
    const response = await post({ kind: 'capabilities' }, 'nobody');
    expect(response.status).toBe(404);
    expect((await response.json()).error.code).toBe('NOT_FOUND');
  });

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

  // Documents current behavior: a missing string argument becomes a generic 500 instead of INVALID_INPUT.
  it('currently returns a generic 500 when a required tool argument is missing', async () => {
    const result = await callTool('get_next_step', {});
    expect(result.status).toBe(500);
    expect(result.body.error.code).toBe('PROVIDER_UNAVAILABLE');
  });
});
