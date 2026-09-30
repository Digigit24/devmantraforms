import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import type { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { authenticateApiKey } from './auth';
import {
  CreateArtifactUploadInputSchema,
  CreateFormInputSchema,
  SubmitAnswerInputSchema,
  UpdateFormInputSchema,
} from './schema';
import { AgenticFormError, publicError } from './errors';
import { jsonError } from './http';
import {
  completeSession,
  createForm,
  getForm,
  getNextStep,
  getSubmission,
  listForms,
  listSubmissions,
  pauseSession,
  publishForm,
  resumeSession,
  startSession,
  submitAnswer,
  updateForm,
} from './runtime';
import { createArtifactUpload } from './storage';
import type { TenantApiKeyRecord, TenantRecord } from './types';

type ToolExtra = RequestHandlerExtra<never, never>;

/**
 * Builds the AuthInfo object passed into transport.handleRequest(). The MCP SDK's own
 * OAuth-oriented AuthInfo shape doesn't have a first-class "tenant" field, so the resolved
 * tenant/key are carried in `extra` — read back via tenantIdFromExtra() in every tool
 * handler. This is the sole mechanism by which a tool call is scoped to a tenant; nothing
 * here ever falls back to trusting a URL segment.
 */
export function buildAuthInfo(tenant: TenantRecord, apiKey: TenantApiKeyRecord): AuthInfo {
  return {
    token: apiKey.id, // an internal identifier, never the plaintext key
    clientId: tenant.id,
    scopes: [],
    extra: { tenantId: tenant.id, tenantSlug: tenant.slug },
  };
}

function tenantIdFromExtra(extra: ToolExtra): string {
  const tenantId = extra.authInfo?.extra?.tenantId;
  if (typeof tenantId !== 'string' || !tenantId) {
    // Should be unreachable: the route handler always authenticates before dispatching to
    // the transport. Fails closed rather than silently operating tenant-unscoped.
    throw new AgenticFormError({ code: 'FORBIDDEN', message: 'No authenticated tenant on this request.' }, 401);
  }
  return tenantId;
}

function ok(data: unknown): CallToolResult {
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}

function toolError(error: unknown): CallToolResult {
  if (error instanceof AgenticFormError) {
    return { content: [{ type: 'text', text: JSON.stringify({ error: error.toResponse() }) }], isError: true };
  }
  return {
    content: [{ type: 'text', text: JSON.stringify({ error: { code: 'PROVIDER_UNAVAILABLE', message: 'Unexpected runtime error.' } }) }],
    isError: true,
  };
}

function publicSiteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3010').replace(/\/$/, '');
}

function formSummary(form: ReturnType<typeof getForm>) {
  return {
    id: form.id,
    title: form.draft.title,
    status: form.status,
    current_version: form.current_version?.version ?? null,
    created_at: undefined, // PublishedFormView doesn't carry these; omitted rather than fabricated
    public_url: form.status === 'published' ? `${publicSiteUrl()}/f/${form.id}` : null,
  };
}

/**
 * Builds a fresh McpServer with every CeliyoForms tool registered. A new instance is
 * created per request (see app/api/mcp/route.ts) — the server holds no state of its own
 * beyond the tool registrations, and all business logic lives in runtime.ts/storage.ts, so
 * this is cheap and avoids needing to manage a long-lived server object across requests.
 */
