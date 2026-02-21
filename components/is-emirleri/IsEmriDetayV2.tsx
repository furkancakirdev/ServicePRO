'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, DatePicker, Descriptions, Form, Input, List, Modal, Select, Space, Tag, Timeline, message } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { PageContainer } from '@ant-design/pro-components';
import { getStatusConfig } from '@/lib/config/status-config';
import { normalizeServisDurumuForApp } from '@/lib/domain-mappers';

type PersonelRol = 'SORUMLU' | 'DESTEK';
type PersonelUnvan = 'USTA' | 'CIRAK' | 'YONETICI' | 'OFIS';

type IsEmriAtama = {
  id: string;
  personelId: string;
  rol: PersonelRol;
  personel: {
    id: string;
    ad: string;
    unvan: PersonelUnvan;
  };
};

type IsEmriNotu = {
  id: string;
  text: string;
  createdAt: string;
  authorEmail: string | null;
  authorName: string | null;
};

export type IsEmriDetayVerisi = {
  id: string;
  tekneAdi: string;
  servisAciklamasi: string;
  isTuru: string;
  durum: string;
  oncelik: 'YUKSEK' | 'ORTA' | 'DUSUK';
  lokasyon: string;
  adres: string;
  tarih: string | null;
  saat: string | null;
  tahminiBitisTarihi: string | null;
  irtibatKisi: string | null;
  telefon: string | null;
  taseronNotlari: string | null;
  createdAt: string;
  updatedAt: string;
  personeller: IsEmriAtama[];
  notlar?: IsEmriNotu[];
};

export type IsEmriGecmisKaydi = {
  id: string;
  createdAt: string;
  islemTuru: string;
  detay: string | null;
  userEmail: string | null;
};

type IsEmriDetayProps = {
  initialService: IsEmriDetayVerisi;
  timeline: IsEmriGecmisKaydi[];
};

type PersonelSecenegi = {
  id: string;
  ad: string;
  unvan: PersonelUnvan;
};

type BlokajNedeni = {
  key: string;
  label: string;
  durumKey: string;
};

type IsEmriSozlukCevabi = {
  blockingReasons: BlokajNedeni[];
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

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('tr-TR');
}

function parseError(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== 'object') return fallback;
  const row = payload as { error?: string };
  return row.error ?? fallback;
}

function normalizeServiceFromApi(
  raw: unknown,
  current: IsEmriDetayVerisi
): IsEmriDetayVerisi {
  if (!raw || typeof raw !== 'object') return current;
  const value = raw as Record<string, unknown>;
  const personellerRaw = Array.isArray(value.personeller) ? value.personeller : current.personeller;

  const personeller = personellerRaw.map((item) => {
    const row = item as Record<string, unknown>;
    const personel = (row.personel ?? {}) as Record<string, unknown>;
    return {
      id: String(row.id ?? ''),
      personelId: String(row.personelId ?? ''),
      rol: (String(row.rol ?? 'DESTEK').toLocaleUpperCase('tr-TR') as PersonelRol),
      personel: {
        id: String(personel.id ?? ''),
        ad: String(personel.ad ?? ''),
        unvan: (String(personel.unvan ?? 'OFIS').toLocaleUpperCase('tr-TR') as PersonelUnvan),
      },
    };
  });

  return {
    ...current,
    tekneAdi: String(value.tekneAdi ?? current.tekneAdi),
    servisAciklamasi: String(value.servisAciklamasi ?? current.servisAciklamasi),
    isTuru: String(value.isTuru ?? current.isTuru),
    durum: normalizeServisDurumuForApp(String(value.durum ?? current.durum)),
    lokasyon: String(value.yer ?? current.lokasyon),
    adres: String(value.adres ?? current.adres),
    tarih: value.tarih ? String(value.tarih) : null,
    saat: value.saat ? String(value.saat) : null,
    tahminiBitisTarihi: value.tahminiBitisTarihi ? String(value.tahminiBitisTarihi) : null,
    irtibatKisi: value.irtibatKisi ? String(value.irtibatKisi) : null,
    telefon: value.telefon ? String(value.telefon) : null,
    taseronNotlari: value.taseronNotlari ? String(value.taseronNotlari) : null,
    personeller,
    updatedAt: value.updatedAt ? String(value.updatedAt) : current.updatedAt,
  };
}

