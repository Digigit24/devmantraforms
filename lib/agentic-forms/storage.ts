import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { CreateArtifactUploadInputSchema, type FormField } from './schema';
import { publicError } from './errors';
import { createEvent, createId, getRepository, now } from './store';
import type { ArtifactRecord, ArtifactUpload, DirectArtifactUpload } from './types';

const UPLOAD_EXPIRES_IN_SECONDS = 900;

interface StorageConfig {
  endpoint?: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle: boolean;
  publicBaseUrl?: string;
}

// Browser uploads for file_upload/video_response fields go through this server, not
// directly to Zata — see uploadArtifactDirect(). These limits are the buffered-upload
// safety net: request.formData() holds the whole file in memory for the duration of the
// request, so the hard ceilings deliberately stay well short of what a true streaming
// upload could support. A field's own validation.max_file_mb, when smaller, still wins.
interface UploadTypeRules {
  extensions: string[];
  mimeTypes: string[];
  defaultMaxMb: number;
  hardMaxMb: number;
}

const FILE_UPLOAD_RULES: UploadTypeRules = {
  extensions: ['pdf', 'doc', 'docx', 'png', 'jpg', 'jpeg', 'webp'],
  mimeTypes: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/png',
    'image/jpeg',
    'image/webp',
  ],
  defaultMaxMb: 20,
  hardMaxMb: 50,
};

const VIDEO_RESPONSE_RULES: UploadTypeRules = {
  extensions: ['webm', 'mp4', 'mov'],
  mimeTypes: ['video/webm', 'video/mp4', 'video/quicktime'],
  defaultMaxMb: 50,
  hardMaxMb: 100,
};

// Some browsers report a generic/empty content type for otherwise-normal uploads (most
// notably video/QuickTime .mov files, and any file served from a source that didn't set
// one). The extension check above already ran and passed by this point, so falling back
// to trust it here — only for this specific generic case, never for a mismatched but
// specific MIME type — is a deliberate, narrow allowance, not a bypass.
const GENERIC_MIME_FALLBACKS = new Set(['', 'application/octet-stream']);

export async function createArtifactUpload(input: unknown, tenantId?: string): Promise<ArtifactUpload> {
  const data = CreateArtifactUploadInputSchema.parse(input);
  const config = getStorageConfig();
  const repo = getRepository();
  const session = tenantId ? repo.getSessionForTenant(data.session_id, tenantId) : repo.getSession(data.session_id);
  if (!session) throw publicError('NOT_FOUND', 'Session was not found.', 404);
  const key = buildArtifactKey(session.form_id, data.session_id, data.field_id, data.filename);
  const artifact: ArtifactRecord = {
    id: createId('art'),
    tenant_id: session.tenant_id,
    session_id: data.session_id,
    field_id: data.field_id,
    filename: data.filename,
    content_type: data.content_type,
    size_bytes: data.size_bytes,
    duration_seconds: data.duration_seconds,
    bucket: config.bucket,
    key,
    url: config.publicBaseUrl ? `${config.publicBaseUrl.replace(/\/$/, '')}/${key}` : undefined,
    status: 'upload_pending',
    created_at: now(),
  };

  const command = new PutObjectCommand({
    Bucket: config.bucket,
    Key: key,
    ContentType: data.content_type,
    ContentLength: data.size_bytes,
    Metadata: {
      artifact_id: artifact.id,
      session_id: data.session_id,
      field_id: data.field_id,
    },
  });
  const uploadUrl = await getSignedUrl(createS3Client(config), command, { expiresIn: UPLOAD_EXPIRES_IN_SECONDS });
  repo.saveArtifact(artifact);
  session.events.push(createEvent(session.id, 'artifact_upload_created', {
    field_id: data.field_id,
    filename: data.filename,
  }, {
    artifact_id: artifact.id,
    bucket: artifact.bucket,
    key: artifact.key,
  }));
  repo.saveSession({ ...session, updated_at: now() });

  return {
    artifact,
    upload: {
      method: 'PUT',
      url: uploadUrl,
      headers: { 'Content-Type': data.content_type },
      expires_in_seconds: UPLOAD_EXPIRES_IN_SECONDS,
    },
  };
}

