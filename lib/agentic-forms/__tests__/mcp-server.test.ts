import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { beforeEach, describe, expect, it } from 'vitest';
import { createTenantWithApiKey } from '@/lib/agentic-forms/auth';
import { handleMcpTransportRequest } from '@/lib/agentic-forms/mcp-server';
import { getRepository } from '@/lib/agentic-forms/store';
import { resetStore } from './helpers';

// Drives the real, official MCP client SDK against the real transport handler entirely
// in-process — no live HTTP server needed. StreamableHTTPClientTransport accepts a custom
// `fetch`, so requests are routed directly into handleMcpTransportRequest() with a real
// Web-standard Request object, exercising the exact same code path a real deployment does.
function buildClient(apiKey: string | undefined, tenantSlug?: string): { client: Client; transport: StreamableHTTPClientTransport } {
  const url = tenantSlug ? `http://mcp-test.local/api/mcp/${tenantSlug}` : 'http://mcp-test.local/api/mcp';
  const client = new Client({ name: 'test-client', version: '1.0.0' });
  const transport = new StreamableHTTPClientTransport(new URL(url), {
    requestInit: apiKey ? { headers: { Authorization: `Bearer ${apiKey}` } } : {},
    fetch: async (requestUrl, init) => handleMcpTransportRequest(new Request(requestUrl, init), tenantSlug),
  });
  return { client, transport };
}

async function connectClient(apiKey: string, tenantSlug?: string): Promise<Client> {
  const { client, transport } = buildClient(apiKey, tenantSlug);
  await client.connect(transport);
  return client;
}

function parseResult<T = unknown>(result: CallToolResult): T {
  const text = result.content[0];
  if (!text || text.type !== 'text') throw new Error('Expected text content');
  return JSON.parse(text.text) as T;
}

const basicFormInput = {
  title: 'Smoke Form',
  fields: [
    { id: 'name', type: 'short_text', label: 'Name', required: true, validation: { min_length: 1 } },
    { id: 'age', type: 'number', label: 'Age', validation: { min: 0, max: 130 } },
    {
      id: 'color',
      type: 'single_select',
      label: 'Color',
      options: [{ label: 'Red', value: 'red' }, { label: 'Blue', value: 'blue' }],
    },
  ],
  policy: {},
};

beforeEach(() => {
  resetStore();
});

describe('real MCP transport: handshake and discovery', () => {
  it('completes the initialize handshake and reports server info', async () => {
    const { apiKey } = createTenantWithApiKey({ slug: 'acme', name: 'Acme Inc' });
    const client = new Client({ name: 'test-client', version: '1.0.0' });
    const transport = new StreamableHTTPClientTransport(new URL('http://mcp-test.local/api/mcp'), {
      requestInit: { headers: { Authorization: `Bearer ${apiKey}` } },
      fetch: async (url, init) => handleMcpTransportRequest(new Request(url, init)),
    });
    await client.connect(transport);
    const serverVersion = client.getServerVersion();
    expect(serverVersion?.name).toBe('celiyoforms');
    await client.close();
  });

  it('tools/list returns every CeliyoForms tool', async () => {
    const { apiKey } = createTenantWithApiKey({ slug: 'acme', name: 'Acme Inc' });
    const client = new Client({ name: 'test-client', version: '1.0.0' });
    const transport = new StreamableHTTPClientTransport(new URL('http://mcp-test.local/api/mcp'), {
      requestInit: { headers: { Authorization: `Bearer ${apiKey}` } },
      fetch: async (url, init) => handleMcpTransportRequest(new Request(url, init)),
    });
    await client.connect(transport);
    const tools = await client.listTools();
    expect(tools.tools.map((t) => t.name).sort()).toEqual([
      'complete_session',
      'create_form',
      'get_next_step',
      'get_submission',
      'list_forms',
      'list_submissions',
      'pause_session',
      'publish_form',
      'resume_session',
      'start_session',
      'submit_answer',
      'update_form',
      'upload_answer_artifact',
    ]);
    await client.close();
  });
});

