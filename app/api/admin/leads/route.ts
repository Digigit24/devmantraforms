import { NextRequest } from 'next/server';
import { checkBasicAuth, unauthorizedResponse, corsHeaders, optionsResponse, errorResponse } from '@/lib/admin-auth';
import { adminGetLeads } from '@/lib/admin-db';

export async function OPTIONS() {
  return optionsResponse();
}

export async function GET(request: NextRequest) {
  if (!checkBasicAuth(request)) return unauthorizedResponse();

  try {
    const { searchParams } = new URL(request.url);
    const page  = Math.max(1, parseInt(searchParams.get('page')  ?? '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20')));

    const { data, total } = await adminGetLeads(page, limit);

    return Response.json(
      {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        data,
      },
      { headers: corsHeaders() }
    );
  } catch (err) {
    console.error('[admin/leads]', err);
    return errorResponse('Internal server error');
  }
}
