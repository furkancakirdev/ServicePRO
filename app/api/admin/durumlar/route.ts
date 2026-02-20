import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/api-auth';
import { durumCacheSifirla } from '@/lib/config/status-cache';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const durumOlusturSchema = z.object({
  key: z.string().min(1).max(100),
  label: z.string().min(1).max(120),
  description: z.string().max(500).optional().nullable(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Renk hex formatinda olmalidir'),
  icon: z.string().max(80).optional().nullable(),
  sirasi: z.number().int().min(0).max(9999).optional(),
  aktif: z.boolean().optional(),
});

function keyNormalizeEt(key: string): string {
  return key.trim().toUpperCase().replace(/\s+/g, '_');
}

function durumYanitiOlustur(durum: {
  id: string;
  key: string;
  label: string;
  description: string | null;
  color: string;
  icon: string | null;
  sirasi: number;
  aktif: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: durum.id,
    key: durum.key,
    label: durum.label,
    description: durum.description,
    color: durum.color,
    icon: durum.icon,
    sirasi: durum.sirasi,
    aktif: durum.aktif,
    createdAt: durum.createdAt,
    updatedAt: durum.updatedAt,
  };
}

async function sonrakiSiraDegeriGetir(): Promise<number> {
  const sonuc = await prisma.servisDurumuAyar.aggregate({
    _max: { sirasi: true },
  });
  return (sonuc._max.sirasi ?? 0) + 1;
}

export async function GET(request: Request) {
  const auth = await requireAuth(request, ['ADMIN']);
  if (!auth.ok) return auth.response;

  const durumlar = await prisma.servisDurumuAyar.findMany({
    orderBy: [{ sirasi: 'asc' }, { createdAt: 'asc' }],
  });

  return NextResponse.json(durumlar.map(durumYanitiOlustur));
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuth(request, ['ADMIN']);
    if (!auth.ok) return auth.response;

    const body = durumOlusturSchema.parse(await request.json());
    const sirasi = body.sirasi ?? (await sonrakiSiraDegeriGetir());

    const yeniDurum = await prisma.servisDurumuAyar.create({
      data: {
        key: keyNormalizeEt(body.key),
        label: body.label.trim(),
        description: body.description?.trim() || null,
        color: body.color,
        icon: body.icon?.trim() || null,
        sirasi,
        aktif: body.aktif ?? true,
      },
    });

    durumCacheSifirla();
    return NextResponse.json(durumYanitiOlustur(yeniDurum), { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Geçersiz veri', detay: error.issues }, { status: 400 });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'Bu durum anahtarı zaten mevcut' }, { status: 409 });
    }

    console.error('Durum oluşturma hatasi:', error);
    return NextResponse.json({ error: 'Durum oluşturulamadı' }, { status: 500 });
  }
}
