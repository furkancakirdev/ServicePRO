import { NextResponse } from 'next/server';
import { getTokenFromHeader, verifyToken, type TokenPayload } from '@/lib/utils/auth';
import { normalizeRole } from '@/lib/auth/role';

type RequestLike = Request & { headers: Headers };

type AuthSuccess = {
  ok: true;
  token: string;
  payload: TokenPayload;
};

type AuthFailure = {
  ok: false;
  response: NextResponse;
};

export type AuthResult = AuthSuccess | AuthFailure;

function getTokenFromCookieHeader(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const tokenPair = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith('token='));
  if (!tokenPair) return null;
  const [, value] = tokenPair.split('=');
  return value ?? null;
}

export async function requireAuth(
  request: RequestLike,
  allowedRoles?: string[]
): Promise<AuthResult> {
  const authHeader = request.headers.get('authorization');
  const tokenFromHeader = getTokenFromHeader(authHeader);
  const tokenFromCookie = getTokenFromCookieHeader(request.headers.get('cookie'));
  const token = tokenFromHeader ?? tokenFromCookie;

  if (!token) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  const payload = await verifyToken(token);
  if (!payload) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  const normalizedRole = normalizeRole(payload.role) ?? payload.role;

  if (allowedRoles && !allowedRoles.includes(normalizedRole)) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    };
  }

  return { ok: true, token, payload: { ...payload, role: normalizedRole } };
}
