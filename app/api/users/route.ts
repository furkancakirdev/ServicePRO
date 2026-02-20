import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/api-auth';
import { hashPassword } from '@/lib/utils/password';

type UserListItem = {
  id: string;
  ad: string;
  email: string;
  rol: 'admin' | 'yetkili';
  aktif: boolean;
};

type CreateUserPayload = {
  ad?: string;
  email?: string;
  password?: string;
  rol?: 'admin' | 'yetkili' | 'ADMIN' | 'YETKILI';
};

function normalizeRoleForDb(rol: CreateUserPayload['rol']): 'ADMIN' | 'YETKILI' {
  const normalized = String(rol ?? 'yetkili').toUpperCase();
  return normalized === 'ADMIN' ? 'ADMIN' : 'YETKILI';
}

function mapRoleForUi(role: string): 'admin' | 'yetkili' {
  return role === 'ADMIN' ? 'admin' : 'yetkili';
}

function sanitizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const auth = await requireAuth(request, ['ADMIN']);
  if (!auth.ok) return auth.response;

  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        ad: true,
        email: true,
        role: true,
        aktif: true,
      },
      orderBy: [{ role: 'asc' }, { ad: 'asc' }],
    });

    const result: UserListItem[] = users.map((user) => ({
      id: user.id,
      ad: user.ad,
      email: user.email,
      rol: mapRoleForUi(user.role),
      aktif: user.aktif,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('GET /api/users error:', error);
    return NextResponse.json(
      { error: 'Kullanici listesi getirilemedi' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireAuth(request, ['ADMIN']);
  if (!auth.ok) return auth.response;

  try {
    const body = (await request.json()) as CreateUserPayload;
    const ad = String(body.ad ?? '').trim();
    const email = sanitizeEmail(String(body.email ?? ''));
    const rawPassword = String(body.password ?? '').trim();
    const password = rawPassword.length > 0 ? rawPassword : 'servicepro123';
    const role = normalizeRoleForDb(body.rol);

    if (!ad || !email) {
      return NextResponse.json(
        { error: 'Ad soyad ve e-posta zorunludur' },
        { status: 400 }
      );
    }

    if (!email.includes('@')) {
      return NextResponse.json(
        { error: 'Geçerli bir e-posta girin' },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: 'Bu e-posta zaten kullanımda' },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(password);

    const created = await prisma.user.create({
      data: {
        ad,
        email,
        passwordHash,
        role,
        aktif: true,
      },
      select: {
        id: true,
        ad: true,
        email: true,
        role: true,
        aktif: true,
      },
    });

    return NextResponse.json(
      {
        id: created.id,
        ad: created.ad,
        email: created.email,
        rol: mapRoleForUi(created.role),
        aktif: created.aktif,
      } satisfies UserListItem,
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/users error:', error);
    return NextResponse.json(
      { error: 'Kullanıcı oluşturulamadı' },
      { status: 500 }
    );
  }
}


