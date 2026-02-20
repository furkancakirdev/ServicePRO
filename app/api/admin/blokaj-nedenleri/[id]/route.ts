import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/api-auth';
import { blokajNedeniCacheSifirla } from '@/lib/config/blocking-reason-cache';
import { aktifDurumlariGetir } from '@/lib/config/status-cache';
import prisma from '@/lib/prisma';

type RouteContext = {
  params: {
    id: string;
  };
};

const blokajNedeniGuncelleSchema = z
  .object({
    key: z.string().min(1).max(100).optional(),
    label: z.string().min(1).max(120).optional(),
    description: z.string().max(500).optional().nullable(),
    durumKey: z.string().min(1).max(100).optional(),
    sirasi: z.number().int().min(0).max(9999).optional(),
    aktif: z.boolean().optional(),
  })
  .refine((deger) => Object.values(deger).some((alan) => alan !== undefined), {
    message: 'En az bir alan gonderilmelidir',
  });

function keyNormalizeEt(key: string): string {
  return key.trim().toUpperCase().replace(/\s+/g, '_');
}

function blokajNedeniYanitiOlustur(neden: {
  id: string;
  key: string;
  label: string;
  description: string | null;
  durumKey: string;
  sirasi: number;
  aktif: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: neden.id,
    key: neden.key,
    label: neden.label,
    description: neden.description,
    durumKey: neden.durumKey,
    sirasi: neden.sirasi,
    aktif: neden.aktif,
    createdAt: neden.createdAt,
    updatedAt: neden.updatedAt,
  };
}

async function durumAnahtariGecerliMi(durumKey: string): Promise<boolean> {
  const normalizeDurumKey = keyNormalizeEt(durumKey);
  const durumlar = await aktifDurumlariGetir();
  return durumlar.some((durum) => keyNormalizeEt(durum.key) === normalizeDurumKey);
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const auth = await requireAuth(request, ['ADMIN']);
    if (!auth.ok) return auth.response;

    const hamBody = await request.json().catch(() => null);
    if (!hamBody || typeof hamBody !== 'object') {
      return NextResponse.json({ error: 'Gecerli bir JSON govdesi gereklidir' }, { status: 400 });
    }

    const body = blokajNedeniGuncelleSchema.parse(hamBody);
    const guncellemeVerisi: Prisma.BlokajNedeniUpdateInput = {};

    if (body.key !== undefined) guncellemeVerisi.key = keyNormalizeEt(body.key);
    if (body.label !== undefined) guncellemeVerisi.label = body.label.trim();
    if (body.description !== undefined) guncellemeVerisi.description = body.description?.trim() || null;
    if (body.durumKey !== undefined) {
      const durumKey = keyNormalizeEt(body.durumKey);
      if (!(await durumAnahtariGecerliMi(durumKey))) {
        return NextResponse.json({ error: 'Gecerli bir durum anahtari secin' }, { status: 400 });
      }
      guncellemeVerisi.durumKey = durumKey;
    }
    if (body.sirasi !== undefined) guncellemeVerisi.sirasi = body.sirasi;
    if (body.aktif !== undefined) guncellemeVerisi.aktif = body.aktif;

    const guncellenen = await prisma.blokajNedeni.update({
      where: { id: context.params.id },
      data: guncellemeVerisi,
    });

    blokajNedeniCacheSifirla();
    return NextResponse.json(blokajNedeniYanitiOlustur(guncellenen));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Gecersiz veri', detay: error.issues }, { status: 400 });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return NextResponse.json({ error: 'Blokaj nedeni bulunamadi' }, { status: 404 });
      }
      if (error.code === 'P2002') {
        return NextResponse.json({ error: 'Bu blokaj nedeni anahtari zaten mevcut' }, { status: 409 });
      }
    }

    console.error('Blokaj nedeni guncelleme hatasi:', error);
    return NextResponse.json({ error: 'Blokaj nedeni guncellenemedi' }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const auth = await requireAuth(request, ['ADMIN']);
    if (!auth.ok) return auth.response;

    await prisma.blokajNedeni.delete({
      where: { id: context.params.id },
    });

    blokajNedeniCacheSifirla();
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json({ error: 'Blokaj nedeni bulunamadi' }, { status: 404 });
    }

    console.error('Blokaj nedeni silme hatasi:', error);
    return NextResponse.json({ error: 'Blokaj nedeni silinemedi' }, { status: 500 });
  }
}
