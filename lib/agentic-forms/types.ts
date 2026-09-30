import type { AnswerValue, FormField, FormPolicy, FormSchemaDefinition } from './schema';

export type PublicErrorCode =
  | 'INVALID_INPUT'
  | 'NOT_FOUND'
  | 'FORM_NOT_PUBLISHED'
  | 'SESSION_CONFLICT'
  | 'CONSENT_REQUIRED'
  | 'FORBIDDEN'
  | 'PROVIDER_UNAVAILABLE';

export interface PublicError {
  code: PublicErrorCode;
  message: string;
  field?: string;
  details?: Record<string, unknown>;
}

export interface FormRecord {
  id: string;
  tenant_id: string;
  owner_id: string;
  status: 'draft' | 'published' | 'archived';
  draft: FormSchemaDefinition;
  current_version_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface TenantRecord {
  id: string;
  slug: string;
  name: string;
  plan: 'local' | 'team' | 'enterprise';
  mcp_endpoint: string;
  api_key_hint: string;
  created_at: string;
}

// A tenant's MCP API key. Only key_hash (a SHA-256 digest) is ever persisted or compared —
// the plaintext key exists only at generation time, returned once to the caller and never
// stored. key_prefix/key_hint are safe-to-display metadata (e.g. "cfmcp_...ab12").
export interface TenantApiKeyRecord {
  id: string;
  tenant_id: string;
  key_prefix: string;
  key_hint: string;
  key_hash: string;
  created_at: string;
  revoked_at?: string;
  last_used_at?: string;
}

export interface FormVersionRecord {
  id: string;
  form_id: string;
  version: number;
  schema_version: '1.0';
  schema: FormSchemaDefinition;
  created_at: string;
}

export interface SessionAnswer {
  field_id: string;
  value: AnswerValue;
  answered_at: string;
  source: 'human' | 'agent';
}

export interface SessionEvent {
  id: string;
  session_id: string;
  type:
    | 'session_started'
    | 'artifact_upload_created'
    | 'answer_submitted'
    | 'session_paused'
    | 'session_resumed'
    | 'session_completed';
  schema_version: '1.0';
  input?: Record<string, unknown>;
  result?: Record<string, unknown>;
  created_at: string;
}

export interface ArtifactRecord {
  id: string;
  tenant_id: string;
  session_id: string;
  field_id: string;
  filename: string;
  content_type: string;
  size_bytes: number;
  duration_seconds?: number;
  bucket: string;
  key: string;
  url?: string;
  status: 'upload_pending' | 'uploaded' | 'attached';
  created_at: string;
}

export interface ArtifactUpload {
  artifact: ArtifactRecord;
  upload: {
    method: 'PUT';
    url: string;
    headers: Record<string, string>;
    expires_in_seconds: number;
  };
}

export interface SessionRecord {
  id: string;
  tenant_id: string;
  form_id: string;
  form_version_id: string;
  status: 'awaiting_answer' | 'paused' | 'completed';
  answers: SessionAnswer[];
  events: SessionEvent[];
  respondent_id?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface SubmissionRecord {
  id: string;
  tenant_id: string;
  session_id: string;
  form_id: string;
  form_version_id: string;
  answers: SessionAnswer[];
  created_at: string;
}

export interface NextStepQuestion {
  id: string;
  type: FormField['type'];
  prompt: string;
  description?: string;
  required: boolean;
  options?: FormField['options'];
  validation: FormField['validation'];
}

export interface NextStepResponse {
  session_id: string;
  schema_version: '1.0';
  status: SessionRecord['status'];
  step: NextStepQuestion | { type: 'completion'; prompt: string };
  allowed_answer_types: Array<'text' | 'file' | 'video'>;
  consent?: { recording_required: boolean };
}

export interface PublishedFormView {
  id: string;
  tenant_id: string;
  status: FormRecord['status'];
  current_version: FormVersionRecord | null;
  draft: FormSchemaDefinition;
  policy: FormPolicy;
}