export function createCeliyoMcpServer(): McpServer {
  const server = new McpServer({ name: 'celiyoforms', version: '1.0.0' });

  server.registerTool(
    'list_forms',
    {
      title: 'List forms',
      description: 'List every form belonging to the authenticated tenant. Returns each form\'s id, title, status, current published version (if any), and its public URL once published.',
      inputSchema: {},
    },
    (_args, extra: ToolExtra) => {
      try {
        const tenantId = tenantIdFromExtra(extra);
        return ok(listForms(tenantId).map(formSummary));
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    'create_form',
    {
      title: 'Create form',
      description: 'Create a new draft form for the authenticated tenant, with any combination of the supported question types (short_text, long_text, email, number, single_select, multi_select, date, rating, file_upload, video_response, consent). The form starts as a draft — call publish_form to make it publicly reachable.',
      inputSchema: CreateFormInputSchema.omit({ owner_id: true }).shape,
    },
    (args, extra: ToolExtra) => {
      try {
        const tenantId = tenantIdFromExtra(extra);
        return ok(createForm(args, tenantId));
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    'update_form',
    {
      title: 'Update form',
      description: 'Edit an existing draft or published form: change its title/description/policy, or replace its full list of questions to add, remove, edit, or reorder them. There is no separate reorder operation — submit the complete `fields` array in the new order to reorder questions; omit `fields` entirely to leave existing questions untouched.',
      inputSchema: { form_id: z.string().min(1), ...UpdateFormInputSchema.shape },
    },
    (args, extra: ToolExtra) => {
      try {
        const tenantId = tenantIdFromExtra(extra);
        const { form_id, ...patch } = args;
        return ok(updateForm(form_id, patch, tenantId));
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    'publish_form',
    {
      title: 'Publish form',
      description: 'Publish a form\'s current draft as a new immutable version. Returns the public form URL — share this link directly with the user so they can open the form.',
      inputSchema: { form_id: z.string().min(1) },
    },
    (args, extra: ToolExtra) => {
      try {
        const tenantId = tenantIdFromExtra(extra);
        const form = publishForm(args.form_id, tenantId);
        return ok({
          form_id: form.id,
          version: form.current_version?.version ?? null,
          status: form.status,
          public_url: `${publicSiteUrl()}/f/${form.id}`,
        });
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    'start_session',
    {
      title: 'Start session',
      description: 'Start a new respondent session against a published form, returning the first question to ask.',
      inputSchema: { form_id: z.string().min(1), respondent_id: z.string().min(1).optional() },
    },
    (args, extra: ToolExtra) => {
      try {
        const tenantId = tenantIdFromExtra(extra);
        return ok(startSession(args.form_id, args.respondent_id, tenantId));
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    'get_next_step',
    {
      title: 'Get next step',
      description: 'Get the current or next question for a session, or its completion state if all required questions are answered.',
      inputSchema: { session_id: z.string().min(1) },
    },
    (args, extra: ToolExtra) => {
      try {
        const tenantId = tenantIdFromExtra(extra);
        return ok(getNextStep(args.session_id, tenantId));
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    'submit_answer',
    {
      title: 'Submit answer',
      description: 'Submit an answer to the current question in a session and get back the next step.',
      inputSchema: { session_id: z.string().min(1), ...SubmitAnswerInputSchema.shape },
    },
    (args, extra: ToolExtra) => {
      try {
        const tenantId = tenantIdFromExtra(extra);
        const { session_id, ...answer } = args;
        return ok(submitAnswer(session_id, answer, 'agent', tenantId));
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    'upload_answer_artifact',
    {
      title: 'Upload answer artifact',
      description: 'Request a short-lived upload URL for a file_upload or video_response answer. Upload the file to the returned URL, then submit_answer with the returned artifact_id.',
      inputSchema: CreateArtifactUploadInputSchema.shape,
    },
    async (args, extra: ToolExtra) => {
      try {
        const tenantId = tenantIdFromExtra(extra);
        return ok(await createArtifactUpload(args, tenantId));
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    'pause_session',
    {
      title: 'Pause session',
      description: 'Pause a session so it stops accepting answers until resumed.',
      inputSchema: { session_id: z.string().min(1) },
    },
    (args, extra: ToolExtra) => {
      try {
        const tenantId = tenantIdFromExtra(extra);
        return ok(pauseSession(args.session_id, tenantId));
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    'resume_session',
    {
      title: 'Resume session',
      description: 'Resume a paused session so it can accept answers again.',
      inputSchema: { session_id: z.string().min(1) },
    },
    (args, extra: ToolExtra) => {
      try {
        const tenantId = tenantIdFromExtra(extra);
        return ok(resumeSession(args.session_id, tenantId));
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    'complete_session',
    {
      title: 'Complete session',
      description: 'Complete a session once all required questions are answered, producing a submission.',
      inputSchema: { session_id: z.string().min(1) },
    },
    (args, extra: ToolExtra) => {
      try {
        const tenantId = tenantIdFromExtra(extra);
        return ok(completeSession(args.session_id, tenantId));
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    'list_submissions',
    {
      title: 'List submissions',
      description: 'List response summaries (submission_id, session_id, created_at) for every completed submission to a given form.',
      inputSchema: { form_id: z.string().min(1) },
    },
    (args, extra: ToolExtra) => {
      try {
        const tenantId = tenantIdFromExtra(extra);
        const submissions = listSubmissions(args.form_id, tenantId);
        return ok(submissions.map((submission) => ({
          submission_id: submission.id,
          session_id: submission.session_id,
          form_id: submission.form_id,
          created_at: submission.created_at,
        })));
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    'get_submission',
    {
      title: 'Get submission',
      description: 'Get a single submission\'s full answers by submission id.',
      inputSchema: { submission_id: z.string().min(1) },
    },
    (args, extra: ToolExtra) => {
      try {
        const tenantId = tenantIdFromExtra(extra);
        return ok(getSubmission(args.submission_id, tenantId));
      } catch (error) {
        return toolError(error);
      }
    },
  );

  return server;
}

/**
 * The real, standards-compatible MCP transport entry point. Authenticates the Bearer API
 * key first — before the transport or any tool ever runs — and derives tenant identity
 * solely from that key. tenantSlug (present only when reached via /api/mcp/{tenantSlug})
 * is never itself authorization: if given, it must match the authenticated tenant's own
 * slug, or the request is rejected as 404 so it can't be used to confirm another tenant's
 * slug is real.
 *
 * A fresh McpServer + transport is created per request (stateless mode: no
 * sessionIdGenerator). This app's tools carry no server-side conversational memory beyond
 * what's already persisted via runtime.ts/the repository, so statelessness is both
 * sufficient and avoids needing to manage a long-lived transport object across the
 * separate HTTP requests a real MCP client sends for initialize/tools-list/tools-call.
 */
export async function handleMcpTransportRequest(request: Request, tenantSlug?: string): Promise<Response> {
  try {
    const { tenant, apiKey } = authenticateApiKey(request.headers.get('authorization'));
    if (tenantSlug !== undefined && tenantSlug !== tenant.slug) {
      throw publicError('NOT_FOUND', 'Tenant was not found.', 404);
    }

    const server = createCeliyoMcpServer();
    const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    await server.connect(transport);

    return await transport.handleRequest(request, { authInfo: buildAuthInfo(tenant, apiKey) });
  } catch (error) {
    return jsonError(error);
  }
}
