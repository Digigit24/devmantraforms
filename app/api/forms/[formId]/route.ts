import { jsonError, jsonOk } from '@/lib/agentic-forms/http';
import { getForm, resolveAdminTenant, updateForm } from '@/lib/agentic-forms/runtime';

interface RouteContext {
  params: Promise<{ formId: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { formId } = await context.params;
    const tenantSlug = new URL(request.url).searchParams.get('tenant');
    const tenant = resolveAdminTenant(tenantSlug);
    return jsonOk({ form: getForm(formId, tenant.id) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { formId } = await context.params;
    const tenantSlug = new URL(request.url).searchParams.get('tenant');
    const tenant = resolveAdminTenant(tenantSlug);
    const body = await request.json();
    return jsonOk({ form: updateForm(formId, body, tenant.id) });
  } catch (error) {
    return jsonError(error);
  }
}
