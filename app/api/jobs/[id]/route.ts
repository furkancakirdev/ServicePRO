import { NextResponse } from 'next/server';
import {
  PATCH as patchService,
  PUT as putService,
  DELETE as deleteService,
} from '@/app/api/services/[id]/route';
import { requireAuth } from '@/lib/auth/api-auth';
import { mapJobLineItemDto } from '@/lib/pricebook/shared';
import { prisma } from '@/lib/prisma';
import { mapAppointmentDto } from '@/lib/jobs/appointments';

type RouteContext = {
  params: {
    id: string;
  };
};

export async function GET(request: Request, context: RouteContext) {
  try {
    const auth = await requireAuth(request, ['ADMIN', 'YETKILI']);
    if (!auth.ok) return auth.response;

    const job = await prisma.service.findFirst({
      where: {
        id: context.params.id,
        deletedAt: null,
      },
      include: {
        tekne: {
          select: {
            id: true,
            ad: true,
          },
        },
        ofisYetkili: {
          select: {
            id: true,
            ad: true,
            email: true,
            role: true,
          },
        },
        personeller: {
          include: {
            personel: {
              select: {
                id: true,
                ad: true,
                unvan: true,
              },
            },
          },
          orderBy: [{ rol: 'desc' }],
        },
        bekleyenParcalar: true,
        appointments: {
          where: {
            deletedAt: null,
          },
          orderBy: [{ sira: 'asc' }, { baslangicAt: 'asc' }],
          include: {
            personel: {
              select: {
                ad: true,
                unvan: true,
              },
            },
            confirmedBy: {
              select: {
                email: true,
              },
            },
          },
        },
        lineItems: {
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
          orderBy: [{ createdAt: 'asc' }],
        },
      },
    });

    if (!job) {
      return NextResponse.json({ error: 'Job bulunamadi' }, { status: 404 });
    }

    const now = new Date();
    const totalAppointments = job.appointments.length;
    const upcomingAppointments = job.appointments.filter((item) => item.bitisAt >= now).length;
    const confirmedAppointments = job.appointments.filter((item) => item.confirmedAt !== null).length;
    const lineItemsSubtotal = job.lineItems.reduce(
      (sum, item) => sum + Number(item.toplam.toString()),
      0
    );

    return NextResponse.json({
      ...job,
      appointments: job.appointments.map(mapAppointmentDto),
      lineItems: job.lineItems.map(mapJobLineItemDto),
      appointmentsSummary: {
        total: totalAppointments,
        upcoming: upcomingAppointments,
        confirmed: confirmedAppointments,
        unconfirmed: totalAppointments - confirmedAppointments,
      },
      lineItemsSummary: {
        total: job.lineItems.length,
        subtotal: lineItemsSubtotal,
      },
    });
  } catch (error) {
    console.error('GET /api/jobs/[id] error:', error);
    return NextResponse.json({ error: 'Job detayi getirilemedi' }, { status: 500 });
  }
}

export async function PUT(request: Request, context: RouteContext) {
  return putService(request, context);
}

export async function PATCH(request: Request, context: RouteContext) {
  return patchService(request, context);
}

export async function DELETE(request: Request, context: RouteContext) {
  return deleteService(request, context);
}
