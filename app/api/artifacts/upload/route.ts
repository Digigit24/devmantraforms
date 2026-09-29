import { jsonError, jsonOk } from '@/lib/agentic-forms/http';
import { createArtifactUpload } from '@/lib/agentic-forms/storage';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    return jsonOk({ artifact_upload: await createArtifactUpload(body) }, 201);
  } catch (error) {
    return jsonError(error);
  }
}

