import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/api-auth';
import prisma from '@/lib/prisma';
import {
  DEFAULT_DASHBOARD_LAYOUT,
  isDashboardWidgetId,
  type DashboardWidgetId,
} from '@/lib/dashboard/widget-registry';

export const dynamic = 'force-dynamic';

const layoutSchema = z.object({
  widgets: z.array(z.string()).min(1).max(12),
});

function layoutKeyOlustur(userId: string): string {
  return `dashboard.layout.${userId}`;
}

function layoutNormalizeEt(rawWidgets: string[]): DashboardWidgetId[] {
  const filtreli = rawWidgets.filter(isDashboardWidgetId);
  const benzersiz = Array.from(new Set(filtreli));
  return benzersiz.length > 0 ? benzersiz : DEFAULT_DASHBOARD_LAYOUT;
}

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const key = layoutKeyOlustur(auth.payload.userId);
  const ayar = await prisma.systemSetting.findUnique({
    where: { key },
    select: { value: true },
  });

  if (!ayar) {
    return NextResponse.json({ widgets: DEFAULT_DASHBOARD_LAYOUT });
  }

  try {
    const parsed = JSON.parse(ayar.value) as { widgets?: string[] };
    const widgets = layoutNormalizeEt(parsed.widgets ?? []);
    return NextResponse.json({ widgets });
  } catch {
    return NextResponse.json({ widgets: DEFAULT_DASHBOARD_LAYOUT });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const body = layoutSchema.parse(await request.json());
    const widgets = layoutNormalizeEt(body.widgets);
    const key = layoutKeyOlustur(auth.payload.userId);

    await prisma.systemSetting.upsert({
      where: { key },
      create: {
        key,
        category: 'dashboard',
        description: 'Kullanici dashboard yerlesimi',
        value: JSON.stringify({ widgets }),
      },
      update: {
        value: JSON.stringify({ widgets }),
        category: 'dashboard',
        description: 'Kullanici dashboard yerlesimi',
      },
    });

    return NextResponse.json({ widgets });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Gecersiz dashboard yerlesimi', detay: error.issues },
        { status: 400 }
      );
    }

    console.error('Dashboard layout kayit hatasi:', error);
    return NextResponse.json({ error: 'Dashboard yerlesimi kaydedilemedi' }, { status: 500 });
  }
}

