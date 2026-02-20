import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/api-auth';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const widgetConfigSchema = z.object({
  config: z.record(z.string(), z.unknown()),
});

function widgetConfigKeyOlustur(userId: string, widgetId: string): string {
  return `dashboard.widget.config.${userId}.${widgetId}`;
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const widgetId = params.id?.trim();
    if (!widgetId) {
      return NextResponse.json({ error: 'Widget ID zorunludur' }, { status: 400 });
    }

    const body = widgetConfigSchema.parse(await request.json());
    const key = widgetConfigKeyOlustur(auth.payload.userId, widgetId);

    await prisma.systemSetting.upsert({
      where: { key },
      create: {
        key,
        category: 'dashboard',
        description: `Widget config: ${widgetId}`,
        value: JSON.stringify(body.config),
      },
      update: {
        category: 'dashboard',
        description: `Widget config: ${widgetId}`,
        value: JSON.stringify(body.config),
      },
    });

    return NextResponse.json({ id: widgetId, config: body.config });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Gecersiz widget config verisi', detay: error.issues },
        { status: 400 }
      );
    }

    console.error('Widget config kayit hatasi:', error);
    return NextResponse.json({ error: 'Widget config kaydedilemedi' }, { status: 500 });
  }
}
