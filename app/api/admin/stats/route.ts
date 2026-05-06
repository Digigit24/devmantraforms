import { NextRequest } from 'next/server';
import { checkBasicAuth, unauthorizedResponse, corsHeaders, optionsResponse, errorResponse } from '@/lib/admin-auth';
import { adminGetStats } from '@/lib/admin-db';

export async function OPTIONS() {
  return optionsResponse();
}

export async function GET(request: NextRequest) {
  if (!checkBasicAuth(request)) return unauthorizedResponse();

  try {
    const stats = await adminGetStats();
    return Response.json(stats, { headers: corsHeaders() });
  } catch (err) {
    console.error('[admin/stats]', err);
    return errorResponse('Internal server error');
  }
}
