import { z } from 'zod';
import { publicError } from './errors';
import { jsonError, jsonOk } from './http';
import {
  completeSession,
  createForm,
  getForm,
  getNextStep,
  getSession,
  getSubmission,
  getTenantBySlug,
  listForms,
  pauseSession,
  publishForm,
  resumeSession,
  startSession,
  submitAnswer,
} from './runtime';
import { createArtifactUpload } from './storage';

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

export function mcpCapabilities(tenantSlug = 'demo') {
  try {
    const tenant = getTenantBySlug(tenantSlug);
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

export async function handleMcpPost(request: Request, tenantSlug = 'demo') {
  try {
    const tenant = getTenantBySlug(tenantSlug);
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
  if (sessionMatch?.[1]) return getSession(sessionMatch[1]);
  const submissionMatch = uri.match(/^submission:\/\/([^/]+)$/);
  if (submissionMatch?.[1]) return getSubmission(submissionMatch[1]);
  throw publicError('INVALID_INPUT', 'Unsupported resource URI.', 400);
}

async function callTool(name: string, args: Record<string, unknown>, tenantId: string) {
  if (name === 'create_form') return createForm(args, tenantId);
  if (name === 'publish_form') return publishForm(stringArg(args, 'form_id'), tenantId);
  if (name === 'start_session') return startSession(stringArg(args, 'form_id'), optionalStringArg(args, 'respondent_id'), tenantId);
  if (name === 'get_next_step') return getNextStep(stringArg(args, 'session_id'));
  if (name === 'submit_answer') {
    return submitAnswer(stringArg(args, 'session_id'), {
      field_id: stringArg(args, 'field_id'),
      value: args.value,
      idempotency_key: optionalStringArg(args, 'idempotency_key'),
    }, 'agent');
  }
  if (name === 'upload_answer_artifact') {
    return createArtifactUpload({
      session_id: stringArg(args, 'session_id'),
      field_id: stringArg(args, 'field_id'),
      filename: stringArg(args, 'filename'),
      content_type: stringArg(args, 'content_type'),
      size_bytes: numberArg(args, 'size_bytes'),
      duration_seconds: optionalNumberArg(args, 'duration_seconds'),
    });
  }
  if (name === 'pause_session') return pauseSession(stringArg(args, 'session_id'));
  if (name === 'resume_session') return resumeSession(stringArg(args, 'session_id'));
  if (name === 'complete_session') return completeSession(stringArg(args, 'session_id'));
  if (name === 'get_submission') return getSubmission(stringArg(args, 'submission_id'));
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
