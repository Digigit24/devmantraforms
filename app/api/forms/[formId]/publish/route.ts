import { jsonError, jsonOk } from '@/lib/agentic-forms/http';
import { publishForm } from '@/lib/agentic-forms/runtime';

interface RouteContext {
  params: Promise<{ formId: string }>;
}

export async function POST(_request: Request, context: RouteContext) {
  try {
    const { formId } = await context.params;
    return jsonOk({ form: publishForm(formId) });
  } catch (error) {
    return jsonError(error);
  }
}

