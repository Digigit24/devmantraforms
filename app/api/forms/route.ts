import { jsonError, jsonOk } from '@/lib/agentic-forms/http';
import { createForm, listForms, resolveAdminTenant } from '@/lib/agentic-forms/runtime';

export async function GET(request: Request) {
  try {
    const tenantSlug = new URL(request.url).searchParams.get('tenant');
    const tenant = resolveAdminTenant(tenantSlug);
    return jsonOk({ forms: listForms(tenant.id) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const tenantSlug = new URL(request.url).searchParams.get('tenant');
    const tenant = resolveAdminTenant(tenantSlug);
    const body = await request.json();
    return jsonOk({ form: createForm(body, tenant.id) }, 201);
  } catch (error) {
    return jsonError(error);
  }
}
