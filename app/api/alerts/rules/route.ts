import { NextResponse } from 'next/server';
import { z } from 'zod';
import { NotificationChannel } from '@prisma/client';
import { requireAuth } from '@/lib/auth/api-auth';
import { JOB_AUDIT_EVENTS, writeAuditEvent } from '@/lib/audit/events';
import { parseRuleConditionJson, stringifyRuleCondition } from '@/lib/alerts/evaluator';
import { prisma } from '@/lib/prisma';
import { ALERT_EVENT_TYPES, NOTIFICATION_CHANNEL_VALUES, type AlertEventType } from '@/types/alerts';

const alertRuleCreateSchema = z
  .object({
    ad: z.string().trim().min(3).max(120),
    aktif: z.boolean().optional().default(true),
    eventTipi: z.enum(ALERT_EVENT_TYPES),
    kosulJson: z.string().trim().min(2).optional().nullable(),
    kosul: z.record(z.string(), z.unknown()).optional(),
    hedefRol: z.enum(['ADMIN', 'YETKILI']).optional().nullable(),
    hedefUserId: z.string().trim().min(1).optional().nullable(),
    kanal: z.enum(NOTIFICATION_CHANNEL_VALUES).optional().default('IN_APP'),
  })
  .superRefine((value, ctx) => {
    if (!value.hedefRol && !value.hedefUserId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['hedefRol'],
        message: 'Hedef rol veya hedef kullanici secilmelidir',
      });
    }

    if (value.hedefRol && value.hedefUserId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['hedefUserId'],
        message: 'Ayni anda rol ve tekil kullanici secilemez',
      });
    }
  });

function normalizeCondition(payload: z.infer<typeof alertRuleCreateSchema>): string {
  if (payload.kosul && typeof payload.kosul === 'object') {
    return stringifyRuleCondition(payload.kosul);
  }

  if (payload.kosulJson) {
    const parsed = parseRuleConditionJson(payload.kosulJson);
    return stringifyRuleCondition(parsed);
  }

  return '{}';
}

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

export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request, ['ADMIN']);
    if (!auth.ok) return auth.response;

    const rules = await prisma.alertRule.findMany({
      orderBy: [{ aktif: 'desc' }, { updatedAt: 'desc' }],
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

    return NextResponse.json({
      rules: rules.map(mapRuleDto),
    });
  } catch (error) {
    console.error('GET /api/alerts/rules error:', error);
    return NextResponse.json({ error: 'Alert kurallari getirilemedi' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuth(request, ['ADMIN']);
    if (!auth.ok) return auth.response;

    const parsed = alertRuleCreateSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Gecersiz alert rule istegi', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const payload = parsed.data;
    const kosulJson = normalizeCondition(payload);

    const created = await prisma.$transaction(async (tx) => {
      if (payload.hedefUserId) {
        const user = await tx.user.findUnique({
          where: { id: payload.hedefUserId },
          select: { id: true, aktif: true },
        });
        if (!user || !user.aktif) {
          return { kind: 'INVALID_USER' as const };
        }
      }

      const rule = await tx.alertRule.create({
        data: {
          organizationId: 'org_default',
          ad: payload.ad,
          aktif: payload.aktif,
          eventTipi: payload.eventTipi,
          kosulJson,
          hedefRol: payload.hedefRol ?? null,
          hedefUserId: payload.hedefUserId ?? null,
          kanal: payload.kanal,
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
        islemTuru: JOB_AUDIT_EVENTS.ALERT_RULE_CREATED,
        entityTipi: 'AlertRule',
        entityId: rule.id,
        detay: `Alert rule olusturuldu: ${rule.ad} (${rule.eventTipi})`,
      });

      return { kind: 'OK' as const, rule };
    });

    if (created.kind === 'INVALID_USER') {
      return NextResponse.json({ error: 'Secilen hedef kullanici bulunamadi' }, { status: 400 });
    }

    return NextResponse.json(mapRuleDto(created.rule), { status: 201 });
  } catch (error) {
    console.error('POST /api/alerts/rules error:', error);
    return NextResponse.json({ error: 'Alert kurali olusturulamadi' }, { status: 500 });
  }
}
