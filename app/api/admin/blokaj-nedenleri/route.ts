import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/api-auth';
import { blokajNedeniCacheSifirla } from '@/lib/config/blocking-reason-cache';
import { aktifDurumlariGetir } from '@/lib/config/status-cache';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const blokajNedeniOlusturSchema = z.object({
  key: z.string().min(1).max(100),
  label: z.string().min(1).max(120),
  description: z.string().max(500).optional().nullable(),
  durumKey: z.string().min(1).max(100),
  sirasi: z.number().int().min(0).max(9999).optional(),
  aktif: z.boolean().optional(),
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

async function sonrakiSiraDegeriGetir(): Promise<number> {
  const sonuc = await prisma.blokajNedeni.aggregate({
    _max: { sirasi: true },
  });
  return (sonuc._max.sirasi ?? 0) + 1;
}

async function durumAnahtariGecerliMi(durumKey: string): Promise<boolean> {
  const normalizeDurumKey = keyNormalizeEt(durumKey);
  const durumlar = await aktifDurumlariGetir();
  return durumlar.some((durum) => keyNormalizeEt(durum.key) === normalizeDurumKey);
}

export async function GET(request: Request) {
  const auth = await requireAuth(request, ['ADMIN']);
  if (!auth.ok) return auth.response;

  const nedenler = await prisma.blokajNedeni.findMany({
    orderBy: [{ sirasi: 'asc' }, { createdAt: 'asc' }],
  });

  return NextResponse.json(nedenler.map(blokajNedeniYanitiOlustur));
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuth(request, ['ADMIN']);
    if (!auth.ok) return auth.response;

    const body = blokajNedeniOlusturSchema.parse(await request.json());
    const sirasi = body.sirasi ?? (await sonrakiSiraDegeriGetir());
    const durumKey = keyNormalizeEt(body.durumKey);

    if (!(await durumAnahtariGecerliMi(durumKey))) {
      return NextResponse.json({ error: 'Gecerli bir durum anahtari secin' }, { status: 400 });
    }

    const yeniNeden = await prisma.blokajNedeni.create({
      data: {
        key: keyNormalizeEt(body.key),
        label: body.label.trim(),
        description: body.description?.trim() || null,
        durumKey,
        sirasi,
        aktif: body.aktif ?? true,
      },
    });

    blokajNedeniCacheSifirla();
    return NextResponse.json(blokajNedeniYanitiOlustur(yeniNeden), { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Gecersiz veri', detay: error.issues }, { status: 400 });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'Bu blokaj nedeni anahtari zaten mevcut' }, { status: 409 });
    }

    console.error('Blokaj nedeni olusturma hatasi:', error);
    return NextResponse.json({ error: 'Blokaj nedeni olusturulamadi' }, { status: 500 });
  }
}
