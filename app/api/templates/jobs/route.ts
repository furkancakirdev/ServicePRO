import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/api-auth';
import { JOB_AUDIT_EVENTS, writeAuditEvent } from '@/lib/audit/events';
import { prisma } from '@/lib/prisma';
import {
  mapJobTemplateDto,
  parsePositiveQuantity,
  parseRequiredDecimal,
  toNullableText,
} from '@/lib/pricebook/shared';

const templateItemInputSchema = z.object({
  pricebookItemId: z.string().trim().min(1).optional().nullable(),
  ad: z.string().trim().max(255).optional().nullable(),
  miktar: z.union([z.number(), z.string()]).optional().default(1),
  birimFiyat: z.union([z.number(), z.string()]).optional().nullable(),
  sira: z.number().int().min(0).optional(),
});

const createTemplateSchema = z.object({
  ad: z.string().trim().min(1).max(120),
  aciklama: z.string().trim().max(2000).optional().nullable(),
  aktif: z.boolean().optional().default(true),
  defaultStatus: z.string().trim().max(64).optional().nullable(),
  defaultNotlar: z.string().trim().max(4000).optional().nullable(),
  items: z.array(templateItemInputSchema).optional().default([]),
});

function parseBoolFilter(value: string | null): boolean | undefined {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'true') return true;
  if (normalized === 'false') return false;
  return undefined;
}

type ResolvedTemplateItem = {
  pricebookItemId: string | null;
  ad: string;
  miktar: import('@prisma/client').Prisma.Decimal;
  birimFiyat: import('@prisma/client').Prisma.Decimal;
  sira: number;
};

async function resolveTemplateItems(
  tx: import('@prisma/client').Prisma.TransactionClient,
  items: z.infer<typeof templateItemInputSchema>[]
): Promise<ResolvedTemplateItem[]> {
  const resolved: ResolvedTemplateItem[] = [];

  for (let index = 0; index < items.length; index += 1) {
    const row = items[index];
    let pricebookItem: {
      id: string;
      ad: string;
      varsayilanFiyat: import('@prisma/client').Prisma.Decimal | null;
    } | null = null;

    if (row.pricebookItemId) {
      pricebookItem = await tx.pricebookItem.findUnique({
        where: { id: row.pricebookItemId },
        select: {
          id: true,
          ad: true,
          varsayilanFiyat: true,
        },
      });

      if (!pricebookItem) {
        throw new Error('Secilen template item pricebook kaydi bulunamadi');
      }
    }

    const ad = toNullableText(row.ad) ?? pricebookItem?.ad;
    if (!ad) {
      throw new Error('Template item adi zorunludur');
    }

    const miktar = parsePositiveQuantity(row.miktar);
    const birimFiyat =
      row.birimFiyat !== null && row.birimFiyat !== undefined && row.birimFiyat !== ''
        ? parseRequiredDecimal(row.birimFiyat, 'Template birim fiyat')
        : pricebookItem?.varsayilanFiyat;

    if (!birimFiyat || birimFiyat.lt(0)) {
      throw new Error('Template item icin gecerli bir birim fiyat gerekli');
    }

    resolved.push({
      pricebookItemId: row.pricebookItemId ?? null,
      ad,
      miktar,
      birimFiyat,
      sira: row.sira ?? index,
    });
  }

  return resolved;
}

export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request, ['ADMIN', 'YETKILI']);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const aktif = parseBoolFilter(searchParams.get('aktif'));

    const templates = await prisma.jobTemplate.findMany({
      where: {
        aktif,
      },
      include: {
        items: {
          include: {
            pricebookItem: {
              select: {
                id: true,
                tip: true,
                kod: true,
                birim: true,
              },
            },
          },
          orderBy: [{ sira: 'asc' }, { id: 'asc' }],
        },
      },
      orderBy: [{ aktif: 'desc' }, { updatedAt: 'desc' }],
    });

    return NextResponse.json({
      templates: templates.map(mapJobTemplateDto),
    });
  } catch (error) {
    console.error('GET /api/templates/jobs error:', error);
    return NextResponse.json({ error: 'Job template listesi getirilemedi' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuth(request, ['ADMIN', 'YETKILI']);
    if (!auth.ok) return auth.response;

    const parsed = createTemplateSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Gecersiz template istegi', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const payload = parsed.data;

    const created = await prisma.$transaction(async (tx) => {
      const resolvedItems = await resolveTemplateItems(tx, payload.items);

      const template = await tx.jobTemplate.create({
        data: {
          organizationId: 'org_default',
          ad: payload.ad,
          aciklama: toNullableText(payload.aciklama),
          aktif: payload.aktif,
          defaultStatus: toNullableText(payload.defaultStatus),
          defaultNotlar: toNullableText(payload.defaultNotlar),
        },
      });

      for (const item of resolvedItems) {
        await tx.jobTemplateItem.create({
          data: {
            templateId: template.id,
            pricebookItemId: item.pricebookItemId,
            ad: item.ad,
            miktar: item.miktar,
            birimFiyat: item.birimFiyat,
            sira: item.sira,
          },
        });
      }

      const withItems = await tx.jobTemplate.findUnique({
        where: { id: template.id },
        include: {
          items: {
            include: {
              pricebookItem: {
                select: {
                  id: true,
                  tip: true,
                  kod: true,
                  birim: true,
                },
              },
            },
            orderBy: [{ sira: 'asc' }, { id: 'asc' }],
          },
        },
      });

      if (!withItems) {
        throw new Error('Template kaydi olusturuldu ancak tekrar okunamadi');
      }

      await writeAuditEvent(tx, {
        organizationId: 'org_default',
        userId: auth.payload.userId,
        userEmail: auth.payload.email,
        islemTuru: JOB_AUDIT_EVENTS.TEMPLATE_CREATED,
        entityTipi: 'JobTemplate',
        entityId: withItems.id,
        detay: `Job template olusturuldu: ${withItems.ad}`,
      });

      return withItems;
    });

    return NextResponse.json(mapJobTemplateDto(created), { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Template')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (error instanceof Error && error.message.includes('template')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (error instanceof Error && error.message.includes('pricebook')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (error instanceof Error && error.message.includes('Miktar')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error('POST /api/templates/jobs error:', error);
    return NextResponse.json({ error: 'Job template olusturulamadi' }, { status: 500 });
  }
}
