import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const now = new Date().toISOString();
  const version = process.env.APP_VERSION || process.env.npm_package_version || 'unknown';

  try {
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json({
      status: 'ok',
      db: 'ok',
      version,
      time: now,
      checkedAt: now,
    });
  } catch (error) {
    console.error('GET /health error:', error);
    return NextResponse.json(
      {
        status: 'error',
        db: 'down',
        version,
        time: now,
        checkedAt: now,
      },
      { status: 503 }
    );
  }
}
