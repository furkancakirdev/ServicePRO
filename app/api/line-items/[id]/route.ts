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

const updateLineItemSchema = z.object({
  pricebookItemId: z.string().trim().min(1).optional().nullable(),
  ad: z.string().trim().max(255).optional().nullable(),
  miktar: z.union([z.number(), z.string()]).optional(),
  birimFiyat: z.union([z.number(), z.string()]).optional(),
  notlar: z.string().trim().max(2000).optional().nullable(),
});

export async function PUT(request: Request, { params }: RouteContext) {
  try {
    const auth = await requireAuth(request, ['ADMIN', 'YETKILI']);
    if (!auth.ok) return auth.response;

    const parsed = updateLineItemSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Gecersiz line item guncelleme istegi', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const payload = parsed.data;

    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.jobLineItem.findUnique({
        where: { id: params.id },
        select: {
          id: true,
          servisId: true,
          pricebookItemId: true,
          ad: true,
          miktar: true,
          birimFiyat: true,
          notlar: true,
          servis: {
            select: {
              tekneAdi: true,
            },
          },
        },
      });

      if (!existing) {
        return {
          kind: 'NOT_FOUND' as const,
        };
      }

      let nextPricebookItem: {
        id: string;
        ad: string;
        varsayilanFiyat: import('@prisma/client').Prisma.Decimal | null;
      } | null = null;

      const nextPricebookItemId =
        payload.pricebookItemId !== undefined ? payload.pricebookItemId : existing.pricebookItemId;

      if (nextPricebookItemId) {
        nextPricebookItem = await tx.pricebookItem.findUnique({
          where: { id: nextPricebookItemId },
          select: {
            id: true,
            ad: true,
            varsayilanFiyat: true,
          },
        });

        if (!nextPricebookItem) {
          return {
            kind: 'INVALID_PRICEBOOK_ITEM' as const,
          };
        }
      }

      const nameFromPayload = payload.ad !== undefined ? toNullableText(payload.ad) : null;
      const nextName =
        nameFromPayload ??
        (payload.pricebookItemId !== undefined ? nextPricebookItem?.ad ?? existing.ad : existing.ad);

      if (!nextName) {
        return {
          kind: 'INVALID_NAME' as const,
        };
      }

      const nextMiktar =
        payload.miktar !== undefined ? parsePositiveQuantity(payload.miktar) : existing.miktar;

      let nextBirimFiyat = existing.birimFiyat;
      if (payload.birimFiyat !== undefined) {
        nextBirimFiyat = parseRequiredDecimal(payload.birimFiyat, 'Birim fiyat');
      } else if (payload.pricebookItemId !== undefined && nextPricebookItem?.varsayilanFiyat) {
        nextBirimFiyat = nextPricebookItem.varsayilanFiyat;
      }

      if (nextBirimFiyat.lt(0)) {
        return {
          kind: 'INVALID_PRICE' as const,
        };
      }

      const toplam = calculateLineTotal(nextMiktar, nextBirimFiyat);

      const lineItem = await tx.jobLineItem.update({
        where: { id: params.id },
        data: {
          pricebookItemId: nextPricebookItemId,
          ad: nextName,
          miktar: nextMiktar,
          birimFiyat: nextBirimFiyat,
          toplam,
          notlar: payload.notlar !== undefined ? toNullableText(payload.notlar) : existing.notlar,
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
        islemTuru: JOB_AUDIT_EVENTS.LINE_ITEM_UPDATED,
        entityTipi: 'JobLineItem',
        entityId: lineItem.id,
        detay: `Job line item guncellendi: ${existing.servis.tekneAdi} / ${lineItem.ad}`,
      });

      return {
        kind: 'OK' as const,
        lineItem,
      };
    });

    if (updated.kind === 'NOT_FOUND') {
      return NextResponse.json({ error: 'Line item bulunamadi' }, { status: 404 });
    }
    if (updated.kind === 'INVALID_PRICEBOOK_ITEM') {
      return NextResponse.json({ error: 'Secilen pricebook item bulunamadi' }, { status: 400 });
    }
    if (updated.kind === 'INVALID_NAME') {
      return NextResponse.json({ error: 'Line item adi zorunludur' }, { status: 400 });
    }
    if (updated.kind === 'INVALID_PRICE') {
      return NextResponse.json({ error: 'Gecerli bir birim fiyat giriniz' }, { status: 400 });
    }

    return NextResponse.json(mapJobLineItemDto(updated.lineItem));
  } catch (error) {
    if (error instanceof Error && error.message.includes('Miktar')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (error instanceof Error && error.message.includes('Birim fiyat')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error('PUT /api/line-items/[id] error:', error);
    return NextResponse.json({ error: 'Line item guncellenemedi' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  try {
    const auth = await requireAuth(request, ['ADMIN', 'YETKILI']);
    if (!auth.ok) return auth.response;

    const deleted = await prisma.$transaction(async (tx) => {
      const existing = await tx.jobLineItem.findUnique({
        where: { id: params.id },
        select: {
          id: true,
          ad: true,
          servis: {
            select: {
              id: true,
              tekneAdi: true,
            },
          },
        },
      });

      if (!existing) {
        return {
          kind: 'NOT_FOUND' as const,
        };
      }

      await tx.jobLineItem.delete({
        where: { id: params.id },
      });

      await writeAuditEvent(tx, {
        organizationId: 'org_default',
        userId: auth.payload.userId,
        userEmail: auth.payload.email,
        islemTuru: JOB_AUDIT_EVENTS.LINE_ITEM_REMOVED,
        entityTipi: 'JobLineItem',
        entityId: existing.id,
        detay: `Job line item silindi: ${existing.servis.tekneAdi} / ${existing.ad}`,
      });

      return {
        kind: 'OK' as const,
        existing,
      };
    });

    if (deleted.kind === 'NOT_FOUND') {
      return NextResponse.json({ error: 'Line item bulunamadi' }, { status: 404 });
    }

    return NextResponse.json({ success: true, id: deleted.existing.id });
  } catch (error) {
    console.error('DELETE /api/line-items/[id] error:', error);
    return NextResponse.json({ error: 'Line item silinemedi' }, { status: 500 });
  }
}
