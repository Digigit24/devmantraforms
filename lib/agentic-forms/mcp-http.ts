import { z } from 'zod';
import { authenticateApiKey } from './auth';
import { publicError } from './errors';
import { jsonError, jsonOk } from './http';
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
} from './runtime';
import { createArtifactUpload } from './storage';
import type { TenantRecord } from './types';

const McpRequestSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('capabilities') }),
  z.object({ kind: z.literal('resource'), uri: z.string().min(1) }),
  z.object({
    kind: z.literal('tool'),
    name: z.enum([
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
    ]),
    arguments: z.record(z.unknown()).default({}),
  }),
]);

// The tenant slug in the /api/mcp/{tenantSlug} URL is never trusted as authorization by
// itself — the API key alone determines which tenant a request acts as. If a slug is also
// present in the URL, it must agree with the authenticated tenant; a mismatch is rejected
// as NOT_FOUND (not FORBIDDEN) so a caller cannot use this to probe whether a given slug
// belongs to some other, real tenant.
function requireSlugMatchesAuthenticatedTenant(tenant: TenantRecord, tenantSlug?: string) {
  if (tenantSlug !== undefined && tenantSlug !== tenant.slug) {
    throw publicError('NOT_FOUND', 'Tenant was not found.', 404);
  }
}

export function mcpCapabilities(request: Request, tenantSlug?: string) {
  try {
    const { tenant } = authenticateApiKey(request.headers.get('authorization'));
    requireSlugMatchesAuthenticatedTenant(tenant, tenantSlug);
    return jsonOk({
      schema_version: '1.0',
      tenant: {
        id: tenant.id,
        slug: tenant.slug,
        name: tenant.name,
        endpoint: tenant.mcp_endpoint,
      },
      resources: ['form://{formId}', 'session://{sessionId}', 'submission://{submissionId}'],
      tools: [
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
      ],
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function handleMcpPost(request: Request, tenantSlug?: string) {
  try {
    const { tenant } = authenticateApiKey(request.headers.get('authorization'));
    requireSlugMatchesAuthenticatedTenant(tenant, tenantSlug);
    const body = McpRequestSchema.parse(await request.json());
    if (body.kind === 'capabilities') {
      return jsonOk({ forms: listForms(tenant.id), schema_version: '1.0', tenant });
    }
    if (body.kind === 'resource') {
      return jsonOk({ resource: readResource(body.uri, tenant.id) });
    }
    return jsonOk({ result: await callTool(body.name, body.arguments, tenant.id) });
  } catch (error) {
    return jsonError(error);
  }
}

function readResource(uri: string, tenantId: string) {
  const formMatch = uri.match(/^form:\/\/([^/]+)$/);
  if (formMatch?.[1]) return getForm(formMatch[1], tenantId);
  const sessionMatch = uri.match(/^session:\/\/([^/]+)$/);
  if (sessionMatch?.[1]) return getSession(sessionMatch[1], tenantId);
  const submissionMatch = uri.match(/^submission:\/\/([^/]+)$/);
  if (submissionMatch?.[1]) return getSubmission(submissionMatch[1], tenantId);
  throw publicError('INVALID_INPUT', 'Unsupported resource URI.', 400);
}

async function callTool(name: string, args: Record<string, unknown>, tenantId: string) {
  if (name === 'create_form') return createForm(args, tenantId);
  if (name === 'publish_form') return publishForm(stringArg(args, 'form_id'), tenantId);
  if (name === 'start_session') return startSession(stringArg(args, 'form_id'), optionalStringArg(args, 'respondent_id'), tenantId);
  if (name === 'get_next_step') return getNextStep(stringArg(args, 'session_id'), tenantId);
  if (name === 'submit_answer') {
    return submitAnswer(stringArg(args, 'session_id'), {
      field_id: stringArg(args, 'field_id'),
      value: args.value,
      idempotency_key: optionalStringArg(args, 'idempotency_key'),
    }, 'agent', tenantId);
  }
  if (name === 'upload_answer_artifact') {
    return createArtifactUpload({
      session_id: stringArg(args, 'session_id'),
      field_id: stringArg(args, 'field_id'),
      filename: stringArg(args, 'filename'),
      content_type: stringArg(args, 'content_type'),
      size_bytes: numberArg(args, 'size_bytes'),
      duration_seconds: optionalNumberArg(args, 'duration_seconds'),
    }, tenantId);
  }
  if (name === 'pause_session') return pauseSession(stringArg(args, 'session_id'), tenantId);
  if (name === 'resume_session') return resumeSession(stringArg(args, 'session_id'), tenantId);
  if (name === 'complete_session') return completeSession(stringArg(args, 'session_id'), tenantId);
  if (name === 'get_submission') return getSubmission(stringArg(args, 'submission_id'), tenantId);
  if (name === 'request_human_review') {
    return {
      status: 'queued',
      message: 'Human review queue is stubbed and scoped to the tenant.',
      tenant_id: tenantId,
      session_id: optionalStringArg(args, 'session_id'),
    };
  }
  throw publicError('INVALID_INPUT', 'Unsupported MCP tool.', 400);
}

function stringArg(args: Record<string, unknown>, key: string) {
  const value = args[key];
  if (typeof value !== 'string' || value.length === 0) {
    throw publicError('INVALID_INPUT', `${key} is required.`, 400, key);
  }
  return value;
}

function optionalStringArg(args: Record<string, unknown>, key: string) {
  const value = args[key];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function numberArg(args: Record<string, unknown>, key: string) {
  const value = args[key];
  if (typeof value !== 'number') {
    throw publicError('INVALID_INPUT', `${key} is required.`, 400, key);
  }
  return value;
}

function optionalNumberArg(args: Record<string, unknown>, key: string) {
  const value = args[key];
  return typeof value === 'number' ? value : undefined;
}
