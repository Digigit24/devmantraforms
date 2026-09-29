import { z } from 'zod';
import { jsonError, jsonOk } from '@/lib/agentic-forms/http';
import { getSession, startSession } from '@/lib/agentic-forms/runtime';

const StartSessionSchema = z.object({
  form_id: z.string().min(1),
  respondent_id: z.string().min(1).optional(),
});

export async function POST(request: Request) {
  try {
    const body = StartSessionSchema.parse(await request.json());
    return jsonOk({ next_step: startSession(body.form_id, body.respondent_id) }, 201);
  } catch (error) {
    return jsonError(error);
  }
}

export async function GET(request: Request) {
  try {
    const sessionId = new URL(request.url).searchParams.get('session_id');
    if (!sessionId) return jsonOk({ error: { code: 'INVALID_INPUT', message: 'session_id is required.' } }, 400);
    return jsonOk({ session: getSession(sessionId) });
  } catch (error) {
    return jsonError(error);
  }
}