describe('real MCP transport: authentication', () => {
  it('rejects a request with no Authorization header', async () => {
    const client = new Client({ name: 'test-client', version: '1.0.0' });
    const transport = new StreamableHTTPClientTransport(new URL('http://mcp-test.local/api/mcp'), {
      fetch: async (url, init) => handleMcpTransportRequest(new Request(url, init)),
    });
    await expect(client.connect(transport)).rejects.toThrow();
  });

  it('rejects an invalid API key', async () => {
    const client = new Client({ name: 'test-client', version: '1.0.0' });
    const transport = new StreamableHTTPClientTransport(new URL('http://mcp-test.local/api/mcp'), {
      requestInit: { headers: { Authorization: 'Bearer cfmcp_totally-invalid' } },
      fetch: async (url, init) => handleMcpTransportRequest(new Request(url, init)),
    });
    await expect(client.connect(transport)).rejects.toThrow();
  });

  it('accepts a valid tenant API key', async () => {
    const { apiKey } = createTenantWithApiKey({ slug: 'acme', name: 'Acme Inc' });
    const client = new Client({ name: 'test-client', version: '1.0.0' });
    const transport = new StreamableHTTPClientTransport(new URL('http://mcp-test.local/api/mcp'), {
      requestInit: { headers: { Authorization: `Bearer ${apiKey}` } },
      fetch: async (url, init) => handleMcpTransportRequest(new Request(url, init)),
    });
    await expect(client.connect(transport)).resolves.not.toThrow();
    await client.close();
  });

  it('rejects a revoked API key', async () => {
    const { apiKey } = createTenantWithApiKey({ slug: 'acme', name: 'Acme Inc' });
    const repo = getRepository();
    const { hashApiKey } = await import('@/lib/agentic-forms/auth');
    const stored = repo.findActiveApiKeyByHash(hashApiKey(apiKey));
    repo.revokeApiKey(stored!.id);

    const client = new Client({ name: 'test-client', version: '1.0.0' });
    const transport = new StreamableHTTPClientTransport(new URL('http://mcp-test.local/api/mcp'), {
      requestInit: { headers: { Authorization: `Bearer ${apiKey}` } },
      fetch: async (url, init) => handleMcpTransportRequest(new Request(url, init)),
    });
    await expect(client.connect(transport)).rejects.toThrow();
  });

  it('rejects a tenantSlug that does not match the authenticated tenant', async () => {
    const { apiKey } = createTenantWithApiKey({ slug: 'acme', name: 'Acme Inc' });
    const client = new Client({ name: 'test-client', version: '1.0.0' });
    const transport = new StreamableHTTPClientTransport(new URL('http://mcp-test.local/api/mcp/someone-else'), {
      requestInit: { headers: { Authorization: `Bearer ${apiKey}` } },
      fetch: async (url, init) => handleMcpTransportRequest(new Request(url, init), 'someone-else'),
    });
    await expect(client.connect(transport)).rejects.toThrow();
  });
});

