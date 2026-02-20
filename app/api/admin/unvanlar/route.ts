import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/api-auth';
import { unvanCacheSifirla } from '@/lib/config/unvan-cache';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const unvanOlusturSchema = z.object({
  key: z.string().min(1).max(100),
  label: z.string().min(1).max(120),
  puanCarpani: z.number().min(0).max(100),
  sirasi: z.number().int().min(0).max(9999).optional(),
  aktif: z.boolean().optional(),
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

async function sonrakiSiraDegeriGetir(): Promise<number> {
  const sonuc = await prisma.personelUnvanAyar.aggregate({
    _max: { sirasi: true },
  });
  return (sonuc._max.sirasi ?? 0) + 1;
}

export async function GET(request: Request) {
  const auth = await requireAuth(request, ['ADMIN']);
  if (!auth.ok) return auth.response;

  const unvanlar = await prisma.personelUnvanAyar.findMany({
    orderBy: [{ sirasi: 'asc' }, { createdAt: 'asc' }],
  });

  return NextResponse.json(unvanlar.map(unvanYanitiOlustur));
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuth(request, ['ADMIN']);
    if (!auth.ok) return auth.response;

    const body = unvanOlusturSchema.parse(await request.json());
    const sirasi = body.sirasi ?? (await sonrakiSiraDegeriGetir());

    const yeniUnvan = await prisma.personelUnvanAyar.create({
      data: {
        key: keyNormalizeEt(body.key),
        label: body.label.trim(),
        puanCarpani: new Prisma.Decimal(body.puanCarpani),
        sirasi,
        aktif: body.aktif ?? true,
      },
    });

    unvanCacheSifirla();
    return NextResponse.json(unvanYanitiOlustur(yeniUnvan), { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Geçersiz veri', detay: error.issues }, { status: 400 });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'Bu unvan anahtarı zaten mevcut' }, { status: 409 });
    }

    console.error('Unvan oluşturma hatasi:', error);
    return NextResponse.json({ error: 'Unvan oluşturulamadı' }, { status: 500 });
  }
}
