import { NextRequest, NextResponse } from 'next/server';

/**
 * Deprecated compatibility route.
 * Canonical endpoint: /api/sync
 */
export async function GET(request: NextRequest) {
  const url = new URL('/api/sync', request.url);
  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      authorization: request.headers.get('authorization') || '',
      cookie: request.headers.get('cookie') || '',
    },
    cache: 'no-store',
  });

  const body = await response.text();
  return new NextResponse(body, {
    status: response.status,
    headers: {
      'content-type': response.headers.get('content-type') || 'application/json',
      'x-deprecated-route': '/api/servis/sync',
      'x-canonical-route': '/api/sync',
    },
  });
}

export async function POST(request: NextRequest) {
  const url = new URL('/api/sync', request.url);
  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      authorization: request.headers.get('authorization') || '',
      cookie: request.headers.get('cookie') || '',
      'content-type': 'application/json',
    },
    body: await request.text(),
    cache: 'no-store',
  });

  const body = await response.text();
  return new NextResponse(body, {
    status: response.status,
    headers: {
      'content-type': response.headers.get('content-type') || 'application/json',
      'x-deprecated-route': '/api/servis/sync',
      'x-canonical-route': '/api/sync',
    },
  });
}
