import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/api-auth';

type RouteContext = {
  params: {
    id: string;
  };
};

const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024;

type WorkOrderAttachmentDto = {
  id: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  createdAt: string;
  authorEmail: string | null;
  authorName: string | null;
};

function sanitizeFileName(input: string): string {
  const trimmed = input.trim();
  const withoutPathSeparators = trimmed.replace(/[\\/]/g, '_');
  const withoutControlChars = withoutPathSeparators.replace(/[\u0000-\u001F\u007F]/g, '');
  const normalized = withoutControlChars.replace(/\s+/g, ' ').trim();
  return normalized.length > 0 ? normalized.slice(0, 200) : 'attachment.bin';
}

function mapAttachment(attachment: {
  id: string;
  dosyaAdi: string;
  mimeType: string;
  dosyaBoyutu: number;
  createdAt: Date;
  olusturanEmail: string | null;
  olusturan: { ad: string; email: string } | null;
}): WorkOrderAttachmentDto {
  return {
    id: attachment.id,
    fileName: attachment.dosyaAdi,
    mimeType: attachment.mimeType,
    fileSize: attachment.dosyaBoyutu,
    createdAt: attachment.createdAt.toISOString(),
    authorEmail: attachment.olusturanEmail ?? attachment.olusturan?.email ?? null,
    authorName: attachment.olusturan?.ad ?? null,
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

    const attachments = await prisma.serviceAttachment.findMany({
      where: { servisId: params.id },
      orderBy: [{ createdAt: 'desc' }],
      select: {
        id: true,
        dosyaAdi: true,
        mimeType: true,
        dosyaBoyutu: true,
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

    return NextResponse.json(attachments.map(mapAttachment));
  } catch (error) {
    console.error('GET /api/services/[id]/attachments error:', error);
    return NextResponse.json({ error: 'Servis ekleri getirilemedi' }, { status: 500 });
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

    const formData = await request.formData();
    const fileCandidate = formData.get('file');

    if (!(fileCandidate instanceof File)) {
      return NextResponse.json({ error: 'Yuklenecek dosya bulunamadi' }, { status: 400 });
    }
    if (fileCandidate.size <= 0) {
      return NextResponse.json({ error: 'Bos dosya yuklenemez' }, { status: 400 });
    }
    if (fileCandidate.size > MAX_ATTACHMENT_SIZE_BYTES) {
      return NextResponse.json(
        { error: `Dosya boyutu en fazla ${Math.floor(MAX_ATTACHMENT_SIZE_BYTES / (1024 * 1024))} MB olabilir` },
        { status: 400 }
      );
    }

    const fileBuffer = Buffer.from(await fileCandidate.arrayBuffer());
    const sanitizedFileName = sanitizeFileName(fileCandidate.name);
    const mimeType = String(fileCandidate.type || 'application/octet-stream');

    const created = await prisma.serviceAttachment.create({
      data: {
        servisId: params.id,
        dosyaAdi: sanitizedFileName,
        mimeType,
        dosyaBoyutu: fileCandidate.size,
        icerik: fileBuffer,
        olusturanUserId: auth.payload.userId,
        olusturanEmail: auth.payload.email,
      },
      select: {
        id: true,
        dosyaAdi: true,
        mimeType: true,
        dosyaBoyutu: true,
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
        detay: `Servis eki yuklendi: ${sanitizedFileName}`,
      },
    });

    return NextResponse.json(mapAttachment(created), { status: 201 });
  } catch (error) {
    console.error('POST /api/services/[id]/attachments error:', error);
    return NextResponse.json({ error: 'Servis eki yuklenemedi' }, { status: 500 });
  }
}
