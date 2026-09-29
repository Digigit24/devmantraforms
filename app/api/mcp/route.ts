import { handleMcpPost, mcpCapabilities } from '@/lib/agentic-forms/mcp-http';

export async function GET() {
  return mcpCapabilities('demo');
}

export async function POST(request: Request) {
  return handleMcpPost(request, 'demo');
}
