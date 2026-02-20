import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/api-auth';
import { JOB_AUDIT_EVENTS, writeAuditEvent } from '@/lib/audit/events';
import { prisma } from '@/lib/prisma';
import { mapPricebookCategoryDto } from '@/lib/pricebook/shared';

type RouteContext = {
  params: {
    id: string;
  };
};

const updateCategorySchema = z.object({
  ad: z.string().trim().min(1).max(120).optional(),
  parentId: z.string().trim().min(1).optional().nullable(),
  sira: z.number().int().min(0).optional(),
  aktif: z.boolean().optional(),
});

export async function PUT(request: Request, { params }: RouteContext) {
  try {
    const auth = await requireAuth(request, ['ADMIN', 'YETKILI']);
    if (!auth.ok) return auth.response;

    const parsed = updateCategorySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Gecersiz kategori guncelleme istegi', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const payload = parsed.data;

    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.pricebookCategory.findUnique({
        where: { id: params.id },
        select: {
          id: true,
          ad: true,
          parentId: true,
          sira: true,
          aktif: true,
        },
      });

      if (!existing) {
        return { kind: 'NOT_FOUND' as const };
      }

      if (payload.parentId === params.id) {
        return { kind: 'INVALID_PARENT' as const };
      }

      if (payload.parentId) {
        const parent = await tx.pricebookCategory.findUnique({
          where: { id: payload.parentId },
          select: { id: true },
        });

        if (!parent) {
          return { kind: 'INVALID_PARENT' as const };
        }
      }

      const category = await tx.pricebookCategory.update({
        where: { id: params.id },
        data: {
          ad: payload.ad ?? existing.ad,
          parentId: payload.parentId !== undefined ? payload.parentId : existing.parentId,
          sira: payload.sira ?? existing.sira,
          aktif: payload.aktif ?? existing.aktif,
        },
        include: {
          parent: {
            select: {
              ad: true,
            },
          },
          _count: {
            select: {
              items: true,
            },
          },
        },
      });

      await writeAuditEvent(tx, {
        organizationId: 'org_default',
        userId: auth.payload.userId,
        userEmail: auth.payload.email,
        islemTuru: JOB_AUDIT_EVENTS.PRICEBOOK_CATEGORY_UPDATED,
        entityTipi: 'PricebookCategory',
        entityId: category.id,
        detay: `Pricebook kategori guncellendi: ${category.ad}`,
      });

      return {
        kind: 'OK' as const,
        category,
      };
    });

    if (updated.kind === 'NOT_FOUND') {
      return NextResponse.json({ error: 'Kategori bulunamadi' }, { status: 404 });
    }

    if (updated.kind === 'INVALID_PARENT') {
      return NextResponse.json({ error: 'Gecersiz ust kategori secimi' }, { status: 400 });
    }

    return NextResponse.json(mapPricebookCategoryDto(updated.category));
  } catch (error) {
    console.error('PUT /api/pricebook/categories/[id] error:', error);
    return NextResponse.json({ error: 'Pricebook kategorisi guncellenemedi' }, { status: 500 });
  }
}
