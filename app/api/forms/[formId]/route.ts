import { jsonError, jsonOk } from '@/lib/agentic-forms/http';
import { getForm, updateForm } from '@/lib/agentic-forms/runtime';

interface RouteContext {
  params: Promise<{ formId: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { formId } = await context.params;
    return jsonOk({ form: getForm(formId) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { formId } = await context.params;
    const body = await request.json();
    return jsonOk({ form: updateForm(formId, body) });
  } catch (error) {
    return jsonError(error);
  }
}