export interface UploadArtifactDirectInput {
  session_id: string;
  field_id: string;
  file: File;
  duration_seconds?: number;
}

// Browser upload path: browser -> multipart/form-data -> this function -> Zata,
// server-side. Replaces the presigned-PUT flow for the public form UI, which hit Zata's
// CORS restrictions on cross-origin PUT. createArtifactUpload() above is untouched and
// still serves MCP's upload_answer_artifact tool, which has no way to stream file bytes
// through a JSON-RPC call and reasonably needs a URL for the agent to PUT to instead.
export async function uploadArtifactDirect(input: UploadArtifactDirectInput, tenantId?: string): Promise<DirectArtifactUpload> {
  const { session_id, field_id, file, duration_seconds } = input;
  const repo = getRepository();

  const session = tenantId ? repo.getSessionForTenant(session_id, tenantId) : repo.getSession(session_id);
  if (!session) throw publicError('NOT_FOUND', 'Session was not found.', 404);

  const version = repo.getVersion(session.form_version_id);
  if (!version) throw publicError('NOT_FOUND', 'Form version was not found.', 404);

  const field = version.schema.fields.find((candidate) => candidate.id === field_id);
  if (!field) throw publicError('INVALID_INPUT', 'Unknown field id.', 400, field_id);
  if (field.type !== 'file_upload' && field.type !== 'video_response') {
    throw publicError('INVALID_INPUT', 'This field does not accept file uploads.', 400, field_id);
  }

  const filename = file.name || 'upload';
  const rules = field.type === 'file_upload' ? FILE_UPLOAD_RULES : VIDEO_RESPONSE_RULES;
  const extension = getExtension(filename);
  if (!extension || !rules.extensions.includes(extension)) {
    throw publicError(
      'INVALID_INPUT',
      `Unsupported file extension. Allowed: ${rules.extensions.join(', ')}.`,
      400,
      field_id,
    );
  }

  const mimeType = file.type || '';
  if (!rules.mimeTypes.includes(mimeType) && !GENERIC_MIME_FALLBACKS.has(mimeType)) {
    throw publicError('INVALID_INPUT', `Unsupported file type "${mimeType}".`, 400, field_id);
  }

  if (file.size <= 0) {
    throw publicError('INVALID_INPUT', 'The uploaded file is empty.', 400, field_id);
  }
  const effectiveMaxBytes = resolveEffectiveMaxBytes(rules, field);
  if (file.size > effectiveMaxBytes) {
    throw publicError(
      'INVALID_INPUT',
      `File exceeds the ${Math.floor(effectiveMaxBytes / (1024 * 1024))} MB limit for this field.`,
      400,
      field_id,
    );
  }

  if (
    field.type === 'video_response' &&
    field.validation.max_duration_seconds &&
    duration_seconds &&
    duration_seconds > field.validation.max_duration_seconds
  ) {
    throw publicError(
      'INVALID_INPUT',
      `Video exceeds ${field.validation.max_duration_seconds} seconds.`,
      400,
      field_id,
    );
  }

  const config = getStorageConfig();
  const key = buildArtifactKey(session.form_id, session_id, field_id, filename);
  const contentType = mimeType || 'application/octet-stream';
  const buffer = Buffer.from(await file.arrayBuffer());
  const artifactId = createId('art');

  // TEMPORARY diagnostics — remove once the production Zata PutObject failure is root
  // caused. Logs request context and the real SDK error shape to PM2 logs; never logs
  // credentials, signed headers, or file contents.
  console.info('[uploadArtifactDirect] request', {
    bucket: config.bucket,
    endpoint: config.endpoint,
    region: config.region,
    forcePathStyle: config.forcePathStyle,
    key,
    contentType,
    sizeBytes: buffer.byteLength,
  });

  // Only persist the artifact once the upload to Zata has actually succeeded — a
  // partial/failed PutObject must never leave a misleading "uploaded" row behind.
  try {
    await createS3Client(config).send(new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      ContentLength: buffer.byteLength,
    }));
  } catch (error) {
    // TEMPORARY diagnostics — see comment above.
    const err = error as {
      name?: string;
      message?: string;
      Code?: string;
      code?: string;
      $metadata?: { httpStatusCode?: number; requestId?: string; extendedRequestId?: string };
    };
    console.error('[uploadArtifactDirect] S3 PutObject failed', {
      name: err?.name,
      message: err?.message,
      code: err?.Code ?? err?.code,
      httpStatusCode: err?.$metadata?.httpStatusCode,
      requestId: err?.$metadata?.requestId,
      extendedRequestId: err?.$metadata?.extendedRequestId,
    });
    throw publicError('PROVIDER_UNAVAILABLE', 'Failed to upload the file to storage. Please try again.', 502, field_id);
  }

  const artifact: ArtifactRecord = {
    id: artifactId,
    tenant_id: session.tenant_id,
    session_id,
    field_id,
    filename,
    content_type: contentType,
    size_bytes: buffer.byteLength,
    duration_seconds,
    bucket: config.bucket,
    key,
    url: config.publicBaseUrl ? `${config.publicBaseUrl.replace(/\/$/, '')}/${key}` : undefined,
    status: 'uploaded',
    created_at: now(),
  };
  repo.saveArtifact(artifact);
  session.events.push(createEvent(session.id, 'artifact_upload_created', {
    field_id,
    filename,
  }, {
    artifact_id: artifact.id,
    bucket: artifact.bucket,
    key: artifact.key,
  }));
  repo.saveSession({ ...session, updated_at: now() });

  return { artifact };
}

