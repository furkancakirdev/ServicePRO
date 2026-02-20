import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/api-auth';
import { prisma } from '@/lib/prisma';

const updateSchema = z.object({
  view: z.enum(['DAY', 'WEEK']).optional(),
  shownPersonelIds: z.array(z.string().min(1)).max(200).optional(),
  yogunMod: z.boolean().optional(),
});

function parseShownPersonelIds(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => String(item).trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request, ['ADMIN', 'YETKILI']);
    if (!auth.ok) return auth.response;

    const preference = await prisma.dispatchPreference.findUnique({
      where: {
        userId: auth.payload.userId,
      },
      select: {
        varsayilanGorunum: true,
        gosterilenPersonelIds: true,
        yogunMod: true,
        updatedAt: true,
      },
    });

    if (!preference) {
      return NextResponse.json({
        view: 'DAY',
        shownPersonelIds: [],
        yogunMod: true,
        updatedAt: null,
      });
    }

    return NextResponse.json({
      view: preference.varsayilanGorunum === 'WEEK' ? 'WEEK' : 'DAY',
      shownPersonelIds: parseShownPersonelIds(preference.gosterilenPersonelIds),
      yogunMod: preference.yogunMod,
      updatedAt: preference.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('GET /api/dispatch/preferences error:', error);
    return NextResponse.json({ error: 'Dispatch tercihleri getirilemedi' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const auth = await requireAuth(request, ['ADMIN', 'YETKILI']);
    if (!auth.ok) return auth.response;

    const parsed = updateSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Gecersiz dispatch preference istegi', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const payload = parsed.data;

    const updated = await prisma.dispatchPreference.upsert({
      where: {
        userId: auth.payload.userId,
      },
      create: {
        organizationId: 'org_default',
        userId: auth.payload.userId,
        varsayilanGorunum: payload.view ?? 'DAY',
        gosterilenPersonelIds:
          payload.shownPersonelIds !== undefined ? JSON.stringify(payload.shownPersonelIds) : null,
        yogunMod: payload.yogunMod ?? true,
      },
      update: {
        varsayilanGorunum: payload.view ?? undefined,
        gosterilenPersonelIds:
          payload.shownPersonelIds !== undefined ? JSON.stringify(payload.shownPersonelIds) : undefined,
        yogunMod: payload.yogunMod ?? undefined,
      },
      select: {
        varsayilanGorunum: true,
        gosterilenPersonelIds: true,
        yogunMod: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      view: updated.varsayilanGorunum === 'WEEK' ? 'WEEK' : 'DAY',
      shownPersonelIds: parseShownPersonelIds(updated.gosterilenPersonelIds),
      yogunMod: updated.yogunMod,
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('PUT /api/dispatch/preferences error:', error);
    return NextResponse.json({ error: 'Dispatch tercihleri kaydedilemedi' }, { status: 500 });
  }
}
