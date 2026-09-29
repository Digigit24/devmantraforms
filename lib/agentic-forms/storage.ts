import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { CreateArtifactUploadInputSchema } from './schema';
import { publicError } from './errors';
import { createEvent, createId, getRepository, now } from './store';
import type { ArtifactRecord, ArtifactUpload } from './types';

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

export async function createArtifactUpload(input: unknown): Promise<ArtifactUpload> {
  const data = CreateArtifactUploadInputSchema.parse(input);
  const config = getStorageConfig();
  const repo = getRepository();
  const session = repo.getSession(data.session_id);
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

export function getArtifact(artifactId: string): ArtifactRecord {
  const artifact = getRepository().getArtifact(artifactId);
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
