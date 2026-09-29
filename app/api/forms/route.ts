import { jsonError, jsonOk } from '@/lib/agentic-forms/http';
import { createForm, listForms } from '@/lib/agentic-forms/runtime';

export async function GET() {
  try {
    return jsonOk({ forms: listForms() });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    return jsonOk({ form: createForm(body) }, 201);
  } catch (error) {
    return jsonError(error);
  }
}

