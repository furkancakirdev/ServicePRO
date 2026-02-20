import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/api-auth';
import { JOB_AUDIT_EVENTS, writeAuditEvent } from '@/lib/audit/events';
import { prisma } from '@/lib/prisma';
import { mapPricebookCategoryDto, toNullableText } from '@/lib/pricebook/shared';

const createCategorySchema = z.object({
  ad: z.string().trim().min(1, 'Kategori adi zorunludur').max(120),
  parentId: z.string().trim().min(1).optional().nullable(),
  sira: z.number().int().min(0).optional().default(0),
  aktif: z.boolean().optional().default(true),
});

function parseBoolFilter(value: string | null): boolean | undefined {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'true') return true;
  if (normalized === 'false') return false;
  return undefined;
}

function parseError(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== 'object') return fallback;
  const row = payload as { error?: string };
  return row.error ?? fallback;
}

export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request, ['ADMIN', 'YETKILI']);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const q = toNullableText(searchParams.get('q'));
    const aktif = parseBoolFilter(searchParams.get('aktif'));

    const categories = await prisma.pricebookCategory.findMany({
      where: {
        aktif,
        ad: q
          ? {
              contains: q,
              mode: 'insensitive',
            }
          : undefined,
      },
      orderBy: [{ sira: 'asc' }, { ad: 'asc' }],
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

    return NextResponse.json({
      categories: categories.map(mapPricebookCategoryDto),
    });
  } catch (error) {
    console.error('GET /api/pricebook/categories error:', error);
    return NextResponse.json({ error: 'Pricebook kategorileri getirilemedi' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuth(request, ['ADMIN', 'YETKILI']);
    if (!auth.ok) return auth.response;

    const parsed = createCategorySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Gecersiz kategori istegi', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const payload = parsed.data;

    const created = await prisma.$transaction(async (tx) => {
      if (payload.parentId) {
        const parent = await tx.pricebookCategory.findUnique({
          where: { id: payload.parentId },
          select: { id: true },
        });

        if (!parent) {
          return {
            kind: 'INVALID_PARENT' as const,
          };
        }
      }

      const category = await tx.pricebookCategory.create({
        data: {
          organizationId: 'org_default',
          ad: payload.ad,
          parentId: payload.parentId ?? null,
          sira: payload.sira,
          aktif: payload.aktif,
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
        islemTuru: JOB_AUDIT_EVENTS.PRICEBOOK_CATEGORY_CREATED,
        entityTipi: 'PricebookCategory',
        entityId: category.id,
        detay: `Pricebook kategori olusturuldu: ${category.ad}`,
      });

      return {
        kind: 'OK' as const,
        category,
      };
    });

    if (created.kind === 'INVALID_PARENT') {
      return NextResponse.json({ error: 'Secilen ust kategori bulunamadi' }, { status: 400 });
    }

    return NextResponse.json(mapPricebookCategoryDto(created.category), { status: 201 });
  } catch (error) {
    console.error('POST /api/pricebook/categories error:', error);
    return NextResponse.json(
      { error: parseError(error, 'Pricebook kategorisi olusturulamadi') },
      { status: 500 }
    );
  }
}
