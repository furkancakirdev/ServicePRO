import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/api-auth';
import { JOB_AUDIT_EVENTS, writeAuditEvent } from '@/lib/audit/events';
import { prisma } from '@/lib/prisma';
import {
  mapPricebookItemDto,
  parseOptionalDecimal,
  toNullableText,
} from '@/lib/pricebook/shared';
import { PRICEBOOK_ITEM_TYPE_VALUES } from '@/types/pricebook';

type RouteContext = {
  params: {
    id: string;
  };
};

const updateItemSchema = z.object({
  tip: z.enum(PRICEBOOK_ITEM_TYPE_VALUES).optional(),
  kod: z.string().trim().max(64).optional().nullable(),
  ad: z.string().trim().min(1).max(255).optional(),
  aciklama: z.string().trim().max(2000).optional().nullable(),
  birim: z.string().trim().max(32).optional().nullable(),
  varsayilanSureSaat: z.union([z.number(), z.string()]).optional().nullable(),
  varsayilanFiyat: z.union([z.number(), z.string()]).optional().nullable(),
  maliyet: z.union([z.number(), z.string()]).optional().nullable(),
  categoryId: z.string().trim().min(1).optional().nullable(),
  aktif: z.boolean().optional(),
});

export async function PUT(request: Request, { params }: RouteContext) {
  try {
    const auth = await requireAuth(request, ['ADMIN', 'YETKILI']);
    if (!auth.ok) return auth.response;

    const parsed = updateItemSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Gecersiz pricebook item guncelleme istegi', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const payload = parsed.data;

    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.pricebookItem.findUnique({
        where: { id: params.id },
        select: {
          id: true,
          tip: true,
          kod: true,
          ad: true,
          aciklama: true,
          birim: true,
          varsayilanSureSaat: true,
          varsayilanFiyat: true,
          maliyet: true,
          categoryId: true,
          aktif: true,
        },
      });

      if (!existing) {
        return {
          kind: 'NOT_FOUND' as const,
        };
      }

      const categoryId = payload.categoryId !== undefined ? payload.categoryId : existing.categoryId;
      if (categoryId) {
        const category = await tx.pricebookCategory.findUnique({
          where: { id: categoryId },
          select: { id: true },
        });
        if (!category) {
          return {
            kind: 'INVALID_CATEGORY' as const,
          };
        }
      }

      const item = await tx.pricebookItem.update({
        where: { id: params.id },
        data: {
          tip: payload.tip ?? existing.tip,
          kod: payload.kod !== undefined ? toNullableText(payload.kod) : existing.kod,
          ad: payload.ad ?? existing.ad,
          aciklama:
            payload.aciklama !== undefined ? toNullableText(payload.aciklama) : existing.aciklama,
          birim: payload.birim !== undefined ? toNullableText(payload.birim) : existing.birim,
          varsayilanSureSaat:
            payload.varsayilanSureSaat !== undefined
              ? parseOptionalDecimal(payload.varsayilanSureSaat, 'Varsayilan sure')
              : existing.varsayilanSureSaat,
          varsayilanFiyat:
            payload.varsayilanFiyat !== undefined
              ? parseOptionalDecimal(payload.varsayilanFiyat, 'Varsayilan fiyat')
              : existing.varsayilanFiyat,
          maliyet:
            payload.maliyet !== undefined
              ? parseOptionalDecimal(payload.maliyet, 'Maliyet')
              : existing.maliyet,
          categoryId,
          aktif: payload.aktif ?? existing.aktif,
        },
        include: {
          category: {
            select: {
              ad: true,
            },
          },
        },
      });

      await writeAuditEvent(tx, {
        organizationId: 'org_default',
        userId: auth.payload.userId,
        userEmail: auth.payload.email,
        islemTuru: JOB_AUDIT_EVENTS.PRICEBOOK_ITEM_UPDATED,
        entityTipi: 'PricebookItem',
        entityId: item.id,
        detay: `Pricebook item guncellendi: ${item.ad}`,
      });

      return {
        kind: 'OK' as const,
        item,
      };
    });

    if (updated.kind === 'NOT_FOUND') {
      return NextResponse.json({ error: 'Pricebook item bulunamadi' }, { status: 404 });
    }

    if (updated.kind === 'INVALID_CATEGORY') {
      return NextResponse.json({ error: 'Secilen kategori bulunamadi' }, { status: 400 });
    }

    return NextResponse.json(mapPricebookItemDto(updated.item));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'Ayni kod ile baska bir item zaten var' }, { status: 409 });
    }

    if (error instanceof Error && error.message.includes('sayisal')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error('PUT /api/pricebook/items/[id] error:', error);
    return NextResponse.json({ error: 'Pricebook item guncellenemedi' }, { status: 500 });
  }
}
