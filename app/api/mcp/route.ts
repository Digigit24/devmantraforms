import { handleMcpPost, mcpCapabilities } from '@/lib/agentic-forms/mcp-http';

export async function GET(request: Request) {
  return mcpCapabilities(request);
}

export async function POST(request: Request) {
  return handleMcpPost(request);
}
