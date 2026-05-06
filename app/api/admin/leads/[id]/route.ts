import { NextRequest } from 'next/server';
import { checkBasicAuth, unauthorizedResponse, corsHeaders, optionsResponse, errorResponse } from '@/lib/admin-auth';
import { adminGetLeadById } from '@/lib/admin-db';

export async function OPTIONS() {
  return optionsResponse();
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!checkBasicAuth(request)) return unauthorizedResponse();

  try {
    const { id } = await params;
    const lead = await adminGetLeadById(id);

    if (!lead) {
      return Response.json({ error: 'Lead not found' }, { status: 404, headers: corsHeaders() });
    }

    return Response.json(lead, { headers: corsHeaders() });
  } catch (err) {
    console.error('[admin/leads/[id]]', err);
    return errorResponse('Internal server error');
  }
}
