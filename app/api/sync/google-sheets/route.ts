import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/api-auth';

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
      'x-deprecated-route': '/api/sync/google-sheets',
      'x-canonical-route': '/api/sync',
    },
  });
}

export async function POST(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');

  if (cronSecret) {
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  } else {
    const auth = await requireAuth(request, ['ADMIN']);
    if (!auth.ok) return auth.response;
  }

  const url = new URL('/api/cron/sync', request.url);
  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      authorization: authHeader || '',
    },
    cache: 'no-store',
  });

  const body = await response.text();
  return new NextResponse(body, {
    status: response.status,
    headers: {
      'content-type': response.headers.get('content-type') || 'application/json',
      'x-deprecated-route': '/api/sync/google-sheets',
      'x-canonical-route': '/api/cron/sync',
    },
  });
}
