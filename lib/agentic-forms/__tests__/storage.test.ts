import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockSend = vi.fn();

vi.mock('@aws-sdk/client-s3', async () => {
  const actual = await vi.importActual<typeof import('@aws-sdk/client-s3')>('@aws-sdk/client-s3');
  return {
    ...actual,
    S3Client: vi.fn().mockImplementation(function S3ClientMock() {
      return { send: mockSend };
    }),
  };
});

import { AgenticFormError } from '@/lib/agentic-forms/errors';
import { createTenantWithApiKey } from '@/lib/agentic-forms/auth';
import { createForm, getSession, publishForm, startSession } from '@/lib/agentic-forms/runtime';
import { getArtifact, uploadArtifactDirect } from '@/lib/agentic-forms/storage';
import type { PublicErrorCode } from '@/lib/agentic-forms/types';
import { resetStore } from './helpers';

const uploadForm = {
  title: 'Portfolio Form',
  fields: [
    { id: 'resume', type: 'file_upload', label: 'Resume', required: true, validation: {} },
    { id: 'intro', type: 'video_response', label: 'Intro video', required: false, validation: {} },
    { id: 'name', type: 'short_text', label: 'Name', required: false, validation: {} },
  ],
};

function makeFile(name: string, type: string, sizeBytes: number): File {
  return new File([new Uint8Array(sizeBytes).fill(1)], name, { type });
}

function startFormSession(tenantId?: string) {
  const form = publishForm(createForm(uploadForm, tenantId).id, tenantId);
  const session = startSession(form.id, undefined, tenantId);
  return { form, session };
}

async function expectAsyncPublicError(action: () => Promise<unknown>, code: PublicErrorCode, status?: number) {
  let caught: unknown;
  try {
    await action();
  } catch (error) {
    caught = error;
  }
  expect(caught).toBeInstanceOf(AgenticFormError);
  const error = caught as AgenticFormError;
  expect(error.code).toBe(code);
  if (status !== undefined) expect(error.status).toBe(status);
  return error;
}

