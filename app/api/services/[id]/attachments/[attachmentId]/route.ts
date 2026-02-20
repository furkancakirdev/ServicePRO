import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/api-auth';

type RouteContext = {
  params: {
    id: string;
    attachmentId: string;
  };
};

function contentDisposition(fileName: string): string {
  const fallback = fileName.replace(/[^\w.\-]/g, '_') || 'attachment.bin';
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const auth = await requireAuth(request, ['ADMIN', 'YETKILI']);
    if (!auth.ok) return auth.response;

    const attachment = await prisma.serviceAttachment.findFirst({
      where: {
        id: params.attachmentId,
        servisId: params.id,
        servis: {
          deletedAt: null,
        },
      },
      select: {
        id: true,
        dosyaAdi: true,
        mimeType: true,
        icerik: true,
      },
    });

    if (!attachment) {
      return NextResponse.json({ error: 'Ek dosyasi bulunamadi' }, { status: 404 });
    }

    return new Response(attachment.icerik, {
      headers: {
        'Content-Type': attachment.mimeType || 'application/octet-stream',
        'Content-Disposition': contentDisposition(attachment.dosyaAdi),
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('GET /api/services/[id]/attachments/[attachmentId] error:', error);
    return NextResponse.json({ error: 'Ek dosyasi indirilemedi' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  try {
    const auth = await requireAuth(request, ['ADMIN']);
    if (!auth.ok) return auth.response;

    const existing = await prisma.serviceAttachment.findFirst({
      where: {
        id: params.attachmentId,
        servisId: params.id,
        servis: {
          deletedAt: null,
        },
      },
      select: {
        id: true,
        dosyaAdi: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Ek dosyasi bulunamadi' }, { status: 404 });
    }

    await prisma.serviceAttachment.delete({
      where: { id: existing.id },
    });

    await prisma.auditLog.create({
      data: {
        userId: auth.payload.userId,
        userEmail: auth.payload.email,
        islemTuru: 'DELETE',
        entityTipi: 'Service',
        entityId: params.id,
        detay: `Servis eki silindi: ${existing.dosyaAdi}`,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/services/[id]/attachments/[attachmentId] error:', error);
    return NextResponse.json({ error: 'Ek dosyasi silinemedi' }, { status: 500 });
  }
}
