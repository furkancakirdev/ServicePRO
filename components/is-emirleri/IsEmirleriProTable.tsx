'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { ProTable } from '@ant-design/pro-components';
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { Button, Input, Segmented, Select, Space, Tag, message } from 'antd';
import type { SegmentedValue } from 'antd/es/segmented';
import { getStatusConfig } from '@/lib/config/status-config';
import { getLokasyonGroupFromFields, normalizeServisDurumuForApp } from '@/lib/domain-mappers';

type Oncelik = 'YUKSEK' | 'ORTA' | 'DUSUK';
type GorunumFiltresi = 'HEPSI' | 'AKTIF' | 'BEKLEYEN' | 'TARIHSIZ';

type ServisKaydi = {
  id: string;
  tekneAdi: string;
  servisAciklamasi: string;
  durum: string;
  yer: string;
  adres: string;
  tarih: string | null;
  tahminiBitisTarihi: string | null;
  personeller?: Array<{
    personelId: string;
    personel?: { ad?: string | null } | null;
  }>;
};

type ServisListeCevabi = {
  services: ServisKaydi[];
};

type IsEmriSatiri = {
  id: string;
  tekneAdi: string;
  servisAciklamasi: string;
  durum: string;
  durumEtiketi: string;
  oncelik: Oncelik;
  lokasyon: string;
  lokasyonGrubu: 'YATMARIN' | 'NETSEL' | 'DIS_SERVIS';
  tarih: string | null;
  atananSayisi: number;
};

const DURUM_SECENEKLERI = [
  { value: 'RANDEVU_VERILDI', label: 'Randevu Verildi' },
  { value: 'DEVAM_EDIYOR', label: 'Devam Ediyor' },
  { value: 'PARCA_BEKLIYOR', label: 'Parça Bekliyor' },
  { value: 'MUSTERI_ONAY_BEKLIYOR', label: 'Müşteri Onay Bekliyor' },
  { value: 'RAPOR_BEKLIYOR', label: 'Rapor Bekliyor' },
  { value: 'ERTELENDI', label: 'Ertelendi' },
  { value: 'IPTAL', label: 'İptal' },
  { value: 'TAMAMLANDI', label: 'Tamamlandı' },
];

const ONCELIK_SECENEKLERI = [
  { value: 'YUKSEK', label: 'Yüksek' },
  { value: 'ORTA', label: 'Orta' },
  { value: 'DUSUK', label: 'Düşük' },
];

const GORUNUM_SECENEKLERI: Array<{ value: GorunumFiltresi; label: string }> = [
  { value: 'HEPSI', label: 'Tümü' },
  { value: 'AKTIF', label: 'Aktif İşler' },
  { value: 'BEKLEYEN', label: 'Bekleyenler' },
  { value: 'TARIHSIZ', label: 'Tarihsiz' },
];

const DURUM_RENKLERI: Record<string, string> = {
  RANDEVU_VERILDI: 'blue',
  DEVAM_EDIYOR: 'green',
  PARCA_BEKLIYOR: 'orange',
  MUSTERI_ONAY_BEKLIYOR: 'gold',
  RAPOR_BEKLIYOR: 'cyan',
  ERTELENDI: 'purple',
  IPTAL: 'red',
  TAMAMLANDI: 'default',
};

function getAuthHeaders(): HeadersInit {
  if (typeof window === 'undefined') return {};
  const token = window.localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function formatDate(value: string | null): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function hesaplaOncelik(service: ServisKaydi): Oncelik {
  const normalizedStatus = normalizeServisDurumuForApp(service.durum);
  const dueDateRaw = service.tahminiBitisTarihi ?? service.tarih;
  const dueDate = dueDateRaw ? new Date(dueDateRaw) : null;

  if (dueDate && !Number.isNaN(dueDate.getTime())) {
    const now = new Date();
    if (dueDate.getTime() < now.getTime()) {
      return 'YUKSEK';
    }
  }

  if (normalizedStatus === 'PARCA_BEKLIYOR' || normalizedStatus === 'MUSTERI_ONAY_BEKLIYOR') {
    return 'YUKSEK';
  }

  if (normalizedStatus === 'DEVAM_EDIYOR' || normalizedStatus === 'RANDEVU_VERILDI') {
    return 'ORTA';
  }

  return 'DUSUK';
}

function satiraDonustur(service: ServisKaydi): IsEmriSatiri {
  const normalizedStatus = normalizeServisDurumuForApp(service.durum);
  const statusConfig = getStatusConfig(normalizedStatus);
  const lokasyonGrubu = getLokasyonGroupFromFields(service.yer, service.adres);

  return {
    id: service.id,
    tekneAdi: service.tekneAdi,
    servisAciklamasi: service.servisAciklamasi,
    durum: normalizedStatus,
    durumEtiketi: statusConfig.label,
    oncelik: hesaplaOncelik(service),
    lokasyon: service.yer || service.adres || '-',
    lokasyonGrubu,
    tarih: service.tarih,
    atananSayisi: service.personeller?.length ?? 0,
  };
}

function gorunumeGoreFiltrele(kayitlar: IsEmriSatiri[], gorunum: GorunumFiltresi): IsEmriSatiri[] {
  if (gorunum === 'HEPSI') return kayitlar;
  if (gorunum === 'AKTIF') {
    return kayitlar.filter((item) => item.durum === 'RANDEVU_VERILDI' || item.durum === 'DEVAM_EDIYOR');
  }
  if (gorunum === 'BEKLEYEN') {
    return kayitlar.filter((item) =>
      item.durum === 'PARCA_BEKLIYOR' ||
      item.durum === 'MUSTERI_ONAY_BEKLIYOR' ||
      item.durum === 'RAPOR_BEKLIYOR' ||
      item.durum === 'ERTELENDI'
    );
  }

  return kayitlar.filter((item) => !item.tarih);
}

function parseError(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== 'object') return fallback;
  const row = payload as { error?: string };
  return row.error ?? fallback;
}