export function IsEmriDetayV2({ initialService, timeline }: IsEmriDetayProps) {
  const router = useRouter();
  const [mesajApi, mesajBaglami] = message.useMessage();

  const [service, setService] = useState(initialService);
  const [notes, setNotes] = useState<IsEmriNotu[]>(initialService.notlar ?? []);
  const [activeTab, setActiveTab] = useState('genel');
  const [loading, setLoading] = useState(false);

  const [personeller, setPersoneller] = useState<PersonelSecenegi[]>([]);
  const [personelLoading, setPersonelLoading] = useState(true);
  const [blokajNedenleri, setBlokajNedenleri] = useState<BlokajNedeni[]>([]);

  const [atamaModalAcik, setAtamaModalAcik] = useState(false);
  const [planlamaModalAcik, setPlanlamaModalAcik] = useState(false);
  const [blokajModalAcik, setBlokajModalAcik] = useState(false);
  const [kapanisModalAcik, setKapanisModalAcik] = useState(false);

  const [seciliPersonelId, setSeciliPersonelId] = useState('');
  const [seciliRol, setSeciliRol] = useState<PersonelRol>('DESTEK');
  const [planlananTarih, setPlanlananTarih] = useState<Dayjs | null>(
    service.tarih ? dayjs(service.tarih) : null
  );
  const [planlananSaat, setPlanlananSaat] = useState(service.saat ?? '');
  const [blokajNedeniKey, setBlokajNedeniKey] = useState('');
  const [blokajNotu, setBlokajNotu] = useState('');
  const [kapanisOzeti, setKapanisOzeti] = useState('');
  const [yeniNot, setYeniNot] = useState('');

  useEffect(() => {
    const personelYukle = async () => {
      setPersonelLoading(true);
      try {
        const response = await fetch('/api/personel?aktif=true', {
          cache: 'no-store',
          headers: getAuthHeaders(),
        });
        const payload = (await response.json().catch(() => null)) as
          | Array<{ id: string; ad: string; unvan: string }>
          | null;
        if (!response.ok) {
          throw new Error(parseError(payload, 'Personel listesi getirilemedi.'));
        }

        setPersoneller(
          (payload ?? []).map((item) => ({
            id: item.id,
            ad: item.ad,
            unvan: item.unvan.toLocaleUpperCase('tr-TR') as PersonelUnvan,
          }))
        );
      } catch (error) {
        mesajApi.error(error instanceof Error ? error.message : 'Personel listesi getirilemedi.');
      } finally {
        setPersonelLoading(false);
      }
    };

    const blokajNedeniYukle = async () => {
      try {
        const response = await fetch('/api/dictionaries/work-order', {
          cache: 'no-store',
          headers: getAuthHeaders(),
        });
        const payload = (await response.json().catch(() => null)) as IsEmriSozlukCevabi | null;
        if (!response.ok) {
          throw new Error(parseError(payload, 'Blokaj nedenleri getirilemedi.'));
        }
        setBlokajNedenleri(payload?.blockingReasons ?? []);
      } catch (error) {
        mesajApi.error(error instanceof Error ? error.message : 'Blokaj nedenleri getirilemedi.');
      }
    };

    void personelYukle();
    void blokajNedeniYukle();
  }, [mesajApi]);

  const updateService = useCallback(
    async (payload: Record<string, unknown>) => {
      setLoading(true);
      try {
        const response = await fetch(`/api/services/${service.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
          },
          body: JSON.stringify(payload),
        });

        const body = (await response.json().catch(() => null)) as unknown;
        if (!response.ok) {
          throw new Error(parseError(body, 'İş emri güncellenemedi.'));
        }

        setService((current) => normalizeServiceFromApi(body, current));
        router.refresh();
      } finally {
        setLoading(false);
      }
    },
    [router, service.id]
  );

  const statusConfig = useMemo(() => getStatusConfig(service.durum), [service.durum]);
  const oncelikLabel = service.oncelik === 'YUKSEK'
    ? 'Yüksek'
    : service.oncelik === 'ORTA'
      ? 'Orta'
      : 'Düşük';

  const handleAtamaKaydet = useCallback(async () => {
    if (!seciliPersonelId) {
      mesajApi.error('Teknisyen seçimi zorunludur.');
      return;
    }

    const yeniAtamalar = service.personeller
      .filter((item) => item.personelId !== seciliPersonelId)
      .map((item) => ({ personelId: item.personelId, rol: item.rol }));
    yeniAtamalar.push({ personelId: seciliPersonelId, rol: seciliRol });

    try {
      await updateService({ personeller: yeniAtamalar });
      mesajApi.success('Teknisyen ataması güncellendi.');
      setSeciliPersonelId('');
      setSeciliRol('DESTEK');
      setAtamaModalAcik(false);
    } catch (error) {
      mesajApi.error(error instanceof Error ? error.message : 'Teknisyen ataması kaydedilemedi.');
    }
  }, [mesajApi, seciliPersonelId, seciliRol, service.personeller, updateService]);

  const handlePlanlamaKaydet = useCallback(async () => {
    if (!planlananTarih) {
      mesajApi.error('Planlama tarihi zorunludur.');
      return;
    }

    const tarih = planlananTarih.format('YYYY-MM-DD');
    try {
      await updateService({
        tarih,
        saat: planlananSaat.trim() ? planlananSaat.trim() : null,
      });
      mesajApi.success('Planlama tarihi güncellendi.');
      setPlanlamaModalAcik(false);
    } catch (error) {
      mesajApi.error(error instanceof Error ? error.message : 'Planlama kaydedilemedi.');
    }
  }, [mesajApi, planlananSaat, planlananTarih, updateService]);

  const handleBlokajKaydet = useCallback(async () => {
    if (!blokajNedeniKey) {
      mesajApi.error('Blokaj nedeni seçimi zorunludur.');
      return;
    }

    if (!blokajNotu.trim()) {
      mesajApi.error('Blokaj notu zorunludur.');
      return;
    }

    const secilenNeden = blokajNedenleri.find((item) => item.key === blokajNedeniKey);
    if (!secilenNeden) {
      mesajApi.error('Geçerli bir blokaj nedeni seçin.');
      return;
    }

    try {
      await updateService({
        durum: secilenNeden.durumKey,
        taseronNotlari: `BLOKAJ: ${secilenNeden.label}\nNot: ${blokajNotu.trim()}`,
      });
      mesajApi.success('İş emri blokaja alındı.');
      setBlokajNedeniKey('');
      setBlokajNotu('');
      setBlokajModalAcik(false);
    } catch (error) {
      mesajApi.error(error instanceof Error ? error.message : 'Blokaj kaydı başarısız.');
    }
  }, [blokajNedeniKey, blokajNedenleri, blokajNotu, mesajApi, updateService]);

  const handleKapanisKaydet = useCallback(async () => {
    if (!kapanisOzeti.trim()) {
      mesajApi.error('Kapanış özeti zorunludur.');
      return;
    }
    if (service.personeller.length === 0) {
      mesajApi.error('Kapanış için en az bir teknisyen atanmış olmalıdır.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/services/${service.id}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          personeller: service.personeller.map((item) => ({
            personelId: item.personelId,
            rol: item.rol,
          })),
          bonusPersonelIds: [],
          kaliteKontrol: {
            uniteModelVar: true,
            uniteSaatiVar: true,
            uniteSeriNoVar: true,
            aciklamaYeterli: true,
            adamSaatVar: true,
            fotograflarVar: true,
          },
          zorlukOverride: null,
          kapanisOzeti: kapanisOzeti.trim(),
        }),
      });

      const body = (await response.json().catch(() => null)) as unknown;
      if (!response.ok) {
        throw new Error(parseError(body, 'İş emri kapatılamadı.'));
      }

      setService((current) => ({ ...current, durum: 'TAMAMLANDI' }));
      setKapanisOzeti('');
      setKapanisModalAcik(false);
      mesajApi.success('İş emri başarıyla kapatıldı.');
      router.refresh();
    } catch (error) {
      mesajApi.error(error instanceof Error ? error.message : 'İş emri kapatılamadı.');
    } finally {
      setLoading(false);
    }
  }, [kapanisOzeti, mesajApi, router, service.id, service.personeller]);

  const handleNotEkle = useCallback(async () => {
    const metin = yeniNot.trim();
    if (!metin) {
      mesajApi.error('Not metni boş olamaz.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/services/${service.id}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ text: metin }),
      });
      const body = (await response.json().catch(() => null)) as IsEmriNotu | { error?: string } | null;
      if (!response.ok) {
        throw new Error(parseError(body, 'Not eklenemedi.'));
      }

      setNotes((current) => [body as IsEmriNotu, ...current]);
      setYeniNot('');
      mesajApi.success('Not eklendi.');
    } catch (error) {
      mesajApi.error(error instanceof Error ? error.message : 'Not eklenemedi.');
    } finally {
      setLoading(false);
    }
  }, [mesajApi, service.id, yeniNot]);

  const tabItems = useMemo(
    () => [
      { key: 'genel', tab: 'Genel' },
      { key: 'planlama', tab: 'Planlama' },
      { key: 'notlar', tab: 'Notlar' },
      { key: 'gecmis', tab: 'Geçmiş' },
    ],
    []
  );

  return (
    <>
      {mesajBaglami}
      <PageContainer
        title={service.tekneAdi}
        subTitle={`İş #${service.id.slice(-6).toLocaleUpperCase('tr-TR')}`}
        breadcrumb={{
          items: [
            { path: '/operasyon', title: 'Operasyon' },
            { path: '/is-emirleri', title: 'İş Emirleri' },
            { title: `İş #${service.id.slice(-6).toLocaleUpperCase('tr-TR')}` },
          ],
        }}
        tags={
          <Space wrap>
            <Tag color="blue">{statusConfig.label}</Tag>
            <Tag color={service.oncelik === 'YUKSEK' ? 'red' : service.oncelik === 'ORTA' ? 'gold' : 'green'}>
              Öncelik: {oncelikLabel}
            </Tag>
          </Space>
        }
        extra={[
          <Button key="atama" onClick={() => setAtamaModalAcik(true)}>
            Teknisyen Ata
          </Button>,
          <Button key="planla" onClick={() => setPlanlamaModalAcik(true)}>
            Planlama Tarihi
          </Button>,
          <Button key="blokaj" onClick={() => setBlokajModalAcik(true)}>
            Blokaj Ekle
          </Button>,
          <Button
            key="kapat"
            type="primary"
            onClick={() => setKapanisModalAcik(true)}
            disabled={service.durum === 'TAMAMLANDI'}
          >
            İş Emrini Kapat
          </Button>,
        ]}
        tabList={tabItems}
        tabActiveKey={activeTab}
        onTabChange={setActiveTab}
      >
        {activeTab === 'genel' ? (
          <Card>
            <Descriptions column={2} size="small" bordered>
              <Descriptions.Item label="İş Açıklaması">{service.servisAciklamasi}</Descriptions.Item>
              <Descriptions.Item label="İş Türü">{service.isTuru}</Descriptions.Item>
              <Descriptions.Item label="Lokasyon">{service.lokasyon || '-'}</Descriptions.Item>
              <Descriptions.Item label="Adres">{service.adres || '-'}</Descriptions.Item>
              <Descriptions.Item label="İrtibat">{service.irtibatKisi || '-'}</Descriptions.Item>
              <Descriptions.Item label="Telefon">{service.telefon || '-'}</Descriptions.Item>
              <Descriptions.Item label="Atanan Teknisyenler" span={2}>
                {service.personeller.length === 0
                  ? 'Atama yapılmamış.'
                  : service.personeller.map((item) => `${item.personel.ad} (${item.rol})`).join(', ')}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        ) : null}

        {activeTab === 'planlama' ? (
          <Card>
            <Descriptions column={2} size="small" bordered>
              <Descriptions.Item label="Planlanan Tarih">{formatDate(service.tarih)}</Descriptions.Item>
              <Descriptions.Item label="Planlanan Saat">{service.saat || '-'}</Descriptions.Item>
              <Descriptions.Item label="Tahmini Bitiş">{formatDate(service.tahminiBitisTarihi)}</Descriptions.Item>
              <Descriptions.Item label="Durum">{statusConfig.label}</Descriptions.Item>
            </Descriptions>
          </Card>
        ) : null}

        {activeTab === 'notlar' ? (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Card title="Yeni Not">
              <Input.TextArea
                value={yeniNot}
                onChange={(event) => setYeniNot(event.target.value)}
                rows={4}
                placeholder="Operasyon notu ekleyin..."
              />
              <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
                <Button type="primary" onClick={() => void handleNotEkle()} loading={loading}>
                  Not Ekle
                </Button>
              </div>
            </Card>
            <Card title="Not Geçmişi">
              <List
                locale={{ emptyText: 'Henüz not bulunmuyor.' }}
                dataSource={notes}
                renderItem={(item) => (
                  <List.Item key={item.id}>
                    <List.Item.Meta
                      title={`${item.authorName || item.authorEmail || 'Kullanıcı'} • ${formatDateTime(item.createdAt)}`}
                      description={item.text}
                    />
                  </List.Item>
                )}
              />
            </Card>
          </Space>
        ) : null}

        {activeTab === 'gecmis' ? (
          <Card>
            {timeline.length === 0 ? (
              <p>Geçmiş kaydı bulunmuyor.</p>
            ) : (
              <Timeline
                items={timeline.map((item) => ({
                  color: 'blue',
                  children: (
                    <Space direction="vertical" size={0}>
                      <strong>{item.islemTuru}</strong>
                      <span>{item.detay || '-'}</span>
                      <small>{formatDateTime(item.createdAt)}</small>
                      {item.userEmail ? <small>{item.userEmail}</small> : null}
                    </Space>
                  ),
                }))}
              />
            )}
          </Card>
        ) : null}
      </PageContainer>

      <Modal
        title="Teknisyen Ata"
        open={atamaModalAcik}
        onCancel={() => setAtamaModalAcik(false)}
        onOk={() => void handleAtamaKaydet()}
        okText="Kaydet"
        cancelText="Vazgeç"
        confirmLoading={loading}
      >
        <Form layout="vertical">
          <Form.Item label="Teknisyen" required>
            <Select
              loading={personelLoading}
              placeholder="Teknisyen seçin"
              value={seciliPersonelId || undefined}
              onChange={(value) => setSeciliPersonelId(value)}
              options={personeller.map((item) => ({
                value: item.id,
                label: `${item.ad} (${item.unvan})`,
              }))}
            />
          </Form.Item>
          <Form.Item label="Rol" required>
            <Select
              value={seciliRol}
              onChange={(value) => setSeciliRol(value)}
              options={[
                { value: 'SORUMLU', label: 'Sorumlu' },
                { value: 'DESTEK', label: 'Destek' },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Planlama Tarihi Güncelle"
        open={planlamaModalAcik}
        onCancel={() => setPlanlamaModalAcik(false)}
        onOk={() => void handlePlanlamaKaydet()}
        okText="Kaydet"
        cancelText="Vazgeç"
        confirmLoading={loading}
      >
        <Form layout="vertical">
          <Form.Item label="Planlanan Tarih" required>
            <DatePicker
              value={planlananTarih}
              onChange={(value) => setPlanlananTarih(value)}
              format="DD.MM.YYYY"
              style={{ width: '100%' }}
            />
          </Form.Item>
          <Form.Item label="Saat (opsiyonel)">
            <Input
              type="time"
              value={planlananSaat}
              onChange={(event) => setPlanlananSaat(event.target.value)}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Blokaj Kaydı"
        open={blokajModalAcik}
        onCancel={() => setBlokajModalAcik(false)}
        onOk={() => void handleBlokajKaydet()}
        okText="Blokaja Al"
        cancelText="Vazgeç"
        confirmLoading={loading}
      >
        <Form layout="vertical">
          <Form.Item label="Blokaj Nedeni" required>
            <Select
              placeholder="Neden seçin"
              value={blokajNedeniKey || undefined}
              onChange={(value) => setBlokajNedeniKey(value)}
              options={blokajNedenleri.map((item) => ({ value: item.key, label: item.label }))}
            />
          </Form.Item>
          <Form.Item label="Blokaj Notu" required>
            <Input.TextArea
              rows={4}
              value={blokajNotu}
              onChange={(event) => setBlokajNotu(event.target.value)}
              placeholder="Blokajı açıklayan notu yazın..."
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="İş Emrini Kapat"
        open={kapanisModalAcik}
        onCancel={() => setKapanisModalAcik(false)}
        onOk={() => void handleKapanisKaydet()}
        okText="Kapat"
        cancelText="Vazgeç"
        confirmLoading={loading}
      >
        <Form layout="vertical">
          <Form.Item label="Kapanış Özeti" required>
            <Input.TextArea
              rows={5}
              value={kapanisOzeti}
              onChange={(event) => setKapanisOzeti(event.target.value)}
              placeholder="Yapılan işlem ve sonucu özetleyin..."
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

export default IsEmriDetayV2;
