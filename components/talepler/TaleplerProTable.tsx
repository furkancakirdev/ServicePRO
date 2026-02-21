'use client';

import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import {
  ModalForm,
  ProFormDateTimePicker,
  ProFormSelect,
  ProFormText,
  ProTable,
} from '@ant-design/pro-components';
import { Button, Input, Popconfirm, Select, Space, Tag, message } from 'antd';
import type { Dayjs } from 'dayjs';
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { formatDateTimeForUi } from '@/lib/timezone';
import type { LeadRecord, LeadStatus } from '@/types/call-booking';

type LeadListResponse = {
  leads: LeadRecord[];
};

type CreateTalepFormValues = {
  ad?: string;
  telefon?: string;
  email?: string;
  konu?: string;
  takipAt?: Dayjs;
  status?: LeadStatus;
};

type OwnerOption = {
  value: string;
  label: string;
};

const DURUM_ETIKETLERI: Record<LeadStatus, string> = {
  YENI: 'Yeni',
  TAKIPTE: 'Takipte',
  TEKLIF_BEKLIYOR: 'Teklif Bekliyor',
  KAYBEDILDI: 'Kaybedildi',
  KAZANILDI: 'Kazanıldı',
};

const DURUM_RENKLERI: Record<LeadStatus, string> = {
  YENI: 'blue',
  TAKIPTE: 'gold',
  TEKLIF_BEKLIYOR: 'purple',
  KAYBEDILDI: 'red',
  KAZANILDI: 'green',
};

const DURUM_SECENEKLERI = Object.entries(DURUM_ETIKETLERI).map(([value, label]) => ({
  value: value as LeadStatus,
  label,
}));

function getAuthHeaders(): HeadersInit {
  if (typeof window === 'undefined') return {};
  const token = window.localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function parseError(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== 'object') return fallback;
  const row = payload as { error?: string };
  return row.error ?? fallback;
}

