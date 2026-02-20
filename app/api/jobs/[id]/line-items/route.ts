import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/api-auth';
import { JOB_AUDIT_EVENTS, writeAuditEvent } from '@/lib/audit/events';
import { prisma } from '@/lib/prisma';
import {
  calculateLineTotal,
  mapJobLineItemDto,
  parsePositiveQuantity,
  parseRequiredDecimal,
  toNullableText,
} from '@/lib/pricebook/shared';

type RouteContext = {
  params: {
    id: string;
  };
};

const createLineItemSchema = z.object({
  pricebookItemId: z.string().trim().min(1).optional().nullable(),
  ad: z.string().trim().max(255).optional().nullable(),
  miktar: z.union([z.number(), z.string()]).optional().default(1),
  birimFiyat: z.union([z.number(), z.string()]).optional().nullable(),
  notlar: z.string().trim().max(2000).optional().nullable(),
});

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const auth = await requireAuth(request, ['ADMIN', 'YETKILI']);
    if (!auth.ok) return auth.response;

    const job = await prisma.service.findFirst({
      where: {
        id: params.id,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!job) {
      return NextResponse.json({ error: 'Job bulunamadi' }, { status: 404 });
    }

    const lineItems = await prisma.jobLineItem.findMany({
      where: {
        servisId: params.id,
      },
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
      orderBy: [{ createdAt: 'asc' }],
    });

    const subtotal = lineItems.reduce((sum, item) => sum + Number(item.toplam.toString()), 0);

    return NextResponse.json({
      lineItems: lineItems.map(mapJobLineItemDto),
      subtotal,
    });
  } catch (error) {
    console.error('GET /api/jobs/[id]/line-items error:', error);
    return NextResponse.json({ error: 'Job line item listesi getirilemedi' }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const auth = await requireAuth(request, ['ADMIN', 'YETKILI']);
    if (!auth.ok) return auth.response;

    const parsed = createLineItemSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Gecersiz line item istegi', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const payload = parsed.data;

    const created = await prisma.$transaction(async (tx) => {
      const job = await tx.service.findFirst({
        where: {
          id: params.id,
          deletedAt: null,
        },
        select: {
          id: true,
          tekneAdi: true,
        },
      });

      if (!job) {
        return {
          kind: 'JOB_NOT_FOUND' as const,
        };
      }

      let pricebookItem: {
        id: string;
        ad: string;
        varsayilanFiyat: import('@prisma/client').Prisma.Decimal | null;
      } | null = null;

      if (payload.pricebookItemId) {
        pricebookItem = await tx.pricebookItem.findUnique({
          where: { id: payload.pricebookItemId },
          select: {
            id: true,
            ad: true,
            varsayilanFiyat: true,
          },
        });

        if (!pricebookItem) {
          return {
            kind: 'INVALID_PRICEBOOK_ITEM' as const,
          };
        }
      }

      const itemName = toNullableText(payload.ad) ?? pricebookItem?.ad;
      if (!itemName) {
        return {
          kind: 'INVALID_NAME' as const,
        };
      }

      const miktar = parsePositiveQuantity(payload.miktar);
      const birimFiyat =
        payload.birimFiyat !== null && payload.birimFiyat !== undefined && payload.birimFiyat !== ''
          ? parseRequiredDecimal(payload.birimFiyat, 'Birim fiyat')
          : pricebookItem?.varsayilanFiyat;

      if (!birimFiyat || birimFiyat.lt(0)) {
        return {
          kind: 'INVALID_PRICE' as const,
        };
      }

      const toplam = calculateLineTotal(miktar, birimFiyat);

      const lineItem = await tx.jobLineItem.create({
        data: {
          organizationId: 'org_default',
          servisId: params.id,
          pricebookItemId: payload.pricebookItemId ?? null,
          ad: itemName,
          miktar,
          birimFiyat,
          toplam,
          notlar: toNullableText(payload.notlar),
        },
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
      });

      await writeAuditEvent(tx, {
        organizationId: 'org_default',
        userId: auth.payload.userId,
        userEmail: auth.payload.email,
        islemTuru: JOB_AUDIT_EVENTS.LINE_ITEM_ADDED,
        entityTipi: 'JobLineItem',
        entityId: lineItem.id,
        detay: `Job line item eklendi: ${job.tekneAdi} / ${lineItem.ad}`,
      });

      return {
        kind: 'OK' as const,
        lineItem,
      };
    });

    if (created.kind === 'JOB_NOT_FOUND') {
      return NextResponse.json({ error: 'Job bulunamadi' }, { status: 404 });
    }
    if (created.kind === 'INVALID_PRICEBOOK_ITEM') {
      return NextResponse.json({ error: 'Secilen pricebook item bulunamadi' }, { status: 400 });
    }
    if (created.kind === 'INVALID_NAME') {
      return NextResponse.json({ error: 'Line item adi zorunludur' }, { status: 400 });
    }
    if (created.kind === 'INVALID_PRICE') {
      return NextResponse.json({ error: 'Gecerli bir birim fiyat giriniz' }, { status: 400 });
    }

    return NextResponse.json(mapJobLineItemDto(created.lineItem), { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Miktar')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (error instanceof Error && error.message.includes('Birim fiyat')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error('POST /api/jobs/[id]/line-items error:', error);
    return NextResponse.json({ error: 'Job line item olusturulamadi' }, { status: 500 });
  }
}
