import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/api-auth';
import { konumCacheSifirla } from '@/lib/config/konum-cache';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const konumOlusturSchema = z.object({
  key: z.string().min(1).max(100),
  label: z.string().min(1).max(120),
  adres: z.string().max(250).optional().nullable(),
  telefon: z.string().max(50).optional().nullable(),
  sirasi: z.number().int().min(0).max(9999).optional(),
  aktif: z.boolean().optional(),
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

async function sonrakiSiraDegeriGetir(): Promise<number> {
  const sonuc = await prisma.konum.aggregate({
    _max: { sirasi: true },
  });
  return (sonuc._max.sirasi ?? 0) + 1;
}

export async function GET(request: Request) {
  const auth = await requireAuth(request, ['ADMIN']);
  if (!auth.ok) return auth.response;

  const konumlar = await prisma.konum.findMany({
    orderBy: [{ sirasi: 'asc' }, { createdAt: 'asc' }],
  });

  return NextResponse.json(konumlar.map(konumYanitiOlustur));
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuth(request, ['ADMIN']);
    if (!auth.ok) return auth.response;

    const body = konumOlusturSchema.parse(await request.json());
    const sirasi = body.sirasi ?? (await sonrakiSiraDegeriGetir());

    const yeniKonum = await prisma.konum.create({
      data: {
        key: keyNormalizeEt(body.key),
        label: body.label.trim(),
        adres: body.adres?.trim() || null,
        telefon: body.telefon?.trim() || null,
        sirasi,
        aktif: body.aktif ?? true,
      },
    });

    konumCacheSifirla();
    return NextResponse.json(konumYanitiOlustur(yeniKonum), { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Geçersiz veri', detay: error.issues }, { status: 400 });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'Bu konum anahtarı zaten mevcut' }, { status: 409 });
    }

    console.error('Konum oluşturma hatasi:', error);
    return NextResponse.json({ error: 'Konum oluşturulamadı' }, { status: 500 });
  }
}