export function TaleplerProTable() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const actionRef = useRef<ActionType>();

  const [aramaMetni, setAramaMetni] = useState(searchParams.get('q') ?? '');
  const [durumFiltresi, setDurumFiltresi] = useState(searchParams.get('status') ?? '');
  const [sorumluFiltresi, setSorumluFiltresi] = useState(searchParams.get('owner') ?? '');
  const [ownerOptions, setOwnerOptions] = useState<OwnerOption[]>([]);
  const [mesajApi, mesajBaglami] = message.useMessage();

  useEffect(() => {
    setAramaMetni(searchParams.get('q') ?? '');
    setDurumFiltresi(searchParams.get('status') ?? '');
    setSorumluFiltresi(searchParams.get('owner') ?? '');
  }, [searchParams]);

  const applyFiltersToUrl = useCallback(
    (filters: { q?: string; status?: string; owner?: string }) => {
      const params = new URLSearchParams(searchParams.toString());

      const q = (filters.q ?? '').trim();
      const status = (filters.status ?? '').trim();
      const owner = (filters.owner ?? '').trim();

      if (q) params.set('q', q);
      else params.delete('q');

      if (status) params.set('status', status);
      else params.delete('status');

      if (owner) params.set('owner', owner);
      else params.delete('owner');

      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const handleFilterApply = useCallback(() => {
    applyFiltersToUrl({
      q: aramaMetni,
      status: durumFiltresi,
      owner: sorumluFiltresi,
    });
    void actionRef.current?.reload();
  }, [applyFiltersToUrl, aramaMetni, durumFiltresi, sorumluFiltresi]);

  const handleFilterReset = useCallback(() => {
    setAramaMetni('');
    setDurumFiltresi('');
    setSorumluFiltresi('');
    applyFiltersToUrl({ q: '', status: '', owner: '' });
    void actionRef.current?.reload();
  }, [applyFiltersToUrl]);

  const handleCreateTalep = useCallback(
    async (values: CreateTalepFormValues) => {
      if (!values.ad?.trim() && !values.telefon?.trim()) {
        mesajApi.error('En az ad veya telefon bilgisi zorunludur.');
        return false;
      }

      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          ad: values.ad?.trim() || null,
          telefon: values.telefon?.trim() || null,
          email: values.email?.trim() || null,
          konu: values.konu?.trim() || null,
          status: values.status ?? 'YENI',
          kaynak: 'office',
          takipAt: values.takipAt ? values.takipAt.format('YYYY-MM-DDTHH:mm') : null,
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        mesajApi.error(parseError(payload, 'Talep oluşturulamadı.'));
        return false;
      }

      mesajApi.success('Talep oluşturuldu.');
      void actionRef.current?.reload();
      return true;
    },
    [mesajApi]
  );

  const handleConvertToJob = useCallback(
    async (lead: LeadRecord) => {
      const response = await fetch(`/api/leads/${lead.id}/convert-to-job`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({}),
      });

      const payload = (await response.json().catch(() => null)) as
        | {
            error?: string;
            job?: { id: string };
          }
        | null;

      if (!response.ok) {
        mesajApi.error(parseError(payload, 'Talep iş emrine dönüştürülemedi.'));
        return;
      }

      const jobId = payload?.job?.id;
      if (!jobId) {
        mesajApi.success('Talep dönüştürüldü.');
        void actionRef.current?.reload();
        return;
      }

      mesajApi.success('Talep iş emrine dönüştürüldü.');
      router.push(`/is-emirleri/${jobId}`);
    },
    [mesajApi, router]
  );

  const columns = useMemo<ProColumns<LeadRecord>[]>(
    () => [
      {
        title: 'Talep No',
        key: 'id',
        width: 120,
        render: (_, record) => `#${record.id.slice(-6).toLocaleUpperCase('tr-TR')}`,
      },
      {
        title: 'Ad Soyad',
        dataIndex: 'ad',
        ellipsis: true,
        renderText: (value) => value || '-',
      },
      {
        title: 'Telefon',
        dataIndex: 'telefon',
        width: 160,
        renderText: (value) => value || '-',
      },
      {
        title: 'Konu',
        dataIndex: 'konu',
        ellipsis: true,
        renderText: (value) => value || '-',
      },
      {
        title: 'Durum',
        dataIndex: 'status',
        width: 150,
        render: (_, record) => (
          <Tag color={DURUM_RENKLERI[record.status]}>
            {DURUM_ETIKETLERI[record.status]}
          </Tag>
        ),
      },
      {
        title: 'Sorumlu',
        key: 'owner',
        width: 180,
        render: (_, record) => record.ownerUser?.ad || '-',
      },
      {
        title: 'Takip Tarihi',
        dataIndex: 'takipAt',
        width: 200,
        render: (_, record) => (record.takipAt ? formatDateTimeForUi(record.takipAt) : '-'),
      },
      {
        title: 'İşlemler',
        key: 'actions',
        width: 240,
        valueType: 'option',
        render: (_, record): ReactNode[] => [
          <Link key="detay" href={`/talepler/${record.id}`} className="text-[#1677ff]">
            Detay
          </Link>,
          <Popconfirm
            key="convert"
            title="Talep iş emrine dönüştürülsün mü?"
            okText="Dönüştür"
            cancelText="Vazgeç"
            onConfirm={() => handleConvertToJob(record)}
          >
            <a>İş Emrine Dönüştür</a>
          </Popconfirm>,
        ],
      },
    ],
    [handleConvertToJob]
  );

  return (
    <>
      {mesajBaglami}
      <ProTable<LeadRecord>
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        search={false}
        size="small"
        pagination={{
          defaultPageSize: 20,
          showSizeChanger: true,
          pageSizeOptions: [20, 50, 100],
        }}
        options={{
          density: true,
          fullScreen: true,
          reload: true,
          setting: true,
        }}
        scroll={{ x: 'max-content' }}
        request={async (params) => {
          const query = new URLSearchParams();
          if (aramaMetni.trim()) query.set('q', aramaMetni.trim());
          if (durumFiltresi) query.set('status', durumFiltresi);
          if (sorumluFiltresi) query.set('owner', sorumluFiltresi);

          const response = await fetch(`/api/leads?${query.toString()}`, {
            cache: 'no-store',
            headers: getAuthHeaders(),
          });

          const payload = (await response.json().catch(() => null)) as LeadListResponse | null;
          if (!response.ok) {
            throw new Error(parseError(payload, 'Talep listesi getirilemedi.'));
          }

          const allRows = payload?.leads ?? [];
          const ownerMap = new Map<string, OwnerOption>();
          for (const row of allRows) {
            if (!row.ownerUser?.id) continue;
            ownerMap.set(row.ownerUser.id, {
              value: row.ownerUser.id,
              label: row.ownerUser.ad || row.ownerUser.email || row.ownerUser.id,
            });
          }
          setOwnerOptions(Array.from(ownerMap.values()));

          const current = Number(params.current ?? 1);
          const pageSize = Number(params.pageSize ?? 20);
          const start = (current - 1) * pageSize;
          const end = start + pageSize;

          return {
            data: allRows.slice(start, end),
            success: true,
            total: allRows.length,
          };
        }}
        toolbar={{
          search: false,
        }}
        toolBarRender={() => [
          <Space key="filters" wrap>
            <Input
              value={aramaMetni}
              allowClear
              placeholder="Ad, telefon, e-posta veya konu"
              prefix={<SearchOutlined />}
              style={{ width: 280 }}
              onChange={(event) => setAramaMetni(event.target.value)}
              onPressEnter={handleFilterApply}
            />
            <Select
              allowClear
              placeholder="Durum"
              style={{ width: 180 }}
              value={durumFiltresi || undefined}
              options={DURUM_SECENEKLERI}
              onChange={(value) => setDurumFiltresi(value ?? '')}
            />
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="Sorumlu"
              style={{ width: 220 }}
              value={sorumluFiltresi || undefined}
              options={ownerOptions}
              onChange={(value) => setSorumluFiltresi(value ?? '')}
            />
            <Button type="primary" onClick={handleFilterApply}>
              Filtrele
            </Button>
            <Button icon={<ReloadOutlined />} onClick={handleFilterReset}>
              Temizle
            </Button>
          </Space>,
          <ModalForm<CreateTalepFormValues>
            key="create-talep"
            title="Yeni Talep"
            trigger={<Button type="primary">Yeni Talep</Button>}
            submitter={{
              searchConfig: {
                submitText: 'Kaydet',
                resetText: 'Temizle',
              },
            }}
            initialValues={{
              status: 'YENI',
            }}
            onFinish={handleCreateTalep}
          >
            <ProFormText name="ad" label="Ad Soyad" placeholder="Talep sahibinin adı" />
            <ProFormText name="telefon" label="Telefon" placeholder="Telefon numarası" />
            <ProFormText name="email" label="E-posta" placeholder="E-posta adresi" />
            <ProFormText name="konu" label="Konu" placeholder="Talep konusu" />
            <ProFormDateTimePicker
              name="takipAt"
              label="Takip Tarihi"
              fieldProps={{
                format: 'DD.MM.YYYY HH:mm',
                showNow: true,
              }}
            />
            <ProFormSelect
              name="status"
              label="Durum"
              options={DURUM_SECENEKLERI}
            />
          </ModalForm>,
        ]}
      />
    </>
  );
}

export default TaleplerProTable;
