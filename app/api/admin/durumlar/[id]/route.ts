import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/api-auth';
import { durumCacheSifirla } from '@/lib/config/status-cache';
import prisma from '@/lib/prisma';

type RouteContext = {
  params: {
    id: string;
  };
};

const durumGuncelleSchema = z
  .object({
    key: z.string().min(1).max(100).optional(),
    label: z.string().min(1).max(120).optional(),
    description: z.string().max(500).optional().nullable(),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    icon: z.string().max(80).optional().nullable(),
    sirasi: z.number().int().min(0).max(9999).optional(),
    aktif: z.boolean().optional(),
  })
  .refine((deger) => Object.values(deger).some((alan) => alan !== undefined), {
    message: 'En az bir alan gönderilmelidir',
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

export async function PUT(request: Request, context: RouteContext) {
  try {
    const auth = await requireAuth(request, ['ADMIN']);
    if (!auth.ok) return auth.response;

    const hamBody = await request.json().catch(() => null);
    if (!hamBody || typeof hamBody !== 'object') {
      return NextResponse.json({ error: 'Gecerli bir JSON govdesi gereklidir' }, { status: 400 });
    }

    const body = durumGuncelleSchema.parse(hamBody);
    const guncellemeVerisi: Prisma.ServisDurumuAyarUpdateInput = {};

    if (body.key !== undefined) guncellemeVerisi.key = keyNormalizeEt(body.key);
    if (body.label !== undefined) guncellemeVerisi.label = body.label.trim();
    if (body.description !== undefined) guncellemeVerisi.description = body.description?.trim() || null;
    if (body.color !== undefined) guncellemeVerisi.color = body.color;
    if (body.icon !== undefined) guncellemeVerisi.icon = body.icon?.trim() || null;
    if (body.sirasi !== undefined) guncellemeVerisi.sirasi = body.sirasi;
    if (body.aktif !== undefined) guncellemeVerisi.aktif = body.aktif;

    const guncellenen = await prisma.servisDurumuAyar.update({
      where: { id: context.params.id },
      data: guncellemeVerisi,
    });

    durumCacheSifirla();
    return NextResponse.json(durumYanitiOlustur(guncellenen));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Geçersiz veri', detay: error.issues }, { status: 400 });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return NextResponse.json({ error: 'Durum bulunamadı' }, { status: 404 });
      }
      if (error.code === 'P2002') {
        return NextResponse.json({ error: 'Bu durum anahtarı zaten mevcut' }, { status: 409 });
      }
    }

    console.error('Durum güncelleme hatasi:', error);
    return NextResponse.json({ error: 'Durum güncellenemedi' }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const auth = await requireAuth(request, ['ADMIN']);
    if (!auth.ok) return auth.response;

    await prisma.servisDurumuAyar.delete({
      where: { id: context.params.id },
    });

    durumCacheSifirla();
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json({ error: 'Durum bulunamadı' }, { status: 404 });
    }

    console.error('Durum silme hatasi:', error);
    return NextResponse.json({ error: 'Durum silinemedi' }, { status: 500 });
  }
}
