import { NextResponse } from 'next/server';
import { NotificationChannel } from '@prisma/client';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/api-auth';
import { JOB_AUDIT_EVENTS, writeAuditEvent } from '@/lib/audit/events';
import { parseRuleConditionJson, stringifyRuleCondition } from '@/lib/alerts/evaluator';
import { prisma } from '@/lib/prisma';
import { ALERT_EVENT_TYPES, NOTIFICATION_CHANNEL_VALUES, type AlertEventType } from '@/types/alerts';

type RouteContext = {
  params: {
    id: string;
  };
};

const alertRuleUpdateSchema = z.object({
  ad: z.string().trim().min(3).max(120).optional(),
  aktif: z.boolean().optional(),
  eventTipi: z.enum(ALERT_EVENT_TYPES).optional(),
  kosulJson: z.string().trim().min(2).optional().nullable(),
  kosul: z.record(z.string(), z.unknown()).optional(),
  hedefRol: z.enum(['ADMIN', 'YETKILI']).optional().nullable(),
  hedefUserId: z.string().trim().min(1).optional().nullable(),
  kanal: z.enum(NOTIFICATION_CHANNEL_VALUES).optional(),
});

function mapRuleDto(rule: {
  id: string;
  ad: string;
  aktif: boolean;
  eventTipi: string;
  kosulJson: string;
  hedefRol: 'ADMIN' | 'YETKILI' | null;
  hedefUserId: string | null;
  kanal: NotificationChannel;
  createdAt: Date;
  updatedAt: Date;
  hedefUser?: {
    id: string;
    ad: string;
    email: string;
    role: 'ADMIN' | 'YETKILI';
  } | null;
}) {
  return {
    id: rule.id,
    ad: rule.ad,
    aktif: rule.aktif,
    eventTipi: rule.eventTipi as AlertEventType,
    kosulJson: rule.kosulJson,
    kosul: parseRuleConditionJson(rule.kosulJson),
    hedefRol: rule.hedefRol,
    hedefUserId: rule.hedefUserId,
    kanal: rule.kanal,
    createdAt: rule.createdAt.toISOString(),
    updatedAt: rule.updatedAt.toISOString(),
    hedefUser: rule.hedefUser ?? null,
  };
}

export async function PUT(request: Request, { params }: RouteContext) {
  try {
    const auth = await requireAuth(request, ['ADMIN']);
    if (!auth.ok) return auth.response;

    const parsed = alertRuleUpdateSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Gecersiz alert rule guncelleme istegi', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const payload = parsed.data;

    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.alertRule.findUnique({
        where: { id: params.id },
        select: {
          id: true,
          ad: true,
          aktif: true,
          eventTipi: true,
          kosulJson: true,
          hedefRol: true,
          hedefUserId: true,
          kanal: true,
        },
      });

      if (!existing) {
        return { kind: 'NOT_FOUND' as const };
      }

      const hedefRol = payload.hedefRol !== undefined ? payload.hedefRol : existing.hedefRol;
      const hedefUserId =
        payload.hedefUserId !== undefined ? payload.hedefUserId : existing.hedefUserId;

      if (!hedefRol && !hedefUserId) {
        return { kind: 'INVALID_TARGET' as const };
      }
      if (hedefRol && hedefUserId) {
        return { kind: 'INVALID_TARGET' as const };
      }

      if (hedefUserId) {
        const user = await tx.user.findUnique({
          where: { id: hedefUserId },
          select: { id: true, aktif: true },
        });
        if (!user || !user.aktif) {
          return { kind: 'INVALID_USER' as const };
        }
      }

      let kosulJson = existing.kosulJson;
      if (payload.kosul && typeof payload.kosul === 'object') {
        kosulJson = stringifyRuleCondition(payload.kosul);
      } else if (payload.kosulJson !== undefined) {
        kosulJson = stringifyRuleCondition(parseRuleConditionJson(payload.kosulJson));
      }

      const rule = await tx.alertRule.update({
        where: { id: params.id },
        data: {
          ad: payload.ad ?? existing.ad,
          aktif: payload.aktif ?? existing.aktif,
          eventTipi: payload.eventTipi ?? existing.eventTipi,
          kosulJson,
          hedefRol,
          hedefUserId,
          kanal: payload.kanal ?? existing.kanal,
        },
        include: {
          hedefUser: {
            select: {
              id: true,
              ad: true,
              email: true,
              role: true,
            },
          },
        },
      });

      await writeAuditEvent(tx, {
        organizationId: 'org_default',
        userId: auth.payload.userId,
        userEmail: auth.payload.email,
        islemTuru: JOB_AUDIT_EVENTS.ALERT_RULE_UPDATED,
        entityTipi: 'AlertRule',
        entityId: rule.id,
        detay: `Alert rule guncellendi: ${rule.ad} (${rule.eventTipi})`,
      });

      return { kind: 'OK' as const, rule };
    });

    if (updated.kind === 'NOT_FOUND') {
      return NextResponse.json({ error: 'Alert kurali bulunamadi' }, { status: 404 });
    }
    if (updated.kind === 'INVALID_TARGET') {
      return NextResponse.json(
        { error: 'Hedef rol veya tekil kullanici secilmelidir (ikisi birden secilemez)' },
        { status: 400 }
      );
    }
    if (updated.kind === 'INVALID_USER') {
      return NextResponse.json({ error: 'Secilen hedef kullanici bulunamadi' }, { status: 400 });
    }

    return NextResponse.json(mapRuleDto(updated.rule));
  } catch (error) {
    console.error('PUT /api/alerts/rules/[id] error:', error);
    return NextResponse.json({ error: 'Alert kurali guncellenemedi' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  try {
    const auth = await requireAuth(request, ['ADMIN']);
    if (!auth.ok) return auth.response;

    const deleted = await prisma.$transaction(async (tx) => {
      const existing = await tx.alertRule.findUnique({
        where: { id: params.id },
        select: {
          id: true,
          ad: true,
          eventTipi: true,
        },
      });

      if (!existing) {
        return { kind: 'NOT_FOUND' as const };
      }

      await tx.alertRule.delete({ where: { id: params.id } });

      await writeAuditEvent(tx, {
        organizationId: 'org_default',
        userId: auth.payload.userId,
        userEmail: auth.payload.email,
        islemTuru: JOB_AUDIT_EVENTS.ALERT_RULE_DELETED,
        entityTipi: 'AlertRule',
        entityId: existing.id,
        detay: `Alert rule silindi: ${existing.ad} (${existing.eventTipi})`,
      });

      return { kind: 'OK' as const, existing };
    });

    if (deleted.kind === 'NOT_FOUND') {
      return NextResponse.json({ error: 'Alert kurali bulunamadi' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      id: deleted.existing.id,
    });
  } catch (error) {
    console.error('DELETE /api/alerts/rules/[id] error:', error);
    return NextResponse.json({ error: 'Alert kurali silinemedi' }, { status: 500 });
  }
}
