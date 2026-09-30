import { publicError } from '@/lib/agentic-forms/errors';
import { jsonError, jsonOk } from '@/lib/agentic-forms/http';
import { uploadArtifactDirect } from '@/lib/agentic-forms/storage';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const file = formData.get('file');
    if (!(file instanceof File)) {
      throw publicError('INVALID_INPUT', 'A file is required.', 400, 'file');
    }

    const sessionId = formData.get('session_id');
    if (typeof sessionId !== 'string' || !sessionId) {
      throw publicError('INVALID_INPUT', 'session_id is required.', 400, 'session_id');
    }

    const fieldId = formData.get('field_id');
    if (typeof fieldId !== 'string' || !fieldId) {
      throw publicError('INVALID_INPUT', 'field_id is required.', 400, 'field_id');
    }

    let durationSeconds: number | undefined;
    const durationRaw = formData.get('duration_seconds');
    if (typeof durationRaw === 'string' && durationRaw !== '') {
      const parsed = Number(durationRaw);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        throw publicError('INVALID_INPUT', 'duration_seconds must be a positive number.', 400, 'duration_seconds');
      }
      durationSeconds = parsed;
    }

    const result = await uploadArtifactDirect({
      session_id: sessionId,
      field_id: fieldId,
      file,
      duration_seconds: durationSeconds,
    });
    return jsonOk(result, 201);
  } catch (error) {
    return jsonError(error);
  }
}
