import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/api-auth';
import {
  systemSettingGetir,
  systemSettingKaydet,
  tumSystemSettingsGetir,
} from '@/lib/config/dynamic-settings';

export const dynamic = 'force-dynamic';

const ayarKaydetSchema = z.object({
  key: z.string().min(1).max(191),
  value: z.string(),
  category: z.string().min(1).max(100),
  description: z.string().max(2000).optional().nullable(),
});

export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request, ['ADMIN']);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const anahtar = searchParams.get('key');
    const kategori = searchParams.get('category');
    const varsayilanDeger = searchParams.get('fallback') ?? undefined;
    const zorlaYenile = searchParams.get('refresh') === '1';

    if (anahtar) {
      const sonuc = await systemSettingGetir(anahtar, varsayilanDeger);
      if (!sonuc) {
        return NextResponse.json({ error: 'Ayar bulunamadı' }, { status: 404 });
      }
      return NextResponse.json(sonuc);
    }

    const tumAyarlar = await tumSystemSettingsGetir(zorlaYenile);
    const filtreliAyarlar = kategori
      ? tumAyarlar.filter((ayar) => ayar.category === kategori)
      : tumAyarlar;

    return NextResponse.json(
      filtreliAyarlar.map((ayar) => ({
        key: ayar.key,
        value: ayar.value,
        category: ayar.category,
        description: ayar.description,
        updatedAt: ayar.updatedAt,
      }))
    );
  } catch (error) {
    console.error('Dynamic settings GET hatasi:', error);
    return NextResponse.json({ error: 'Ayarlar getirilemedi' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const auth = await requireAuth(request, ['ADMIN']);
    if (!auth.ok) return auth.response;

    const body = ayarKaydetSchema.parse(await request.json());
    const kaydedilen = await systemSettingKaydet({
      key: body.key,
      value: body.value,
      category: body.category,
      description: body.description ?? null,
    });

    return NextResponse.json({
      key: kaydedilen.key,
      value: kaydedilen.value,
      category: kaydedilen.category,
      description: kaydedilen.description,
      updatedAt: kaydedilen.updatedAt,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Geçersiz veri', detay: error.issues }, { status: 400 });
    }

    console.error('Dynamic settings PUT hatasi:', error);
    return NextResponse.json({ error: 'Ayar kaydedilemedi' }, { status: 500 });
  }
}
