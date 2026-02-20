import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/api-auth';
import { konumCacheSifirla } from '@/lib/config/konum-cache';
import prisma from '@/lib/prisma';

type RouteContext = {
  params: {
    id: string;
  };
};

const konumGuncelleSchema = z
  .object({
    key: z.string().min(1).max(100).optional(),
    label: z.string().min(1).max(120).optional(),
    adres: z.string().max(250).optional().nullable(),
    telefon: z.string().max(50).optional().nullable(),
    sirasi: z.number().int().min(0).max(9999).optional(),
    aktif: z.boolean().optional(),
  })
  .refine((deger) => Object.values(deger).some((alan) => alan !== undefined), {
    message: 'En az bir alan gönderilmelidir',
  });

function keyNormalizeEt(key: string): string {
  return key.trim().toUpperCase().replace(/\s+/g, '_');
}

function konumYanitiOlustur(konum: {
  id: string;
  key: string;
  label: string;
  adres: string | null;
  telefon: string | null;
  sirasi: number;
  aktif: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: konum.id,
    key: konum.key,
    label: konum.label,
    adres: konum.adres,
    telefon: konum.telefon,
    sirasi: konum.sirasi,
    aktif: konum.aktif,
    createdAt: konum.createdAt,
    updatedAt: konum.updatedAt,
  };
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const auth = await requireAuth(request, ['ADMIN']);
    if (!auth.ok) return auth.response;

    const body = konumGuncelleSchema.parse(await request.json());
    const guncellemeVerisi: Prisma.KonumUpdateInput = {};

    if (body.key !== undefined) guncellemeVerisi.key = keyNormalizeEt(body.key);
    if (body.label !== undefined) guncellemeVerisi.label = body.label.trim();
    if (body.adres !== undefined) guncellemeVerisi.adres = body.adres?.trim() || null;
    if (body.telefon !== undefined) guncellemeVerisi.telefon = body.telefon?.trim() || null;
    if (body.sirasi !== undefined) guncellemeVerisi.sirasi = body.sirasi;
    if (body.aktif !== undefined) guncellemeVerisi.aktif = body.aktif;

    const guncellenen = await prisma.konum.update({
      where: { id: context.params.id },
      data: guncellemeVerisi,
    });

    konumCacheSifirla();
    return NextResponse.json(konumYanitiOlustur(guncellenen));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Geçersiz veri', detay: error.issues }, { status: 400 });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return NextResponse.json({ error: 'Konum bulunamadı' }, { status: 404 });
      }
      if (error.code === 'P2002') {
        return NextResponse.json({ error: 'Bu konum anahtarı zaten mevcut' }, { status: 409 });
      }
    }

    console.error('Konum güncelleme hatasi:', error);
    return NextResponse.json({ error: 'Konum güncellenemedi' }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const auth = await requireAuth(request, ['ADMIN']);
    if (!auth.ok) return auth.response;

    await prisma.konum.delete({
      where: { id: context.params.id },
    });

    konumCacheSifirla();
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json({ error: 'Konum bulunamadı' }, { status: 404 });
    }

    console.error('Konum silme hatasi:', error);
    return NextResponse.json({ error: 'Konum silinemedi' }, { status: 500 });
  }
}
