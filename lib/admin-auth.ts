const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
};

export function corsHeaders() {
  return CORS;
}

export function optionsResponse() {
  return new Response(null, { status: 204, headers: CORS });
}

export function checkBasicAuth(request: Request): boolean {
  const header = request.headers.get('authorization');
  if (!header?.startsWith('Basic ')) return false;

  const decoded = Buffer.from(header.slice(6), 'base64').toString('utf-8');
  const colonAt = decoded.indexOf(':');
  if (colonAt === -1) return false;

  const username = decoded.slice(0, colonAt);
  const password = decoded.slice(colonAt + 1);

  return (
    username === process.env.ADMIN_API_USERNAME &&
    password === process.env.ADMIN_API_PASSWORD
  );
}

export function unauthorizedResponse() {
  return Response.json(
    { error: 'Unauthorized' },
    {
      status: 401,
      headers: { ...CORS, 'WWW-Authenticate': 'Basic realm="Dev Mantra Admin"' },
    }
  );
}

export function errorResponse(message: string, status = 500) {
  return Response.json({ error: message }, { status, headers: CORS });
}
