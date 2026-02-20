import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/api-auth';
import { evaluateAlerts } from '@/lib/alerts/evaluator';

function cronSecretValid(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;

  const authHeader = request.headers.get('authorization')?.trim();
  const headerSecret = request.headers.get('x-cron-secret')?.trim();
  const querySecret = new URL(request.url).searchParams.get('secret')?.trim();

  if (authHeader === `Bearer ${secret}`) return true;
  if (headerSecret === secret) return true;
  return querySecret === secret;
}

async function authorize(request: NextRequest): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
  if (cronSecretValid(request)) return { ok: true };

  const auth = await requireAuth(request, ['ADMIN']);
  if (!auth.ok) return { ok: false, response: auth.response };

  return { ok: true };
}

async function runCron(request: NextRequest): Promise<NextResponse> {
  const auth = await authorize(request);
  if (!auth.ok) return auth.response;

  try {
    const status = await evaluateAlerts({
      source: 'cron',
    });

    return NextResponse.json({
      success: true,
      status,
    });
  } catch (error) {
    console.error('cron alerts error:', error);
    return NextResponse.json({ error: 'Alert cron calistirilamadi' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return runCron(request);
}

export async function POST(request: NextRequest) {
  return runCron(request);
}