function resolveEffectiveMaxBytes(rules: UploadTypeRules, field: FormField): number {
  const hardMaxBytes = rules.hardMaxMb * 1024 * 1024;
  const defaultMaxBytes = rules.defaultMaxMb * 1024 * 1024;
  const fieldMaxBytes = field.validation.max_file_mb ? field.validation.max_file_mb * 1024 * 1024 : undefined;
  return Math.min(fieldMaxBytes ?? defaultMaxBytes, hardMaxBytes);
}

function getExtension(filename: string): string | null {
  const match = /\.([a-zA-Z0-9]+)$/.exec(filename);
  return match ? match[1].toLowerCase() : null;
}

export function getArtifact(artifactId: string, tenantId?: string): ArtifactRecord {
  const repo = getRepository();
  const artifact = tenantId ? repo.getArtifactForTenant(artifactId, tenantId) : repo.getArtifact(artifactId);
  if (!artifact) throw publicError('NOT_FOUND', 'Artifact was not found.', 404);
  return artifact;
}

export function markArtifactAttached(artifactId: string) {
  const repo = getRepository();
  const artifact = getArtifact(artifactId);
  const next: ArtifactRecord = { ...artifact, status: 'attached' };
  repo.saveArtifact(next);
  return next;
}

function getStorageConfig(): StorageConfig {
  const bucket = process.env.S3_BUCKET;
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
  if (!bucket || !accessKeyId || !secretAccessKey) {
    throw publicError(
      'PROVIDER_UNAVAILABLE',
      'S3 storage is not configured. Set S3_BUCKET, S3_ACCESS_KEY_ID, and S3_SECRET_ACCESS_KEY.',
      503,
    );
  }
  return {
    bucket,
    accessKeyId,
    secretAccessKey,
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION ?? 'auto',
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
    publicBaseUrl: process.env.S3_PUBLIC_BASE_URL,
  };
}

function createS3Client(config: StorageConfig) {
  return new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    forcePathStyle: config.forcePathStyle,
    // Recent AWS SDK v3 versions default to sending flexible-checksum trailer headers
    // (e.g. x-amz-checksum-crc32) on every upload. Many S3-compatible providers — Zata
    // included — don't handle these correctly, causing otherwise-inexplicable upload
    // failures. WHEN_REQUIRED restores the older behavior of only sending/validating
    // checksums when the operation actually requires one. Signing stays standard SigV4,
    // the SDK default.
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
}

function buildArtifactKey(formId: string, sessionId: string, fieldId: string, filename: string) {
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `forms/${formId}/sessions/${sessionId}/${fieldId}/${Date.now()}-${safeName}`;
}
