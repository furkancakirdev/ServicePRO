import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/api-auth';

type RouteContext = {
  params: {
    id: string;
  };
};

const MAX_NOTE_LENGTH = 2000;

type WorkOrderNoteDto = {
  id: string;
  text: string;
  createdAt: string;
  authorEmail: string | null;
  authorName: string | null;
};

function mapNote(note: {
  id: string;
  metin: string;
  createdAt: Date;
  olusturanEmail: string | null;
  olusturan: { ad: string; email: string } | null;
}): WorkOrderNoteDto {
  return {
    id: note.id,
    text: note.metin,
    createdAt: note.createdAt.toISOString(),
    authorEmail: note.olusturanEmail ?? note.olusturan?.email ?? null,
    authorName: note.olusturan?.ad ?? null,
  };
}

async function ensureServiceExists(serviceId: string): Promise<boolean> {
  const service = await prisma.service.findFirst({
    where: {
      id: serviceId,
      deletedAt: null,
    },
    select: { id: true },
  });
  return Boolean(service);
}

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const auth = await requireAuth(request, ['ADMIN', 'YETKILI']);
    if (!auth.ok) return auth.response;

    const exists = await ensureServiceExists(params.id);
    if (!exists) {
      return NextResponse.json({ error: 'Servis bulunamadi' }, { status: 404 });
    }

    const notes = await prisma.serviceNote.findMany({
      where: { servisId: params.id },
      orderBy: [{ createdAt: 'desc' }],
      select: {
        id: true,
        metin: true,
        createdAt: true,
        olusturanEmail: true,
        olusturan: {
          select: {
            ad: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(notes.map(mapNote));
  } catch (error) {
    console.error('GET /api/services/[id]/notes error:', error);
    return NextResponse.json({ error: 'Servis notlari getirilemedi' }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const auth = await requireAuth(request, ['ADMIN', 'YETKILI']);
    if (!auth.ok) return auth.response;

    const exists = await ensureServiceExists(params.id);
    if (!exists) {
      return NextResponse.json({ error: 'Servis bulunamadi' }, { status: 404 });
    }

    const body = (await request.json()) as { text?: string } | null;
    const text = String(body?.text ?? '').trim();

    if (!text) {
      return NextResponse.json({ error: 'Not metni zorunludur' }, { status: 400 });
    }
    if (text.length > MAX_NOTE_LENGTH) {
      return NextResponse.json(
        { error: `Not metni en fazla ${MAX_NOTE_LENGTH} karakter olabilir` },
        { status: 400 }
      );
    }

    const created = await prisma.serviceNote.create({
      data: {
        servisId: params.id,
        metin: text,
        olusturanUserId: auth.payload.userId,
        olusturanEmail: auth.payload.email,
      },
      select: {
        id: true,
        metin: true,
        createdAt: true,
        olusturanEmail: true,
        olusturan: {
          select: {
            ad: true,
            email: true,
          },
        },
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: auth.payload.userId,
        userEmail: auth.payload.email,
        islemTuru: 'UPDATE',
        entityTipi: 'Service',
        entityId: params.id,
        detay: 'Servis notu eklendi',
      },
    });

    return NextResponse.json(mapNote(created), { status: 201 });
  } catch (error) {
    console.error('POST /api/services/[id]/notes error:', error);
    return NextResponse.json({ error: 'Servis notu eklenemedi' }, { status: 500 });
  }
}
