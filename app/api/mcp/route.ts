import { handleMcpTransportRequest } from '@/lib/agentic-forms/mcp-server';

// The real, standards-compatible MCP endpoint. Every request must carry
// `Authorization: Bearer <tenant-api-key>` — tenant identity always comes from that key,
// never from this URL. See lib/agentic-forms/mcp-server.ts for the full auth/transport
// flow, and lib/agentic-forms/mcp-http.ts for the legacy custom-shim helpers, which are no
// longer routed anywhere and are kept only as a plain function-level utility with its own
// tests.
export async function GET(request: Request) {
  return handleMcpTransportRequest(request);
}

export async function POST(request: Request) {
  return handleMcpTransportRequest(request);
}

export async function DELETE(request: Request) {
  return handleMcpTransportRequest(request);
}
