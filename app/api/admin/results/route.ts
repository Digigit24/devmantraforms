import { NextRequest } from 'next/server';
import { checkBasicAuth, unauthorizedResponse, corsHeaders, optionsResponse, errorResponse } from '@/lib/admin-auth';
import { adminGetResults } from '@/lib/admin-db';

const VALID_TIERS = ['idea_stage', 'seed_ready_with_gaps', 'series_a_fundable', 'top_decile'];

export async function OPTIONS() {
  return optionsResponse();
}

export async function GET(request: NextRequest) {
  if (!checkBasicAuth(request)) return unauthorizedResponse();

  try {
    const { searchParams } = new URL(request.url);
    const page  = Math.max(1, parseInt(searchParams.get('page')  ?? '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20')));
    const tierParam = searchParams.get('tier') ?? undefined;

    if (tierParam && !VALID_TIERS.includes(tierParam)) {
      return Response.json(
        { error: `Invalid tier. Must be one of: ${VALID_TIERS.join(', ')}` },
        { status: 400, headers: corsHeaders() }
      );
    }

    const { data, total } = await adminGetResults(page, limit, tierParam);

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
    console.error('[admin/results]', err);
    return errorResponse('Internal server error');
  }
}
