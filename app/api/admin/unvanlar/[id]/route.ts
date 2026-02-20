import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/api-auth';
import { unvanCacheSifirla } from '@/lib/config/unvan-cache';
import prisma from '@/lib/prisma';

type RouteContext = {
  params: {
    id: string;
  };
};

const unvanGuncelleSchema = z
  .object({
    key: z.string().min(1).max(100).optional(),
    label: z.string().min(1).max(120).optional(),
    puanCarpani: z.number().min(0).max(100).optional(),
    sirasi: z.number().int().min(0).max(9999).optional(),
    aktif: z.boolean().optional(),
  })
  .refine((deger) => Object.values(deger).some((alan) => alan !== undefined), {
    message: 'En az bir alan gönderilmelidir',
  });

function keyNormalizeEt(key: string): string {
  return key.trim().toUpperCase().replace(/\s+/g, '_');
}

function unvanYanitiOlustur(unvan: {
  id: string;
  key: string;
  label: string;
  puanCarpani: Prisma.Decimal;
  sirasi: number;
  aktif: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: unvan.id,
    key: unvan.key,
    label: unvan.label,
    puanCarpani: Number(unvan.puanCarpani),
    sirasi: unvan.sirasi,
    aktif: unvan.aktif,
    createdAt: unvan.createdAt,
    updatedAt: unvan.updatedAt,
  };
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const auth = await requireAuth(request, ['ADMIN']);
    if (!auth.ok) return auth.response;

    const body = unvanGuncelleSchema.parse(await request.json());
    const guncellemeVerisi: Prisma.PersonelUnvanAyarUpdateInput = {};

    if (body.key !== undefined) guncellemeVerisi.key = keyNormalizeEt(body.key);
    if (body.label !== undefined) guncellemeVerisi.label = body.label.trim();
    if (body.puanCarpani !== undefined) {
      guncellemeVerisi.puanCarpani = new Prisma.Decimal(body.puanCarpani);
    }
    if (body.sirasi !== undefined) guncellemeVerisi.sirasi = body.sirasi;
    if (body.aktif !== undefined) guncellemeVerisi.aktif = body.aktif;

    const guncellenen = await prisma.personelUnvanAyar.update({
      where: { id: context.params.id },
      data: guncellemeVerisi,
    });

    unvanCacheSifirla();
    return NextResponse.json(unvanYanitiOlustur(guncellenen));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Geçersiz veri', detay: error.issues }, { status: 400 });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return NextResponse.json({ error: 'Unvan bulunamadı' }, { status: 404 });
      }
      if (error.code === 'P2002') {
        return NextResponse.json({ error: 'Bu unvan anahtarı zaten mevcut' }, { status: 409 });
      }
    }

    console.error('Unvan güncelleme hatasi:', error);
    return NextResponse.json({ error: 'Unvan güncellenemedi' }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const auth = await requireAuth(request, ['ADMIN']);
    if (!auth.ok) return auth.response;

    await prisma.personelUnvanAyar.delete({
      where: { id: context.params.id },
    });

    unvanCacheSifirla();
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json({ error: 'Unvan bulunamadı' }, { status: 404 });
    }

    console.error('Unvan silme hatasi:', error);
    return NextResponse.json({ error: 'Unvan silinemedi' }, { status: 500 });
  }
}
