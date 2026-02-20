import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json({
      status: 'ok',
      db: 'ok',
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('GET /api/health error:', error);
    return NextResponse.json(
      {
        status: 'error',
        db: 'down',
        checkedAt: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
