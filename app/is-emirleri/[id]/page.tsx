import { notFound } from 'next/navigation';
import { ServisDurumu } from '@prisma/client';
import { IsEmriDetayV2, type IsEmriDetayVerisi, type IsEmriGecmisKaydi } from '@/components/is-emirleri/IsEmriDetayV2';
import { normalizeServisDurumuForApp, normalizeServisDurumuForDb } from '@/lib/domain-mappers';
import { prisma } from '@/lib/prisma';

const IN_PROGRESS_DB_STATUS = normalizeServisDurumuForDb('DEVAM_EDIYOR') as ServisDurumu;

function resolvePriority(service: {
  durum: ServisDurumu;
  tarih: Date | null;
  tahminiBitisTarihi: Date | null;
}): 'YUKSEK' | 'ORTA' | 'DUSUK' {
  const dueDate = service.tahminiBitisTarihi ?? service.tarih;
  const isOverdue = dueDate ? dueDate.getTime() < Date.now() : false;
  if (isOverdue) return 'YUKSEK';
  if (service.durum === ServisDurumu.PARCA_BEKLIYOR || service.durum === ServisDurumu.MUSTERI_ONAY_BEKLIYOR) {
    return 'YUKSEK';
  }
  if (service.durum === IN_PROGRESS_DB_STATUS || service.durum === ServisDurumu.RANDEVU_VERILDI) {
    return 'ORTA';
  }
  return 'DUSUK';
}

function toDateKey(value: Date | null): string | null {
  return value ? value.toISOString().slice(0, 10) : null;
}

export default async function IsEmriDetayPage({ params }: { params: { id: string } }) {
  const service = await prisma.service.findFirst({
    where: {
      id: params.id,
      deletedAt: null,
    },
    include: {
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
      notlar: {
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
      },
    },
  });

  if (!service) {
    notFound();
  }

  const timeline = await prisma.auditLog.findMany({
    where: {
      OR: [
        {
          entityTipi: 'Service',
          entityId: params.id,
        },
        {
          entityTipi: 'Job',
          entityId: params.id,
        },
      ],
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 100,
    select: {
      id: true,
      createdAt: true,
      islemTuru: true,
      detay: true,
      userEmail: true,
    },
  });

  const initialService: IsEmriDetayVerisi = {
    id: service.id,
    tekneAdi: service.tekneAdi,
    servisAciklamasi: service.servisAciklamasi,
    isTuru: service.isTuru,
    durum: normalizeServisDurumuForApp(service.durum),
    oncelik: resolvePriority(service),
    lokasyon: service.yer,
    adres: service.adres,
    tarih: toDateKey(service.tarih),
    saat: service.saat,
    tahminiBitisTarihi: toDateKey(service.tahminiBitisTarihi),
    irtibatKisi: service.irtibatKisi,
    telefon: service.telefon,
    taseronNotlari: service.taseronNotlari,
    createdAt: service.createdAt.toISOString(),
    updatedAt: service.updatedAt.toISOString(),
    personeller: service.personeller.map((assignment) => ({
      id: assignment.id,
      personelId: assignment.personelId,
      rol: assignment.rol,
      personel: {
        id: assignment.personel.id,
        ad: assignment.personel.ad,
        unvan: assignment.personel.unvan,
      },
    })),
    notlar: service.notlar.map((note) => ({
      id: note.id,
      text: note.metin,
      createdAt: note.createdAt.toISOString(),
      authorEmail: note.olusturanEmail ?? note.olusturan?.email ?? null,
      authorName: note.olusturan?.ad ?? null,
    })),
  };

  const timelineData: IsEmriGecmisKaydi[] = timeline.map((item) => ({
    id: item.id,
    createdAt: item.createdAt.toISOString(),
    islemTuru: item.islemTuru,
    detay: item.detay,
    userEmail: item.userEmail,
  }));

  return <IsEmriDetayV2 initialService={initialService} timeline={timelineData} />;
}