beforeEach(() => {
  resetStore();
  mockSend.mockReset();
  mockSend.mockResolvedValue({});
  vi.stubEnv('S3_BUCKET', 'test-bucket');
  vi.stubEnv('S3_ACCESS_KEY_ID', 'test-key');
  vi.stubEnv('S3_SECRET_ACCESS_KEY', 'test-secret');
  vi.stubEnv('S3_REGION', 'auto');
  vi.stubEnv('S3_FORCE_PATH_STYLE', 'true');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('uploadArtifactDirect: successful uploads', () => {
  it('uploads a valid file and persists artifact metadata', async () => {
    const { session } = startFormSession();
    const file = makeFile('resume.pdf', 'application/pdf', 1024);

    const result = await uploadArtifactDirect({ session_id: session.session_id, field_id: 'resume', file });

    expect(result.artifact.status).toBe('uploaded');
    expect(result.artifact.filename).toBe('resume.pdf');
    expect(result.artifact.content_type).toBe('application/pdf');
    expect(result.artifact.size_bytes).toBe(1024);
    expect(result.artifact.key).toMatch(/^forms\/.+\/sessions\/.+\/resume\/\d+-resume\.pdf$/);
    expect(mockSend).toHaveBeenCalledTimes(1);

    const persisted = getArtifact(result.artifact.id);
    expect(persisted.status).toBe('uploaded');
  });

  it('uploads a valid video with a duration and persists artifact metadata', async () => {
    const { session } = startFormSession();
    const file = makeFile('intro.mp4', 'video/mp4', 2048);

    const result = await uploadArtifactDirect({
      session_id: session.session_id,
      field_id: 'intro',
      file,
      duration_seconds: 30,
    });

    expect(result.artifact.content_type).toBe('video/mp4');
    expect(result.artifact.duration_seconds).toBe(30);
    expect(result.artifact.status).toBe('uploaded');
  });

  it('accepts a generic/empty MIME type when the extension is allowed (browser fallback)', async () => {
    const { session } = startFormSession();
    const file = makeFile('intro.mov', 'application/octet-stream', 1024);

    const result = await uploadArtifactDirect({ session_id: session.session_id, field_id: 'intro', file });
    expect(result.artifact.content_type).toBe('application/octet-stream');
  });

  it('records an artifact_upload_created event on the session', async () => {
    const { session } = startFormSession();
    const file = makeFile('resume.pdf', 'application/pdf', 1024);
    await uploadArtifactDirect({ session_id: session.session_id, field_id: 'resume', file });

    const events = getSession(session.session_id).events;
    expect(events.some((event) => event.type === 'artifact_upload_created')).toBe(true);
  });
});

describe('uploadArtifactDirect: rejections', () => {
  it('rejects a file over the hard size ceiling', async () => {
    const { session } = startFormSession();
    const file = makeFile('resume.pdf', 'application/pdf', 51 * 1024 * 1024);

    await expectAsyncPublicError(
      () => uploadArtifactDirect({ session_id: session.session_id, field_id: 'resume', file }),
      'INVALID_INPUT',
      400,
    );
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('rejects a video over the hard size ceiling', async () => {
    const { session } = startFormSession();
    const file = makeFile('intro.mp4', 'video/mp4', 101 * 1024 * 1024);

    await expectAsyncPublicError(
      () => uploadArtifactDirect({ session_id: session.session_id, field_id: 'intro', file }),
      'INVALID_INPUT',
      400,
    );
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('rejects an unsupported file extension', async () => {
    const { session } = startFormSession();
    const file = makeFile('resume.exe', 'application/octet-stream', 1024);

    await expectAsyncPublicError(
      () => uploadArtifactDirect({ session_id: session.session_id, field_id: 'resume', file }),
      'INVALID_INPUT',
      400,
    );
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('rejects an unsupported MIME type even with an allowed extension', async () => {
    const { session } = startFormSession();
    const file = makeFile('resume.pdf', 'text/plain', 1024);

    await expectAsyncPublicError(
      () => uploadArtifactDirect({ session_id: session.session_id, field_id: 'resume', file }),
      'INVALID_INPUT',
      400,
    );
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('rejects an empty file', async () => {
    const { session } = startFormSession();
    const file = makeFile('resume.pdf', 'application/pdf', 0);

    await expectAsyncPublicError(
      () => uploadArtifactDirect({ session_id: session.session_id, field_id: 'resume', file }),
      'INVALID_INPUT',
      400,
    );
  });

  it('rejects an invalid/unknown session', async () => {
    const file = makeFile('resume.pdf', 'application/pdf', 1024);

    await expectAsyncPublicError(
      () => uploadArtifactDirect({ session_id: 'sess_missing', field_id: 'resume', file }),
      'NOT_FOUND',
      404,
    );
  });

  it('rejects an unknown field id', async () => {
    const { session } = startFormSession();
    const file = makeFile('resume.pdf', 'application/pdf', 1024);

    await expectAsyncPublicError(
      () => uploadArtifactDirect({ session_id: session.session_id, field_id: 'does-not-exist', file }),
      'INVALID_INPUT',
      400,
    );
  });

  it('rejects a field that is not a file_upload/video_response type', async () => {
    const { session } = startFormSession();
    const file = makeFile('resume.pdf', 'application/pdf', 1024);

    await expectAsyncPublicError(
      () => uploadArtifactDirect({ session_id: session.session_id, field_id: 'name', file }),
      'INVALID_INPUT',
      400,
    );
  });
});

describe('uploadArtifactDirect: S3/Zata failure', () => {
  it('surfaces a clean error when the upload to storage fails', async () => {
    mockSend.mockRejectedValueOnce(new Error('connection reset'));
    const { session } = startFormSession();
    const file = makeFile('resume.pdf', 'application/pdf', 1024);

    await expectAsyncPublicError(
      () => uploadArtifactDirect({ session_id: session.session_id, field_id: 'resume', file }),
      'PROVIDER_UNAVAILABLE',
      502,
    );
  });

  it('does not persist an artifact or a session event when the storage upload fails', async () => {
    mockSend.mockRejectedValueOnce(new Error('connection reset'));
    const { session } = startFormSession();
    const eventsBefore = getSession(session.session_id).events.length;
    const file = makeFile('resume.pdf', 'application/pdf', 1024);

    await expectAsyncPublicError(
      () => uploadArtifactDirect({ session_id: session.session_id, field_id: 'resume', file }),
      'PROVIDER_UNAVAILABLE',
    );

    const eventsAfter = getSession(session.session_id).events.length;
    expect(eventsAfter).toBe(eventsBefore);
  });
});

describe('uploadArtifactDirect: tenant isolation', () => {
  it("rejects tenant B's attempt to upload against tenant A's session", async () => {
    const a = createTenantWithApiKey({ slug: 'upload-tenant-a', name: 'Upload Tenant A' });
    const b = createTenantWithApiKey({ slug: 'upload-tenant-b', name: 'Upload Tenant B' });
    const { session } = startFormSession(a.tenant.id);
    const file = makeFile('resume.pdf', 'application/pdf', 1024);

    await expectAsyncPublicError(
      () => uploadArtifactDirect({ session_id: session.session_id, field_id: 'resume', file }, b.tenant.id),
      'NOT_FOUND',
      404,
    );
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("stores the correct tenant_id on an artifact uploaded within a tenant's own session", async () => {
    const a = createTenantWithApiKey({ slug: 'upload-tenant-c', name: 'Upload Tenant C' });
    const { session } = startFormSession(a.tenant.id);
    const file = makeFile('resume.pdf', 'application/pdf', 1024);

    const result = await uploadArtifactDirect(
      { session_id: session.session_id, field_id: 'resume', file },
      a.tenant.id,
    );
    expect(result.artifact.tenant_id).toBe(a.tenant.id);
  });
});
