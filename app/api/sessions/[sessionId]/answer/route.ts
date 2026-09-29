import { jsonError, jsonOk } from '@/lib/agentic-forms/http';
import { completeSession, getNextStep, pauseSession, resumeSession, submitAnswer } from '@/lib/agentic-forms/runtime';

interface RouteContext {
  params: Promise<{ sessionId: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { sessionId } = await context.params;
    return jsonOk({ next_step: getNextStep(sessionId) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { sessionId } = await context.params;
    const body = await request.json();
    return jsonOk({ next_step: submitAnswer(sessionId, body) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { sessionId } = await context.params;
    const body = await request.json() as { action?: string };
    if (body.action === 'pause') return jsonOk({ next_step: pauseSession(sessionId) });
    if (body.action === 'resume') return jsonOk({ next_step: resumeSession(sessionId) });
    if (body.action === 'complete') return jsonOk({ submission: completeSession(sessionId) });
    return jsonOk({ error: { code: 'INVALID_INPUT', message: 'Unsupported action.' } }, 400);
  } catch (error) {
    return jsonError(error);
  }
}

