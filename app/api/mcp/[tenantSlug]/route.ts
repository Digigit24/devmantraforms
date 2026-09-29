import { handleMcpTransportRequest } from '@/lib/agentic-forms/mcp-server';

// Tenant-slug-qualified form of the real MCP endpoint, kept for backward compatibility.
// The slug is never authorization by itself: the Bearer API key is authenticated first,
// and this slug must match the authenticated tenant's own slug or the request is rejected.
interface RouteContext {
  params: Promise<{ tenantSlug: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  const { tenantSlug } = await context.params;
  return handleMcpTransportRequest(request, tenantSlug);
}

export async function POST(request: Request, context: RouteContext) {
  const { tenantSlug } = await context.params;
  return handleMcpTransportRequest(request, tenantSlug);
}

export async function DELETE(request: Request, context: RouteContext) {
  const { tenantSlug } = await context.params;
  return handleMcpTransportRequest(request, tenantSlug);
}
