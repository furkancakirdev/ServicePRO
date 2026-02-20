import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ServisDurumu } from '@prisma/client';
import { Badge } from '@/components/ui/badge';
import { PageContent } from '@/components/layout/page-content';
import { PageHeader } from '@/components/layout/page-header';
import { WorkOrderDetailView } from '@/components/services/work-order-detail-view';
import { getStatusConfig } from '@/lib/config/status-config';
import { formatDateDdmmyyyShortMonth } from '@/lib/date-utils';
import { normalizeServisDurumuForDb } from '@/lib/domain-mappers';
import { prisma } from '@/lib/prisma';
import type { JobAppointment } from '@/types/job-appointment';

const IN_PROGRESS_DB_STATUS = normalizeServisDurumuForDb('DEVAM_EDIYOR') as ServisDurumu;

function resolvePriority(service: {
  durum: ServisDurumu;
  tarih: Date | null;
  tahminiBitisTarihi: Date | null;
}): 'YUKSEK' | 'ORTA' | 'DUSUK' {
  const dueDate = service.tahminiBitisTarihi ?? service.tarih;
  const now = Date.now();
  const isOverdue = dueDate ? dueDate.getTime() < now : false;
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

function resolveDefaultTab(tab: string | undefined): 'genel' | 'appointments' | 'estimate' | 'plan' | 'notlar' | 'gecmis' {
  if (tab === 'appointments' || tab === 'estimate' || tab === 'plan' || tab === 'notlar' || tab === 'gecmis') {
    return tab;
  }
  return 'genel';
}

export default async function JobDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { tab?: string };
}) {
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
      bekleyenParcalar: true,
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
      ekler: {
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
      },
      appointments: {
        where: {
          deletedAt: null,
        },
        orderBy: [{ sira: 'asc' }, { baslangicAt: 'asc' }],
        select: {
          id: true,
          servisId: true,
          personelId: true,
          baslangicAt: true,
          bitisAt: true,
          status: true,
          confirmedAt: true,
          notlar: true,
          sira: true,
          kilitli: true,
          createdAt: true,
          updatedAt: true,
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
        orderBy: [{ createdAt: 'asc' }],
        select: {
          id: true,
          servisId: true,
          pricebookItemId: true,
          ad: true,
          miktar: true,
          birimFiyat: true,
          toplam: true,
          notlar: true,
          createdAt: true,
          updatedAt: true,
          pricebookItem: {
            select: {
              id: true,
              tip: true,
              kod: true,
              birim: true,
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
    take: 50,
    select: {
      id: true,
      createdAt: true,
      islemTuru: true,
      detay: true,
      userEmail: true,
    },
  });

  const statusConfig = getStatusConfig(service.durum);
  const priority = resolvePriority(service);
  const priorityLabel = priority === 'YUKSEK' ? 'Yuksek' : priority === 'ORTA' ? 'Orta' : 'Dusuk';

  const initialService = {
    id: service.id,
    tekneAdi: service.tekneAdi,
    servisAciklamasi: service.servisAciklamasi,
    isTuru: service.isTuru,
    durum: service.durum,
    oncelik: priority,
    lokasyon: service.yer,
    adres: service.adres,
    tarih: toDateKey(service.tarih),
    saat: service.saat,
    tahminiBitisTarihi: toDateKey(service.tahminiBitisTarihi),
    irtibatKisi: service.irtibatKisi,
    telefon: service.telefon,
    taseronNotlari: service.taseronNotlari,
    zorlukSeviyesi: service.zorlukSeviyesi,
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
    bekleyenParcalar: service.bekleyenParcalar.map((part) => ({
      id: part.id,
      parcaAdi: part.parcaAdi,
      miktar: part.miktar,
      birim: part.birim,
      tedarikci: part.tedarikci,
      beklenenTarih: toDateKey(part.beklenenTarih),
      aciklama: part.aciklama,
      tamamlandi: part.tamamlandi,
    })),
    appointments: service.appointments.map(
      (appointment): JobAppointment => ({
        id: appointment.id,
        servisId: appointment.servisId,
        personelId: appointment.personelId,
        personelAd: appointment.personel?.ad ?? null,
        personelUnvan: appointment.personel?.unvan ?? null,
        baslangicAt: appointment.baslangicAt.toISOString(),
        bitisAt: appointment.bitisAt.toISOString(),
        status: appointment.status,
        confirmedAt: appointment.confirmedAt ? appointment.confirmedAt.toISOString() : null,
        confirmedByEmail: appointment.confirmedBy?.email ?? null,
        notlar: appointment.notlar,
        sira: appointment.sira,
        kilitli: appointment.kilitli,
        createdAt: appointment.createdAt.toISOString(),
        updatedAt: appointment.updatedAt.toISOString(),
      })
    ),
    lineItems: service.lineItems.map((lineItem) => ({
      id: lineItem.id,
      servisId: lineItem.servisId,
      pricebookItemId: lineItem.pricebookItemId,
      ad: lineItem.ad,
      miktar: Number(lineItem.miktar.toString()),
      birimFiyat: Number(lineItem.birimFiyat.toString()),
      toplam: Number(lineItem.toplam.toString()),
      notlar: lineItem.notlar,
      createdAt: lineItem.createdAt.toISOString(),
      updatedAt: lineItem.updatedAt.toISOString(),
      pricebookItem: lineItem.pricebookItem
        ? {
            id: lineItem.pricebookItem.id,
            tip: lineItem.pricebookItem.tip,
            kod: lineItem.pricebookItem.kod,
            birim: lineItem.pricebookItem.birim,
          }
        : null,
    })),
    notlar: service.notlar.map((note) => ({
      id: note.id,
      text: note.metin,
      createdAt: note.createdAt.toISOString(),
      authorEmail: note.olusturanEmail ?? note.olusturan?.email ?? null,
      authorName: note.olusturan?.ad ?? null,
    })),
    ekler: service.ekler.map((attachment) => ({
      id: attachment.id,
      fileName: attachment.dosyaAdi,
      mimeType: attachment.mimeType,
      fileSize: attachment.dosyaBoyutu,
      createdAt: attachment.createdAt.toISOString(),
      authorEmail: attachment.olusturanEmail ?? attachment.olusturan?.email ?? null,
      authorName: attachment.olusturan?.ad ?? null,
    })),
  } as const;

  return (
    <PageContent>
      <PageHeader
        title={service.tekneAdi}
        description="Job detay"
        breadcrumbs={[
          { label: 'Operasyon', href: '/' },
          { label: 'Jobs', href: '/jobs' },
          { label: `Job #${service.id.slice(-6).toUpperCase()}` },
        ]}
        rightActions={
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/jobs/${service.id}/edit`} className="btn btn-primary h-10 px-4 py-2">
              Duzenle
            </Link>
            <Link href="/jobs" className="btn btn-secondary h-10 px-4 py-2">
              Listeye Don
            </Link>
          </div>
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="chip">Job #{service.id.slice(-6).toUpperCase()}</span>
          <Badge className={`${statusConfig.bgColor} ${statusConfig.color}`}>{statusConfig.label}</Badge>
          <span className="chip">Oncelik: {priorityLabel}</span>
          <span className="chip">Lokasyon: {service.yer || '-'}</span>
          <span className="chip">
            Tarih: {service.tarih ? formatDateDdmmyyyShortMonth(service.tarih.toISOString().slice(0, 10)) : 'Tarihsiz'}
          </span>
        </div>
      </PageHeader>

      <WorkOrderDetailView
        initialService={initialService}
        defaultTab={resolveDefaultTab(searchParams?.tab)}
        timeline={timeline.map((item) => ({
          id: item.id,
          createdAt: item.createdAt.toISOString(),
          islemTuru: item.islemTuru,
          detay: item.detay,
          userEmail: item.userEmail,
        }))}
      />
    </PageContent>
  );
}
