// Services API - CRUD Operations with Prisma
// ServicePro ERP - Marlin Yatçılık

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/api-auth';
import { Prisma, ServisDurumu } from '@prisma/client';
import { getLokasyonGroupFromFields, normalizeServisDurumuForDb } from '@/lib/domain-mappers';
import { createUtcDayRange } from '@/lib/date-utils';

/**
 * GET /api/services - Get all services with optional filtering
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const durum = searchParams.get('durum');
    const durumListRaw = [...searchParams.getAll('durum')];
    if (durum && durum.includes(',')) {
      durumListRaw.push(...durum.split(',').map((x) => x.trim()));
    } else if (durum) {
      durumListRaw.push(durum);
    }
    const tekneId = searchParams.get('tekneId');
    const arama = searchParams.get('arama');
    const date = searchParams.get('date');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const sort = searchParams.get('sort') || 'tarih';
    const order = (searchParams.get('order') || 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc';
    const adresGroup = searchParams.get('adresGroup');

    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.ServiceWhereInput = {
      deletedAt: null,
    };

    if (durumListRaw.length > 0) {
      const durumList = durumListRaw
        .map((d) => normalizeServisDurumuForDb(d || '') as ServisDurumu)
        .filter((d): d is ServisDurumu => Object.values(ServisDurumu).includes(d));

      if (durumList.length > 0) {
        where.durum = { in: durumList };
      }
    }

    if (tekneId) {
      where.tekneId = tekneId;
    }

    if (arama) {
      where.OR = [
        { servisAciklamasi: { contains: arama, mode: 'insensitive' } },
        { tekneAdi: { contains: arama, mode: 'insensitive' } },
        { adres: { contains: arama, mode: 'insensitive' } },
      ];
    }

    if (date || dateFrom || dateTo) {
      const range: Prisma.DateTimeFilter = {};
      if (date) {
        const dayRange = createUtcDayRange(date);
        if (dayRange) {
          range.gte = dayRange.start;
          range.lte = dayRange.end;
        }
      } else {
        if (dateFrom) {
          const fromRange = createUtcDayRange(dateFrom);
          if (fromRange) range.gte = fromRange.start;
        }
        if (dateTo) {
          const toRange = createUtcDayRange(dateTo);
          if (toRange) range.lte = toRange.end;
        }
      }
      where.tarih = range;
    }

    if (adresGroup) {
      const group = adresGroup.toUpperCase();
      if (group === 'YATMARIN') {
        where.AND = [
          ...(Array.isArray(where.AND) ? where.AND : []),
          {
            OR: [
              { yer: { contains: 'yatmarin', mode: 'insensitive' } },
              { adres: { contains: 'yatmarin', mode: 'insensitive' } },
            ],
          },
        ];
      } else if (group === 'NETSEL') {
        where.AND = [
          ...(Array.isArray(where.AND) ? where.AND : []),
          {
            OR: [
              { yer: { contains: 'netsel', mode: 'insensitive' } },
              { adres: { contains: 'netsel', mode: 'insensitive' } },
            ],
          },
        ];
      } else if (group === 'DIS_SERVIS') {
        where.AND = [
          ...(Array.isArray(where.AND) ? where.AND : []),
          {
            NOT: {
              OR: [
                { yer: { contains: 'yatmarin', mode: 'insensitive' } },
                { adres: { contains: 'yatmarin', mode: 'insensitive' } },
                { yer: { contains: 'netsel', mode: 'insensitive' } },
                { adres: { contains: 'netsel', mode: 'insensitive' } },
              ],
            },
          },
        ];
      }
    }

    const orderByMap: Record<string, Prisma.ServiceOrderByWithRelationInput> = {
      tarih: { tarih: order },
      tekneAdi: { tekneAdi: order },
      adres: { adres: order },
      yer: { yer: order },
      durum: { durum: order },
      createdAt: { createdAt: order },
      updatedAt: { updatedAt: order },
    };
    const primaryOrderBy = orderByMap[sort] ?? { tarih: 'desc' as const };

    // Get total count
    const total = await prisma.service.count({ where });

    // Get services with relations
    const services = await prisma.service.findMany({
      where,
      include: {
        tekne: true,
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
            personel: true,
          },
        },
        bekleyenParcalar: true,
      },
      orderBy: [
        primaryOrderBy,
        { tarih: 'desc' },
        { createdAt: 'desc' },
      ],
      skip,
      take: limit,
    });

    const normalizedServices = services.map((service) => ({
      ...service,
      yer: service.yer || getLokasyonGroupFromFields(service.yer, service.adres),
    }));

    return NextResponse.json({
      services: normalizedServices,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('GET /api/services error:', error);
    return NextResponse.json(
      { error: 'Servisler getirilemedi' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/services - Create new service
 */
export async function POST(request: Request) {
  try {
    const auth = await requireAuth(request, ['ADMIN', 'YETKILI']);
    if (!auth.ok) return auth.response;

    const body = await request.json();

    // Create service
    const service = await prisma.service.create({
      data: {
        tarih: body.tarih ? new Date(body.tarih) : null,
        saat: body.saat,
        isTuru: body.isTuru || 'PAKET',
        tekneId: body.tekneId,
        tekneAdi: body.tekneAdi,
        adres: body.adres,
        yer: body.yer,
        servisAciklamasi: body.servisAciklamasi,
        irtibatKisi: body.irtibatKisi,
        telefon: body.telefon,
        durum: body.durum || 'RANDEVU_VERILDI',
        ofisYetkiliId: body.ofisYetkiliId,
        taseronNotlari: body.taseronNotlari,
      },
      include: {
        tekne: true,
        ofisYetkili: {
          select: {
            id: true,
            ad: true,
            email: true,
          },
        },
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: auth.payload.userId,
        userEmail: auth.payload.email,
        islemTuru: 'CREATE',
        entityTipi: 'Service',
        entityId: service.id,
        detay: `Yeni servis oluşturuldu: ${service.tekneAdi}`,
      },
    });

    return NextResponse.json(service, { status: 201 });
  } catch (error) {
    console.error('POST /api/services error:', error);
    return NextResponse.json(
      { error: 'Servis oluşturulamadı' },
      { status: 500 }
    );
  }
}