function parseGorunum(value: string | null): GorunumFiltresi {
  if (value === 'AKTIF' || value === 'BEKLEYEN' || value === 'TARIHSIZ') {
    return value;
  }
  return 'HEPSI';
}

export function IsEmirleriProTable() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const actionRef = useRef<ActionType>();

  const [mesajApi, mesajBaglami] = message.useMessage();
  const [aramaMetni, setAramaMetni] = useState(searchParams.get('q') ?? '');
  const [durumFiltresi, setDurumFiltresi] = useState(searchParams.get('durum') ?? '');
  const [oncelikFiltresi, setOncelikFiltresi] = useState(searchParams.get('oncelik') ?? '');
  const [lokasyonFiltresi, setLokasyonFiltresi] = useState(searchParams.get('lokasyon') ?? '');
  const [gorunumFiltresi, setGorunumFiltresi] = useState<GorunumFiltresi>(
    parseGorunum(searchParams.get('gorunum'))
  );

  useEffect(() => {
    setAramaMetni(searchParams.get('q') ?? '');
    setDurumFiltresi(searchParams.get('durum') ?? '');
    setOncelikFiltresi(searchParams.get('oncelik') ?? '');
    setLokasyonFiltresi(searchParams.get('lokasyon') ?? '');
    setGorunumFiltresi(parseGorunum(searchParams.get('gorunum')));
  }, [searchParams]);

  const applyFiltersToUrl = useCallback(
    (next: {
      q?: string;
      durum?: string;
      oncelik?: string;
      lokasyon?: string;
      gorunum?: GorunumFiltresi;
    }) => {
      const params = new URLSearchParams(searchParams.toString());
      const q = (next.q ?? '').trim();
      const durum = (next.durum ?? '').trim();
      const oncelik = (next.oncelik ?? '').trim();
      const lokasyon = (next.lokasyon ?? '').trim();
      const gorunum = next.gorunum ?? 'HEPSI';

      if (q) params.set('q', q);
      else params.delete('q');

      if (durum) params.set('durum', durum);
      else params.delete('durum');

      if (oncelik) params.set('oncelik', oncelik);
      else params.delete('oncelik');

      if (lokasyon) params.set('lokasyon', lokasyon);
      else params.delete('lokasyon');

      if (gorunum !== 'HEPSI') params.set('gorunum', gorunum);
      else params.delete('gorunum');

      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const handleFilterApply = useCallback(() => {
    applyFiltersToUrl({
      q: aramaMetni,
      durum: durumFiltresi,
      oncelik: oncelikFiltresi,
      lokasyon: lokasyonFiltresi,
      gorunum: gorunumFiltresi,
    });
    void actionRef.current?.reload();
  }, [applyFiltersToUrl, aramaMetni, durumFiltresi, oncelikFiltresi, lokasyonFiltresi, gorunumFiltresi]);

  const handleFilterReset = useCallback(() => {
    setAramaMetni('');
    setDurumFiltresi('');
    setOncelikFiltresi('');
    setLokasyonFiltresi('');
    setGorunumFiltresi('HEPSI');
    applyFiltersToUrl({
      q: '',
      durum: '',
      oncelik: '',
      lokasyon: '',
      gorunum: 'HEPSI',
    });
    void actionRef.current?.reload();
  }, [applyFiltersToUrl]);

  const columns = useMemo<ProColumns<IsEmriSatiri>[]>(
    () => [
      {
        title: 'İş No',
        key: 'id',
        width: 120,
        render: (_, record) => `#${record.id.slice(-6).toLocaleUpperCase('tr-TR')}`,
      },
      {
        title: 'Tekne',
        dataIndex: 'tekneAdi',
        ellipsis: true,
      },
      {
        title: 'Açıklama',
        dataIndex: 'servisAciklamasi',
        ellipsis: true,
      },
      {
        title: 'Durum',
        dataIndex: 'durum',
        width: 200,
        render: (_, record) => (
          <Tag color={DURUM_RENKLERI[record.durum] ?? 'default'}>
            {record.durumEtiketi}
          </Tag>
        ),
      },
      {
        title: 'Öncelik',
        dataIndex: 'oncelik',
        width: 120,
        render: (_, record) => {
          const color = record.oncelik === 'YUKSEK' ? 'red' : record.oncelik === 'ORTA' ? 'gold' : 'green';
          const label = record.oncelik === 'YUKSEK' ? 'Yüksek' : record.oncelik === 'ORTA' ? 'Orta' : 'Düşük';
          return <Tag color={color}>{label}</Tag>;
        },
      },
      {
        title: 'Lokasyon',
        dataIndex: 'lokasyon',
        width: 180,
      },
      {
        title: 'Planlanan Tarih',
        dataIndex: 'tarih',
        width: 140,
        render: (_, record) => formatDate(record.tarih),
      },
      {
        title: 'Atama',
        dataIndex: 'atananSayisi',
        width: 90,
        align: 'center',
      },
      {
        title: 'İşlemler',
        key: 'actions',
        valueType: 'option',
        width: 180,
        render: (_, record) => [
          <Link key="detay" href={`/is-emirleri/${record.id}`} className="text-[#1677ff]">
            Detay
          </Link>,
          <Link key="duzenle" href={`/is-emirleri/${record.id}/edit`} className="text-[#1677ff]">
            Düzenle
          </Link>,
        ],
      },
    ],
    []
  );

  return (
    <>
      {mesajBaglami}
      <ProTable<IsEmriSatiri>
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        search={false}
        size="small"
        options={{
          density: true,
          fullScreen: true,
          setting: true,
          reload: true,
        }}
        scroll={{ x: 'max-content' }}
        pagination={{
          defaultPageSize: 20,
          showSizeChanger: true,
          pageSizeOptions: [20, 50, 100],
        }}
        request={async (params) => {
          const query = new URLSearchParams();
          query.set('limit', '500');
          if (aramaMetni.trim()) query.set('q', aramaMetni.trim());
          if (durumFiltresi) query.set('durum', durumFiltresi);
          if (lokasyonFiltresi) query.set('adresGroup', lokasyonFiltresi);

          const response = await fetch(`/api/services?${query.toString()}`, {
            cache: 'no-store',
            headers: getAuthHeaders(),
          });

          const payload = (await response.json().catch(() => null)) as ServisListeCevabi | null;
          if (!response.ok) {
            const mesaj = parseError(payload, 'İş emri listesi getirilemedi.');
            mesajApi.error(mesaj);
            return { data: [], success: false, total: 0 };
          }

          const rows = (payload?.services ?? []).map(satiraDonustur);
          const gorunumFiltreli = gorunumeGoreFiltrele(rows, gorunumFiltresi);
          const oncelikFiltreli = oncelikFiltresi
            ? gorunumFiltreli.filter((item) => item.oncelik === oncelikFiltresi)
            : gorunumFiltreli;

          const current = Number(params.current ?? 1);
          const pageSize = Number(params.pageSize ?? 20);
          const start = (current - 1) * pageSize;
          const end = start + pageSize;

          return {
            data: oncelikFiltreli.slice(start, end),
            success: true,
            total: oncelikFiltreli.length,
          };
        }}
        toolBarRender={() => [
          <Space key="filters" wrap>
            <Input
              value={aramaMetni}
              allowClear
              placeholder="Tekne, açıklama veya adres ara"
              prefix={<SearchOutlined />}
              style={{ width: 280 }}
              onChange={(event) => setAramaMetni(event.target.value)}
              onPressEnter={handleFilterApply}
            />
            <Select
              allowClear
              placeholder="Durum"
              style={{ width: 190 }}
              value={durumFiltresi || undefined}
              options={DURUM_SECENEKLERI}
              onChange={(value) => setDurumFiltresi(value ?? '')}
            />
            <Select
              allowClear
              placeholder="Öncelik"
              style={{ width: 130 }}
              value={oncelikFiltresi || undefined}
              options={ONCELIK_SECENEKLERI}
              onChange={(value) => setOncelikFiltresi(value ?? '')}
            />
            <Select
              allowClear
              placeholder="Lokasyon"
              style={{ width: 150 }}
              value={lokasyonFiltresi || undefined}
              options={[
                { value: 'YATMARIN', label: 'Yatmarin' },
                { value: 'NETSEL', label: 'Netsel' },
                { value: 'DIS_SERVIS', label: 'Dış Servis' },
              ]}
              onChange={(value) => setLokasyonFiltresi(value ?? '')}
            />
            <Segmented
              options={GORUNUM_SECENEKLERI}
              value={gorunumFiltresi}
              onChange={(value: SegmentedValue) => setGorunumFiltresi(value as GorunumFiltresi)}
            />
            <Button type="primary" onClick={handleFilterApply}>
              Filtrele
            </Button>
            <Button icon={<ReloadOutlined />} onClick={handleFilterReset}>
              Temizle
            </Button>
          </Space>,
          <Link key="create" href="/is-emirleri/yeni">
            <Button type="primary">Yeni İş Emri</Button>
          </Link>,
        ]}
      />
    </>
  );
}

export default IsEmirleriProTable;
