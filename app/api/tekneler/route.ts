import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const tekneler = await prisma.tekne.findMany({
      where: { aktif: true, deletedAt: null },
      orderBy: { ad: 'asc' },
      select: {
        id: true,
        ad: true,
        marka: true,
        model: true,
        seriNo: true,
        adres: true,
        telefon: true,
      },
    });

    return NextResponse.json(tekneler);
  } catch (error) {
    console.error('GET /api/tekneler error:', error);
    return NextResponse.json(
      { error: 'Tekneler getirilemedi' },
      { status: 500 }
    );
  }
}
