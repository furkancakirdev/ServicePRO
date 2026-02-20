import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/api-auth';
import { JOB_AUDIT_EVENTS, writeAuditEvent } from '@/lib/audit/events';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const auth = await requireAuth(request, ['ADMIN', 'YETKILI']);
    if (!auth.ok) return auth.response;

    const updatedCount = await prisma.$transaction(async (tx) => {
      const updated = await tx.notification.updateMany({
        where: {
          userId: auth.payload.userId,
          status: 'YENI',
        },
        data: {
          status: 'OKUNDU',
          readAt: new Date(),
        },
      });

      await writeAuditEvent(tx, {
        organizationId: 'org_default',
        userId: auth.payload.userId,
        userEmail: auth.payload.email,
        islemTuru: JOB_AUDIT_EVENTS.NOTIFICATIONS_MARKED_READ_ALL,
        entityTipi: 'Notification',
        detay: `Tum bildirimler okundu: count=${updated.count}`,
      });

      return updated.count;
    });

    return NextResponse.json({
      success: true,
      updatedCount,
    });
  } catch (error) {
    console.error('POST /api/notifications/read-all error:', error);
    return NextResponse.json({ error: 'Tum bildirimler okundu yapilamadi' }, { status: 500 });
  }
}
