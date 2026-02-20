import { NotificationStatus } from '@prisma/client';
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/api-auth';
import { prisma } from '@/lib/prisma';

function parseStatus(raw: string | null): NotificationStatus | 'ALL' {
  const normalized = String(raw ?? 'ALL').trim().toUpperCase();
  if (normalized === 'YENI') return 'YENI';
  if (normalized === 'OKUNDU') return 'OKUNDU';
  if (normalized === 'ARSIV') return 'ARSIV';
  return 'ALL';
}

function parseLimit(raw: string | null): number {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return 50;
  return Math.max(1, Math.min(200, Math.trunc(parsed)));
}

export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request, ['ADMIN', 'YETKILI']);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const status = parseStatus(searchParams.get('status'));
    const limit = parseLimit(searchParams.get('limit'));

    const userId = auth.payload.userId;

    const notifications = await prisma.notification.findMany({
      where: {
        userId,
        ...(status === 'ALL' ? {} : { status }),
      },
      orderBy: [{ createdAt: 'desc' }],
      take: limit,
    });

    const [totalCount, unreadCount, readCount, archivedCount] = await Promise.all([
      prisma.notification.count({ where: { userId } }),
      prisma.notification.count({ where: { userId, status: 'YENI' } }),
      prisma.notification.count({ where: { userId, status: 'OKUNDU' } }),
      prisma.notification.count({ where: { userId, status: 'ARSIV' } }),
    ]);

    return NextResponse.json({
      notifications: notifications.map((item) => ({
        id: item.id,
        baslik: item.baslik,
        mesaj: item.mesaj,
        entityTipi: item.entityTipi,
        entityId: item.entityId,
        actionUrl: item.actionUrl,
        status: item.status,
        createdAt: item.createdAt.toISOString(),
        readAt: item.readAt ? item.readAt.toISOString() : null,
      })),
      summary: {
        totalCount,
        unreadCount,
        readCount,
        archivedCount,
      },
    });
  } catch (error) {
    console.error('GET /api/notifications error:', error);
    return NextResponse.json({ error: 'Bildirimler getirilemedi' }, { status: 500 });
  }
}