describe('real MCP transport: form and session tools', () => {
  it('list_forms works (empty for a fresh tenant)', async () => {
    const { apiKey } = createTenantWithApiKey({ slug: 'acme', name: 'Acme Inc' });
    const client = await connectClient(apiKey);
    const result = await client.callTool({ name: 'list_forms', arguments: {} });
    expect(parseResult(result as CallToolResult)).toEqual([]);
    await client.close();
  });

  it('create_form works and supports representative field types', async () => {
    const { apiKey } = createTenantWithApiKey({ slug: 'acme', name: 'Acme Inc' });
    const client = await connectClient(apiKey);
    const result = await client.callTool({
      name: 'create_form',
      arguments: {
        title: 'All Field Types',
        fields: [
          { id: 'a', type: 'short_text', label: 'A', validation: {} },
          { id: 'b', type: 'long_text', label: 'B', validation: {} },
          { id: 'c', type: 'email', label: 'C', validation: {} },
          { id: 'd', type: 'number', label: 'D', validation: { min: 1, max: 10 } },
          { id: 'e', type: 'single_select', label: 'E', options: [{ label: 'X', value: 'x' }] },
          { id: 'f', type: 'multi_select', label: 'F', options: [{ label: 'X', value: 'x' }] },
          { id: 'g', type: 'date', label: 'G', validation: {} },
          { id: 'h', type: 'rating', label: 'H', validation: { min: 1, max: 5 } },
          { id: 'i', type: 'file_upload', label: 'I', validation: {} },
          {
            id: 'consent',
            type: 'consent',
            label: 'Consent to record',
            validation: {},
          },
          {
            id: 'j',
            type: 'video_response',
            label: 'J',
            validation: {},
            visible_if: { field_id: 'consent', operator: 'equals', value: true },
          },
        ],
        policy: {},
      },
    }) as CallToolResult;
    expect(result.isError ?? false).toBe(false);
    const form = parseResult<{ id: string; status: string }>(result);
    expect(form.status).toBe('draft');
    await client.close();
  });

  it('update_form works, including reordering fields via full array replacement', async () => {
    const { apiKey } = createTenantWithApiKey({ slug: 'acme', name: 'Acme Inc' });
    const client = await connectClient(apiKey);
    const created = parseResult<{ id: string }>(
      await client.callTool({ name: 'create_form', arguments: basicFormInput }) as CallToolResult,
    );

    const reordered = [basicFormInput.fields[2], basicFormInput.fields[0], basicFormInput.fields[1]];
    const updated = await client.callTool({
      name: 'update_form',
      arguments: { form_id: created.id, fields: reordered, title: 'Renamed' },
    }) as CallToolResult;
    expect(updated.isError ?? false).toBe(false);
    const form = parseResult<{ draft: { title: string; fields: { id: string }[] } }>(updated);
    expect(form.draft.title).toBe('Renamed');
    expect(form.draft.fields.map((f) => f.id)).toEqual(['color', 'name', 'age']);
    await client.close();
  });

  it('publish_form works and returns the correct public URL', async () => {
    const { apiKey } = createTenantWithApiKey({ slug: 'acme', name: 'Acme Inc' });
    const client = await connectClient(apiKey);
    const created = parseResult<{ id: string }>(
      await client.callTool({ name: 'create_form', arguments: basicFormInput }) as CallToolResult,
    );
    const published = parseResult<{ form_id: string; version: number; status: string; public_url: string }>(
      await client.callTool({ name: 'publish_form', arguments: { form_id: created.id } }) as CallToolResult,
    );
    expect(published.status).toBe('published');
    expect(published.version).toBe(1);
    expect(published.public_url).toBe(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3010'}/f/${created.id}`);
    await client.close();
  });

  it('existing session tools (start/next/answer/pause/resume/complete) still work through real MCP', async () => {
    const { apiKey } = createTenantWithApiKey({ slug: 'acme', name: 'Acme Inc' });
    const client = await connectClient(apiKey);
    const created = parseResult<{ id: string }>(
      await client.callTool({ name: 'create_form', arguments: basicFormInput }) as CallToolResult,
    );
    await client.callTool({ name: 'publish_form', arguments: { form_id: created.id } });

    const started = parseResult<{ session_id: string; step: { id: string } }>(
      await client.callTool({ name: 'start_session', arguments: { form_id: created.id } }) as CallToolResult,
    );
    expect(started.step.id).toBe('name');

    const paused = parseResult<{ status: string }>(
      await client.callTool({ name: 'pause_session', arguments: { session_id: started.session_id } }) as CallToolResult,
    );
    expect(paused.status).toBe('paused');
    const resumed = parseResult<{ status: string }>(
      await client.callTool({ name: 'resume_session', arguments: { session_id: started.session_id } }) as CallToolResult,
    );
    expect(resumed.status).toBe('awaiting_answer');

    await client.callTool({ name: 'submit_answer', arguments: { session_id: started.session_id, field_id: 'name', value: 'Aarav' } });
    const next = parseResult<{ step: { id?: string; type: string } }>(
      await client.callTool({ name: 'get_next_step', arguments: { session_id: started.session_id } }) as CallToolResult,
    );
    // "name" is the only required field in basicFormInput; the next unanswered (optional)
    // field is offered next, not completion — completeSession only needs required fields
    // answered, which the next call below leaves as-is.
    expect(next.step.id).toBe('age');

    const completed = parseResult<{ id: string; session_id: string }>(
      await client.callTool({ name: 'complete_session', arguments: { session_id: started.session_id } }) as CallToolResult,
    );
    expect(completed.session_id).toBe(started.session_id);

    const gotten = parseResult<{ id: string }>(
      await client.callTool({ name: 'get_submission', arguments: { submission_id: completed.id } }) as CallToolResult,
    );
    expect(gotten.id).toBe(completed.id);
    await client.close();
  });

  it('list_submissions works', async () => {
    const { apiKey } = createTenantWithApiKey({ slug: 'acme', name: 'Acme Inc' });
    const client = await connectClient(apiKey);
    const created = parseResult<{ id: string }>(
      await client.callTool({ name: 'create_form', arguments: basicFormInput }) as CallToolResult,
    );
    await client.callTool({ name: 'publish_form', arguments: { form_id: created.id } });
    const started = parseResult<{ session_id: string }>(
      await client.callTool({ name: 'start_session', arguments: { form_id: created.id } }) as CallToolResult,
    );
    await client.callTool({ name: 'submit_answer', arguments: { session_id: started.session_id, field_id: 'name', value: 'Aarav' } });
    await client.callTool({ name: 'complete_session', arguments: { session_id: started.session_id } });

    const submissions = parseResult<{ submission_id: string; session_id: string; form_id: string }[]>(
      await client.callTool({ name: 'list_submissions', arguments: { form_id: created.id } }) as CallToolResult,
    );
    expect(submissions).toHaveLength(1);
    expect(submissions[0]?.session_id).toBe(started.session_id);
    await client.close();
  });

  it('get_submission works', async () => {
    const { apiKey } = createTenantWithApiKey({ slug: 'acme', name: 'Acme Inc' });
    const client = await connectClient(apiKey);
    const created = parseResult<{ id: string }>(
      await client.callTool({ name: 'create_form', arguments: basicFormInput }) as CallToolResult,
    );
    await client.callTool({ name: 'publish_form', arguments: { form_id: created.id } });
    const started = parseResult<{ session_id: string }>(
      await client.callTool({ name: 'start_session', arguments: { form_id: created.id } }) as CallToolResult,
    );
    await client.callTool({ name: 'submit_answer', arguments: { session_id: started.session_id, field_id: 'name', value: 'Aarav' } });
    const completed = parseResult<{ id: string; answers: { field_id: string }[] }>(
      await client.callTool({ name: 'complete_session', arguments: { session_id: started.session_id } }) as CallToolResult,
    );
    const submission = parseResult<{ id: string; answers: { field_id: string }[] }>(
      await client.callTool({ name: 'get_submission', arguments: { submission_id: completed.id } }) as CallToolResult,
    );
    expect(submission.answers.map((a) => a.field_id)).toContain('name');
    await client.close();
  });
});

describe('real MCP transport: cross-tenant isolation', () => {
  it('tenant A cannot see tenant B tools/data via list_forms', async () => {
    const a = createTenantWithApiKey({ slug: 'tenant-a', name: 'Tenant A' });
    const b = createTenantWithApiKey({ slug: 'tenant-b', name: 'Tenant B' });
    const clientA = await connectClient(a.apiKey);
    const clientB = await connectClient(b.apiKey);

    const createdB = parseResult<{ id: string }>(
      await clientB.callTool({ name: 'create_form', arguments: basicFormInput }) as CallToolResult,
    );

    const listA = parseResult<{ id: string }[]>(
      await clientA.callTool({ name: 'list_forms', arguments: {} }) as CallToolResult,
    );
    expect(listA.some((f) => f.id === createdB.id)).toBe(false);

    await clientA.close();
    await clientB.close();
  });

  it('cross-tenant submission access fails as NOT_FOUND', async () => {
    const a = createTenantWithApiKey({ slug: 'tenant-a', name: 'Tenant A' });
    const b = createTenantWithApiKey({ slug: 'tenant-b', name: 'Tenant B' });
    const clientA = await connectClient(a.apiKey);
    const clientB = await connectClient(b.apiKey);

    const createdA = parseResult<{ id: string }>(
      await clientA.callTool({ name: 'create_form', arguments: basicFormInput }) as CallToolResult,
    );
    await clientA.callTool({ name: 'publish_form', arguments: { form_id: createdA.id } });
    const startedA = parseResult<{ session_id: string }>(
      await clientA.callTool({ name: 'start_session', arguments: { form_id: createdA.id } }) as CallToolResult,
    );
    await clientA.callTool({ name: 'submit_answer', arguments: { session_id: startedA.session_id, field_id: 'name', value: 'Aarav' } });
    const completedA = parseResult<{ id: string }>(
      await clientA.callTool({ name: 'complete_session', arguments: { session_id: startedA.session_id } }) as CallToolResult,
    );

    const attempt = await clientB.callTool({ name: 'get_submission', arguments: { submission_id: completedA.id } }) as CallToolResult;
    expect(attempt.isError).toBe(true);
    expect(JSON.stringify(attempt.content)).toContain('NOT_FOUND');

    await clientA.close();
    await clientB.close();
  });
});
