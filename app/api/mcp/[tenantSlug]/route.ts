import { handleMcpPost, mcpCapabilities } from '@/lib/agentic-forms/mcp-http';

interface RouteContext {
  params: Promise<{ tenantSlug: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  const { tenantSlug } = await context.params;
  return mcpCapabilities(request, tenantSlug);
}

export async function POST(request: Request, context: RouteContext) {
  const { tenantSlug } = await context.params;
  return handleMcpPost(request, tenantSlug);
}
