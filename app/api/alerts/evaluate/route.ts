import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/api-auth';
import { evaluateAlerts } from '@/lib/alerts/evaluator';

const evaluateSchema = z.object({
  ruleId: z.string().trim().min(1).optional().nullable(),
});

export async function POST(request: Request) {
  try {
    const auth = await requireAuth(request, ['ADMIN']);
    if (!auth.ok) return auth.response;

    const parsed = evaluateSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Gecersiz evaluate istegi', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const status = await evaluateAlerts({
      source: 'manual',
      triggeredByUserId: auth.payload.userId,
      triggeredByEmail: auth.payload.email,
      specificRuleId: parsed.data.ruleId ?? null,
    });

    return NextResponse.json({
      success: true,
      status,
    });
  } catch (error) {
    console.error('POST /api/alerts/evaluate error:', error);
    return NextResponse.json({ error: 'Alert evaluate calistirilamadi' }, { status: 500 });
  }
}
