import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/api-auth';
import { JOB_AUDIT_EVENTS, writeAuditEvent } from '@/lib/audit/events';
import { prisma } from '@/lib/prisma';

type RouteContext = {
  params: {
    id: string;
  };
};

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const auth = await requireAuth(request, ['ADMIN', 'YETKILI']);
    if (!auth.ok) return auth.response;

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.notification.findFirst({
        where: {
          id: params.id,
          userId: auth.payload.userId,
        },
      });

      if (!existing) {
        return { kind: 'NOT_FOUND' as const };
      }

      const updated =
        existing.status === 'YENI'
          ? await tx.notification.update({
              where: { id: existing.id },
              data: {
                status: 'OKUNDU',
                readAt: existing.readAt ?? new Date(),
              },
            })
          : existing;

      await writeAuditEvent(tx, {
        organizationId: 'org_default',
        userId: auth.payload.userId,
        userEmail: auth.payload.email,
        islemTuru: JOB_AUDIT_EVENTS.NOTIFICATION_MARKED_READ,
        entityTipi: 'Notification',
        entityId: existing.id,
        detay: `Bildirim okundu: ${existing.id}`,
      });

      return { kind: 'OK' as const, notification: updated };
    });

    if (result.kind === 'NOT_FOUND') {
      return NextResponse.json({ error: 'Bildirim bulunamadi' }, { status: 404 });
    }

    return NextResponse.json({
      id: result.notification.id,
      baslik: result.notification.baslik,
      mesaj: result.notification.mesaj,
      entityTipi: result.notification.entityTipi,
      entityId: result.notification.entityId,
      actionUrl: result.notification.actionUrl,
      status: result.notification.status,
      createdAt: result.notification.createdAt.toISOString(),
      readAt: result.notification.readAt ? result.notification.readAt.toISOString() : null,
    });
  } catch (error) {
    console.error('POST /api/notifications/[id]/read error:', error);
    return NextResponse.json({ error: 'Bildirim okundu yapilamadi' }, { status: 500 });
  }
}
