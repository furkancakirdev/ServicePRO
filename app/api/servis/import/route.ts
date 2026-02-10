import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/api-auth';

/**
 * Deprecated import route.
 * Canonical synchronization endpoint: POST /api/sync
 */

export async function GET(request: Request) {
  const auth = await requireAuth(request, ['ADMIN', 'YETKILI']);
  if (!auth.ok) return auth.response;

  return NextResponse.json(
    {
      deprecated: true,
      message: 'This endpoint is deprecated. Use POST /api/sync.',
      canonical: '/api/sync',
    },
    { status: 410 }
  );
}

export async function POST(request: Request) {
  const auth = await requireAuth(request, ['ADMIN']);
  if (!auth.ok) return auth.response;

  return NextResponse.json(
    {
      deprecated: true,
      message: 'This endpoint is deprecated. Use POST /api/sync with mode/sheet params.',
      canonical: '/api/sync',
    },
    { status: 410 }
  );
}

