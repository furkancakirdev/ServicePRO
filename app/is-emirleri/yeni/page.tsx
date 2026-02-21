'use client';

import type { Dayjs } from 'dayjs';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { Alert, Button, Card, Col, DatePicker, Form, Input, Row, Select, Space, Spin, message } from 'antd';

type TekneSecenegi = {
  id: string;
  ad: string;
  adres: string | null;
  telefon: string | null;
};

type DurumSozlugu = {
  key: string;
  label: string;
};

type LokasyonSozlugu = {
  key: string;
  label: string;
};

type SozlukYaniti = {
  statuses?: DurumSozlugu[];
  locations?: LokasyonSozlugu[];
};

type YeniIsEmriFormu = {
  tekneId: string;
  tarih?: Dayjs;
  saat?: string;
  isTuru: 'PAKET' | 'ARIZA' | 'PROJE';
  durum: string;
  yer: string;
  adres: string;
  servisAciklamasi: string;
  irtibatKisi?: string;
  telefon?: string;
};

const IS_TURU_SECENEKLERI = [
  { value: 'PAKET', label: 'Paket' },
  { value: 'ARIZA', label: 'Arıza' },
  { value: 'PROJE', label: 'Proje' },
] as const;

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

export default function YeniIsEmriPage() {
  const router = useRouter();
  const [form] = Form.useForm<YeniIsEmriFormu>();
  const [mesajApi, mesajBaglami] = message.useMessage();
  const [yukleniyor, setYukleniyor] = useState(true);
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [tekneler, setTekneler] = useState<TekneSecenegi[]>([]);
  const [durumlar, setDurumlar] = useState<DurumSozlugu[]>([]);
  const [lokasyonlar, setLokasyonlar] = useState<LokasyonSozlugu[]>([]);

  const tekneMap = useMemo(() => new Map(tekneler.map((tekne) => [tekne.id, tekne])), [tekneler]);
  const lokasyonMap = useMemo(
    () => new Map(lokasyonlar.map((lokasyon) => [lokasyon.key, lokasyon])),
    [lokasyonlar]
  );

  const optionsYukle = useCallback(async () => {
    setYukleniyor(true);
    try {
      const authHeaders = getAuthHeaders();
      const [teknelerResponse, sozlukResponse] = await Promise.all([
        fetch('/api/tekneler', {
          cache: 'no-store',
          credentials: 'include',
          headers: authHeaders,
        }),
        fetch('/api/dictionaries/work-order', {
          cache: 'no-store',
          credentials: 'include',
          headers: authHeaders,
        }),
      ]);

      const [teknelerPayload, sozlukPayload] = await Promise.all([
        teknelerResponse.json().catch(() => null),
        sozlukResponse.json().catch(() => null),
      ]);

      if (!teknelerResponse.ok) {
        throw new Error(parseError(teknelerPayload, 'Tekne listesi yüklenemedi.'));
      }
      if (!sozlukResponse.ok) {
        throw new Error(parseError(sozlukPayload, 'İş emri sözlükleri yüklenemedi.'));
      }

      const tekneListesi = (teknelerPayload as TekneSecenegi[]) ?? [];
      const sozlukListesi = (sozlukPayload as SozlukYaniti) ?? {};

      setTekneler(tekneListesi);
      setDurumlar(sozlukListesi.statuses ?? []);
      setLokasyonlar(sozlukListesi.locations ?? []);

      const varsayilanDurum =
        (sozlukListesi.statuses ?? []).find((durum) => durum.key === 'RANDEVU_VERILDI')?.key ??
        (sozlukListesi.statuses ?? [])[0]?.key ??
        'RANDEVU_VERILDI';

      const varsayilanLokasyon = (sozlukListesi.locations ?? [])[0]?.key;

      form.setFieldsValue({
        isTuru: 'PAKET',
        durum: varsayilanDurum,
        yer: varsayilanLokasyon,
      });
    } catch (error) {
      mesajApi.error(error instanceof Error ? error.message : 'Seçim listeleri yüklenemedi.');
    } finally {
      setYukleniyor(false);
    }
  }, [form, mesajApi]);

  useEffect(() => {
    void optionsYukle();
  }, [optionsYukle]);

  const tekneDegisti = useCallback(
    (tekneId: string) => {
      const tekne = tekneMap.get(tekneId);
      if (!tekne) return;

      if (!form.getFieldValue('adres') && tekne.adres) {
        form.setFieldValue('adres', tekne.adres);
      }
      if (!form.getFieldValue('telefon') && tekne.telefon) {
        form.setFieldValue('telefon', tekne.telefon);
      }
    },
    [form, tekneMap]
  );

  const lokasyonDegisti = useCallback(
    (lokasyonKey: string) => {
      if (form.getFieldValue('adres')) return;
      const lokasyon = lokasyonMap.get(lokasyonKey);
      if (lokasyon) {
        form.setFieldValue('adres', lokasyon.label);
      }
    },
    [form, lokasyonMap]
  );

  const kaydet = useCallback(
    async (values: YeniIsEmriFormu) => {
      const tekne = tekneMap.get(values.tekneId);
      if (!tekne) {
        mesajApi.error('Geçerli bir tekne seçin.');
        return;
      }

      setKaydediliyor(true);
      try {
        const lokasyon = lokasyonMap.get(values.yer);
        const response = await fetch('/api/services', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
          },
          body: JSON.stringify({
            tekneId: tekne.id,
            tekneAdi: tekne.ad,
            tarih: values.tarih ? values.tarih.format('YYYY-MM-DD') : null,
            saat: values.saat?.trim() || null,
            isTuru: values.isTuru,
            durum: values.durum,
            yer: lokasyon?.label ?? values.yer,
            adres: values.adres.trim(),
            servisAciklamasi: values.servisAciklamasi.trim(),
            irtibatKisi: values.irtibatKisi?.trim() || null,
            telefon: values.telefon?.trim() || null,
          }),
        });

        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(parseError(payload, 'İş emri oluşturulamadı.'));
        }

        const created = payload as { id?: string };
        if (!created.id) {
          throw new Error('İş emri oluşturuldu ancak detay sayfası açılamadı.');
        }

        mesajApi.success('İş emri oluşturuldu.');
        router.push(`/is-emirleri/${created.id}`);
        router.refresh();
      } catch (error) {
        mesajApi.error(error instanceof Error ? error.message : 'İş emri oluşturulamadı.');
      } finally {
        setKaydediliyor(false);
      }
    },
    [lokasyonMap, mesajApi, router, tekneMap]
  );

  if (yukleniyor) {
    return (
      <>
        {mesajBaglami}
        <PageContainer title="Yeni İş Emri">
          <Card>
            <Space>
              <Spin size="small" />
              Seçim listeleri yükleniyor...
            </Space>
          </Card>
        </PageContainer>
      </>
    );
  }

  return (
    <>
      {mesajBaglami}
      <PageContainer
        title="Yeni İş Emri"
        subTitle="Talep veya acil ihtiyaç için yeni iş emri oluşturun."
      >
        <Card style={{ marginBottom: 16 }}>
          <Space wrap>
            <Button icon={<ArrowLeftOutlined />} onClick={() => router.back()}>
              Geri Dön
            </Button>
            <Button onClick={() => router.push('/is-emirleri')}>İş Emirleri Listesi</Button>
          </Space>
        </Card>

        <Card title="İş Emri Bilgileri">
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
            message="Planlama ekranı yalnızca tarih belirler; teknisyen atamasını iş emri detayından yapın."
          />

          <Form<YeniIsEmriFormu>
            layout="vertical"
            form={form}
            onFinish={(values) => void kaydet(values)}
          >
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item
                  name="tekneId"
                  label="Tekne"
                  rules={[{ required: true, message: 'Tekne seçimi zorunludur.' }]}
                >
                  <Select
                    showSearch
                    optionFilterProp="label"
                    options={tekneler.map((tekne) => ({
                      value: tekne.id,
                      label: tekne.ad,
                    }))}
                    onChange={tekneDegisti}
                    placeholder="Tekne seçin"
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={6}>
                <Form.Item
                  name="isTuru"
                  label="İş Türü"
                  rules={[{ required: true, message: 'İş türü seçimi zorunludur.' }]}
                >
                  <Select options={IS_TURU_SECENEKLERI as unknown as Array<{ value: string; label: string }>} />
                </Form.Item>
              </Col>
              <Col xs={24} md={6}>
                <Form.Item
                  name="durum"
                  label="Durum"
                  rules={[{ required: true, message: 'Durum seçimi zorunludur.' }]}
                >
                  <Select
                    options={durumlar.map((durum) => ({ value: durum.key, label: durum.label }))}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  name="yer"
                  label="Lokasyon"
                  rules={[{ required: true, message: 'Lokasyon seçimi zorunludur.' }]}
                >
                  <Select
                    showSearch
                    optionFilterProp="label"
                    options={lokasyonlar.map((lokasyon) => ({
                      value: lokasyon.key,
                      label: lokasyon.label,
                    }))}
                    onChange={lokasyonDegisti}
                    placeholder="Lokasyon seçin"
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  name="adres"
                  label="Adres"
                  rules={[{ required: true, message: 'Adres zorunludur.' }]}
                >
                  <Input placeholder="Servis adresini yazın" />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item name="tarih" label="Planlama Tarihi">
                  <DatePicker style={{ width: '100%' }} format="DD.MM.YYYY" />
                </Form.Item>
              </Col>
              <Col xs={24} md={4}>
                <Form.Item
                  name="saat"
                  label="Saat"
                  rules={[
                    {
                      pattern: /^$|^\d{2}:\d{2}$/,
                      message: 'Saat biçimi SS:DD olmalıdır.',
                    },
                  ]}
                >
                  <Input placeholder="09:30" />
                </Form.Item>
              </Col>
              <Col xs={24} md={6}>
                <Form.Item name="irtibatKisi" label="İrtibat Kişisi">
                  <Input placeholder="İsim Soyisim" />
                </Form.Item>
              </Col>
              <Col xs={24} md={6}>
                <Form.Item name="telefon" label="Telefon">
                  <Input placeholder="05xx xxx xx xx" />
                </Form.Item>
              </Col>
              <Col xs={24}>
                <Form.Item
                  name="servisAciklamasi"
                  label="Açıklama"
                  rules={[{ required: true, message: 'Açıklama zorunludur.' }]}
                >
                  <Input.TextArea rows={4} placeholder="Talep detayını girin" />
                </Form.Item>
              </Col>
            </Row>

            <Space wrap>
              <Button type="primary" htmlType="submit" loading={kaydediliyor}>
                İş Emrini Oluştur
              </Button>
              <Button onClick={() => router.push('/talepler')}>Talep Listesine Git</Button>
            </Space>
          </Form>
        </Card>
      </PageContainer>
    </>
  );
}
