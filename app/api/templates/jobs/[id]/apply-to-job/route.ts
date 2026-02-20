import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/api-auth';
import { JOB_AUDIT_EVENTS, writeAuditEvent } from '@/lib/audit/events';
import { prisma } from '@/lib/prisma';
import { calculateLineTotal, mapJobLineItemDto } from '@/lib/pricebook/shared';

type RouteContext = {
  params: {
    id: string;
  };
};

const applyTemplateSchema = z.object({
  jobId: z.string().trim().min(1),
  replaceExisting: z.boolean().optional().default(false),
});

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const auth = await requireAuth(request, ['ADMIN', 'YETKILI']);
    if (!auth.ok) return auth.response;

    const parsed = applyTemplateSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Gecersiz template apply istegi', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const payload = parsed.data;

    const applied = await prisma.$transaction(async (tx) => {
      const template = await tx.jobTemplate.findUnique({
        where: { id: params.id },
        include: {
          items: {
            orderBy: [{ sira: 'asc' }, { id: 'asc' }],
          },
        },
      });

      if (!template) {
        return {
          kind: 'TEMPLATE_NOT_FOUND' as const,
        };
      }

      const job = await tx.service.findFirst({
        where: {
          id: payload.jobId,
          deletedAt: null,
        },
        select: {
          id: true,
          tekneAdi: true,
        },
      });

      if (!job) {
        return {
          kind: 'JOB_NOT_FOUND' as const,
        };
      }

      if (payload.replaceExisting) {
        await tx.jobLineItem.deleteMany({
          where: {
            servisId: job.id,
          },
        });
      }

      const createdItems = [] as Awaited<
        ReturnType<typeof tx.jobLineItem.create>
      >[];

      for (const item of template.items) {
        const toplam = calculateLineTotal(item.miktar, item.birimFiyat);
        const created = await tx.jobLineItem.create({
          data: {
            organizationId: 'org_default',
            servisId: job.id,
            pricebookItemId: item.pricebookItemId,
            ad: item.ad,
            miktar: item.miktar,
            birimFiyat: item.birimFiyat,
            toplam,
            notlar: null,
          },
          include: {
            pricebookItem: {
              select: {
                id: true,
                tip: true,
                kod: true,
                birim: true,
              },
            },
          },
        });

        createdItems.push(created);
      }

      await writeAuditEvent(tx, {
        organizationId: 'org_default',
        userId: auth.payload.userId,
        userEmail: auth.payload.email,
        islemTuru: JOB_AUDIT_EVENTS.TEMPLATE_APPLIED_TO_JOB,
        entityTipi: 'Job',
        entityId: job.id,
        detay: `Template uygulandi: ${template.ad} (${createdItems.length} kalem)`,
      });

      return {
        kind: 'OK' as const,
        template,
        job,
        createdItems,
      };
    });

    if (applied.kind === 'TEMPLATE_NOT_FOUND') {
      return NextResponse.json({ error: 'Template bulunamadi' }, { status: 404 });
    }

    if (applied.kind === 'JOB_NOT_FOUND') {
      return NextResponse.json({ error: 'Job bulunamadi' }, { status: 404 });
    }

    const subtotal = applied.createdItems.reduce(
      (sum, row) => sum + Number(row.toplam.toString()),
      0
    );

    return NextResponse.json({
      templateId: applied.template.id,
      jobId: applied.job.id,
      createdCount: applied.createdItems.length,
      subtotal,
      lineItems: applied.createdItems.map(mapJobLineItemDto),
    });
  } catch (error) {
    console.error('POST /api/templates/jobs/[id]/apply-to-job error:', error);
    return NextResponse.json({ error: 'Template joba uygulanamadi' }, { status: 500 });
  }
}
