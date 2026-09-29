import { jsonError, jsonOk } from '@/lib/agentic-forms/http';
import { publishForm, resolveAdminTenant } from '@/lib/agentic-forms/runtime';

interface RouteContext {
  params: Promise<{ formId: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { formId } = await context.params;
    const tenantSlug = new URL(request.url).searchParams.get('tenant');
    const tenant = resolveAdminTenant(tenantSlug);
    return jsonOk({ form: publishForm(formId, tenant.id) });
  } catch (error) {
    return jsonError(error);
  }
}
