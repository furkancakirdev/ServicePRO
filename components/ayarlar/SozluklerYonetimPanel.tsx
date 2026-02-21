'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  message,
  type TableColumnsType,
} from 'antd';

type SozluklerYonetimPanelProps = {
  aktif: boolean;
};

type KonumKaydi = {
  id: string;
  key: string;
  label: string;
  adres: string | null;
  telefon: string | null;
  sirasi: number;
  aktif: boolean;
};

type DurumKaydi = {
  id: string;
  key: string;
  label: string;
  description: string | null;
  color: string;
  icon: string | null;
  sirasi: number;
  aktif: boolean;
};

type BlokajNedeniKaydi = {
  id: string;
  key: string;
  label: string;
  description: string | null;
  durumKey: string;
  sirasi: number;
  aktif: boolean;
};

type UnvanKaydi = {
  id: string;
  key: string;
  label: string;
  puanCarpani: number;
  sirasi: number;
  aktif: boolean;
};

type KonumFormDegeri = {
  key: string;
  label: string;
  adres?: string;
  telefon?: string;
  sirasi: number;
  aktif: boolean;
};

type DurumFormDegeri = {
  key: string;
  label: string;
  description?: string;
  color: string;
  icon?: string;
  sirasi: number;
  aktif: boolean;
};

type BlokajFormDegeri = {
  key: string;
  label: string;
  description?: string;
  durumKey: string;
  sirasi: number;
  aktif: boolean;
};

type UnvanFormDegeri = {
  key: string;
  label: string;
  puanCarpani: number;
  sirasi: number;
  aktif: boolean;
};

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

function normalizeKey(value: string): string {
  return value.trim().replace(/\s+/g, '_').toLocaleUpperCase('tr-TR');
}

function durumEtiketi(aktifMi: boolean) {
  return <Tag color={aktifMi ? 'green' : 'default'}>{aktifMi ? 'Aktif' : 'Pasif'}</Tag>;
}

export default function SozluklerYonetimPanel({ aktif }: SozluklerYonetimPanelProps) {
  const [mesajApi, mesajBaglami] = message.useMessage();
  const [yukleniyor, setYukleniyor] = useState(false);

  const [konumlar, setKonumlar] = useState<KonumKaydi[]>([]);
  const [durumlar, setDurumlar] = useState<DurumKaydi[]>([]);
  const [blokajNedenleri, setBlokajNedenleri] = useState<BlokajNedeniKaydi[]>([]);
  const [unvanlar, setUnvanlar] = useState<UnvanKaydi[]>([]);

  const [konumKayit, setKonumKayit] = useState<KonumKaydi | null>(null);
  const [durumKayit, setDurumKayit] = useState<DurumKaydi | null>(null);
  const [blokajKayit, setBlokajKayit] = useState<BlokajNedeniKaydi | null>(null);
  const [unvanKayit, setUnvanKayit] = useState<UnvanKaydi | null>(null);

  const [konumModalAcik, setKonumModalAcik] = useState(false);
  const [durumModalAcik, setDurumModalAcik] = useState(false);
  const [blokajModalAcik, setBlokajModalAcik] = useState(false);
  const [unvanModalAcik, setUnvanModalAcik] = useState(false);

  const [konumKaydediliyor, setKonumKaydediliyor] = useState(false);
  const [durumKaydediliyor, setDurumKaydediliyor] = useState(false);
  const [blokajKaydediliyor, setBlokajKaydediliyor] = useState(false);
  const [unvanKaydediliyor, setUnvanKaydediliyor] = useState(false);

  const [konumForm] = Form.useForm<KonumFormDegeri>();
  const [durumForm] = Form.useForm<DurumFormDegeri>();
  const [blokajForm] = Form.useForm<BlokajFormDegeri>();
  const [unvanForm] = Form.useForm<UnvanFormDegeri>();

  const apiFetch = useCallback((path: string, init: RequestInit = {}) => {
    return fetch(path, {
      cache: 'no-store',
      credentials: 'include',
      ...init,
      headers: {
        ...getAuthHeaders(),
        ...(init.headers ?? {}),
      },
    });
  }, []);

  const loadSozlukler = useCallback(async () => {
    if (!aktif) return;
    setYukleniyor(true);
    try {
      const [konumResponse, durumResponse, blokajResponse, unvanResponse] = await Promise.all([
        apiFetch('/api/admin/konumlar'),
        apiFetch('/api/admin/durumlar'),
        apiFetch('/api/admin/blokaj-nedenleri'),
        apiFetch('/api/admin/unvanlar'),
      ]);
      const [konumPayload, durumPayload, blokajPayload, unvanPayload] = await Promise.all([
        konumResponse.json().catch(() => null),
        durumResponse.json().catch(() => null),
        blokajResponse.json().catch(() => null),
        unvanResponse.json().catch(() => null),
      ]);

      if (!konumResponse.ok) throw new Error(parseError(konumPayload, 'Lokasyonlar yüklenemedi.'));
      if (!durumResponse.ok) throw new Error(parseError(durumPayload, 'Durum etiketleri yüklenemedi.'));
      if (!blokajResponse.ok) throw new Error(parseError(blokajPayload, 'Blokaj nedenleri yüklenemedi.'));
      if (!unvanResponse.ok) throw new Error(parseError(unvanPayload, 'İş türleri yüklenemedi.'));

      setKonumlar(konumPayload as KonumKaydi[]);
      setDurumlar(durumPayload as DurumKaydi[]);
      setBlokajNedenleri(blokajPayload as BlokajNedeniKaydi[]);
      setUnvanlar(unvanPayload as UnvanKaydi[]);
    } catch (error) {
      mesajApi.error(error instanceof Error ? error.message : 'Sözlükler yüklenemedi.');
    } finally {
      setYukleniyor(false);
    }
  }, [aktif, apiFetch, mesajApi]);

  useEffect(() => {
    void loadSozlukler();
  }, [loadSozlukler]);

  const durumSecenekleri = useMemo(
    () => durumlar.map((durum) => ({ value: durum.key, label: `${durum.label} (${durum.key})` })),
    [durumlar]
  );

  const durumMap = useMemo(() => new Map(durumlar.map((durum) => [durum.key, durum.label])), [durumlar]);

  const kayitSil = useCallback(
    (url: string, baslik: string, aciklama: string) => {
      Modal.confirm({
        title: baslik,
        content: aciklama,
        okText: 'Sil',
        cancelText: 'Vazgeç',
        okType: 'danger',
        onOk: async () => {
          const response = await apiFetch(url, { method: 'DELETE' });
          const payload = await response.json().catch(() => null);
          if (!response.ok) {
            throw new Error(parseError(payload, 'Kayıt silinemedi.'));
          }
          mesajApi.success('Kayıt silindi.');
          await loadSozlukler();
        },
      });
    },
    [apiFetch, loadSozlukler, mesajApi]
  );

  const konumKolonlari: TableColumnsType<KonumKaydi> = [
    { title: 'Anahtar', dataIndex: 'key', key: 'key', width: 130 },
    { title: 'Etiket', dataIndex: 'label', key: 'label', width: 190 },
    { title: 'Adres', dataIndex: 'adres', key: 'adres', render: (v: string | null) => v || '-' },
    { title: 'Telefon', dataIndex: 'telefon', key: 'telefon', render: (v: string | null) => v || '-' },
    { title: 'Sıra', dataIndex: 'sirasi', key: 'sirasi', width: 80 },
    { title: 'Durum', dataIndex: 'aktif', key: 'aktif', width: 90, render: (v: boolean) => durumEtiketi(v) },
    {
      title: 'İşlem',
      key: 'islem',
      width: 150,
      render: (_, kayit) => (
        <Space>
          <Button size="small" onClick={() => konumDuzenle(kayit)}>Düzenle</Button>
          <Button size="small" danger onClick={() => kayitSil(`/api/admin/konumlar/${kayit.id}`, 'Lokasyon silinsin mi?', `"${kayit.label}" kaydı silinecek.`)}>Sil</Button>
        </Space>
      ),
    },
  ];

  const durumKolonlari: TableColumnsType<DurumKaydi> = [
    { title: 'Anahtar', dataIndex: 'key', key: 'key', width: 130 },
    { title: 'Etiket', dataIndex: 'label', key: 'label', width: 180 },
    { title: 'Renk', dataIndex: 'color', key: 'color', width: 120, render: (v: string) => <Tag color={v}>{v}</Tag> },
    { title: 'Simgesi', dataIndex: 'icon', key: 'icon', width: 120, render: (v: string | null) => v || '-' },
    { title: 'Sıra', dataIndex: 'sirasi', key: 'sirasi', width: 80 },
    { title: 'Durum', dataIndex: 'aktif', key: 'aktif', width: 90, render: (v: boolean) => durumEtiketi(v) },
    {
      title: 'İşlem',
      key: 'islem',
      width: 150,
      render: (_, kayit) => (
        <Space>
          <Button size="small" onClick={() => durumDuzenle(kayit)}>Düzenle</Button>
          <Button size="small" danger onClick={() => kayitSil(`/api/admin/durumlar/${kayit.id}`, 'Durum etiketi silinsin mi?', `"${kayit.label}" kaydı silinecek.`)}>Sil</Button>
        </Space>
      ),
    },
  ];

  const blokajKolonlari: TableColumnsType<BlokajNedeniKaydi> = [
    { title: 'Anahtar', dataIndex: 'key', key: 'key', width: 140 },
    { title: 'Etiket', dataIndex: 'label', key: 'label', width: 190 },
    { title: 'Hedef Durum', dataIndex: 'durumKey', key: 'durumKey', width: 210, render: (v: string) => `${durumMap.get(v) ?? v} (${v})` },
    { title: 'Sıra', dataIndex: 'sirasi', key: 'sirasi', width: 80 },
    { title: 'Durum', dataIndex: 'aktif', key: 'aktif', width: 90, render: (v: boolean) => durumEtiketi(v) },
    {
      title: 'İşlem',
      key: 'islem',
      width: 150,
      render: (_, kayit) => (
        <Space>
          <Button size="small" onClick={() => blokajDuzenle(kayit)}>Düzenle</Button>
          <Button size="small" danger onClick={() => kayitSil(`/api/admin/blokaj-nedenleri/${kayit.id}`, 'Blokaj nedeni silinsin mi?', `"${kayit.label}" kaydı silinecek.`)}>Sil</Button>
        </Space>
      ),
    },
  ];

  const unvanKolonlari: TableColumnsType<UnvanKaydi> = [
    { title: 'Anahtar', dataIndex: 'key', key: 'key', width: 140 },
    { title: 'Etiket', dataIndex: 'label', key: 'label', width: 190 },
    { title: 'Puan Çarpanı', dataIndex: 'puanCarpani', key: 'puanCarpani', width: 110 },
    { title: 'Sıra', dataIndex: 'sirasi', key: 'sirasi', width: 80 },
    { title: 'Durum', dataIndex: 'aktif', key: 'aktif', width: 90, render: (v: boolean) => durumEtiketi(v) },
    {
      title: 'İşlem',
      key: 'islem',
      width: 150,
      render: (_, kayit) => (
        <Space>
          <Button size="small" onClick={() => unvanDuzenle(kayit)}>Düzenle</Button>
          <Button size="small" danger onClick={() => kayitSil(`/api/admin/unvanlar/${kayit.id}`, 'İş türü silinsin mi?', `"${kayit.label}" kaydı silinecek.`)}>Sil</Button>
        </Space>
      ),
    },
  ];

  function konumDuzenle(kayit: KonumKaydi) {
    setKonumKayit(kayit);
    konumForm.setFieldsValue({
      key: kayit.key,
      label: kayit.label,
      adres: kayit.adres ?? undefined,
      telefon: kayit.telefon ?? undefined,
      sirasi: kayit.sirasi,
      aktif: kayit.aktif,
    });
    setKonumModalAcik(true);
  }

  function durumDuzenle(kayit: DurumKaydi) {
    setDurumKayit(kayit);
    durumForm.setFieldsValue({
      key: kayit.key,
      label: kayit.label,
      description: kayit.description ?? undefined,
      color: kayit.color,
      icon: kayit.icon ?? undefined,
      sirasi: kayit.sirasi,
      aktif: kayit.aktif,
    });
    setDurumModalAcik(true);
  }

  function blokajDuzenle(kayit: BlokajNedeniKaydi) {
    setBlokajKayit(kayit);
    blokajForm.setFieldsValue({
      key: kayit.key,
      label: kayit.label,
      description: kayit.description ?? undefined,
      durumKey: kayit.durumKey,
      sirasi: kayit.sirasi,
      aktif: kayit.aktif,
    });
    setBlokajModalAcik(true);
  }

  function unvanDuzenle(kayit: UnvanKaydi) {
    setUnvanKayit(kayit);
    unvanForm.setFieldsValue({
      key: kayit.key,
      label: kayit.label,
      puanCarpani: kayit.puanCarpani,
      sirasi: kayit.sirasi,
      aktif: kayit.aktif,
    });
    setUnvanModalAcik(true);
  }

  async function kaydet(
    endpoint: string,
    method: 'POST' | 'PUT',
    payload: Record<string, unknown>,
    basariMesaji: string
  ) {
    const response = await apiFetch(endpoint, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(parseError(body, 'Kayıt kaydedilemedi.'));
    }
    mesajApi.success(basariMesaji);
    await loadSozlukler();
  }

  return (
    <>
      {mesajBaglami}
      <Card loading={yukleniyor}>
        <Tabs
          defaultActiveKey="konumlar"
          items={[
            { key: 'konumlar', label: 'Lokasyonlar', children: <Table rowKey="id" size="small" columns={konumKolonlari} dataSource={konumlar} scroll={{ x: 980 }} pagination={{ pageSize: 8 }} title={() => <Button type="primary" onClick={() => { setKonumKayit(null); konumForm.setFieldsValue({ key: '', label: '', sirasi: konumlar.length + 1, aktif: true }); setKonumModalAcik(true); }}>Yeni Lokasyon</Button>} /> },
            { key: 'durumlar', label: 'Durum Etiketleri', children: <Table rowKey="id" size="small" columns={durumKolonlari} dataSource={durumlar} scroll={{ x: 950 }} pagination={{ pageSize: 8 }} title={() => <Button type="primary" onClick={() => { setDurumKayit(null); durumForm.setFieldsValue({ key: '', label: '', color: '#1677FF', sirasi: durumlar.length + 1, aktif: true }); setDurumModalAcik(true); }}>Yeni Durum Etiketi</Button>} /> },
            { key: 'blokajlar', label: 'Blokaj Nedenleri', children: <Table rowKey="id" size="small" columns={blokajKolonlari} dataSource={blokajNedenleri} scroll={{ x: 980 }} pagination={{ pageSize: 8 }} title={() => <Button type="primary" disabled={durumlar.length === 0} onClick={() => { setBlokajKayit(null); blokajForm.setFieldsValue({ key: '', label: '', durumKey: durumlar[0]?.key, sirasi: blokajNedenleri.length + 1, aktif: true }); setBlokajModalAcik(true); }}>Yeni Blokaj Nedeni</Button>} /> },
            { key: 'unvanlar', label: 'İş Türleri ve Ünvanlar', children: <Table rowKey="id" size="small" columns={unvanKolonlari} dataSource={unvanlar} scroll={{ x: 900 }} pagination={{ pageSize: 8 }} title={() => <Button type="primary" onClick={() => { setUnvanKayit(null); unvanForm.setFieldsValue({ key: '', label: '', puanCarpani: 1, sirasi: unvanlar.length + 1, aktif: true }); setUnvanModalAcik(true); }}>Yeni İş Türü</Button>} /> },
          ]}
        />
      </Card>

      <Modal open={konumModalAcik} title={konumKayit ? 'Lokasyonu Düzenle' : 'Yeni Lokasyon'} okText="Kaydet" cancelText="Vazgeç" confirmLoading={konumKaydediliyor} onCancel={() => setKonumModalAcik(false)} onOk={async () => { try { const v = await konumForm.validateFields(); setKonumKaydediliyor(true); await kaydet(konumKayit ? `/api/admin/konumlar/${konumKayit.id}` : '/api/admin/konumlar', konumKayit ? 'PUT' : 'POST', { key: normalizeKey(v.key), label: v.label.trim(), adres: v.adres?.trim() || null, telefon: v.telefon?.trim() || null, sirasi: v.sirasi, aktif: v.aktif }, konumKayit ? 'Lokasyon güncellendi.' : 'Lokasyon eklendi.'); setKonumModalAcik(false); } catch (e) { if (e instanceof Error) mesajApi.error(e.message); } finally { setKonumKaydediliyor(false); } }}>
        <Form form={konumForm} layout="vertical"><Form.Item name="key" label="Anahtar" rules={[{ required: true, message: 'Anahtar zorunludur.' }]}><Input /></Form.Item><Form.Item name="label" label="Etiket" rules={[{ required: true, message: 'Etiket zorunludur.' }]}><Input /></Form.Item><Row gutter={12}><Col span={12}><Form.Item name="sirasi" label="Sıra" rules={[{ required: true, message: 'Sıra zorunludur.' }]}><InputNumber min={0} max={9999} style={{ width: '100%' }} /></Form.Item></Col><Col span={12}><Form.Item name="aktif" label="Aktif" valuePropName="checked"><Switch /></Form.Item></Col></Row><Form.Item name="adres" label="Adres"><Input /></Form.Item><Form.Item name="telefon" label="Telefon"><Input /></Form.Item></Form>
      </Modal>

      <Modal open={durumModalAcik} title={durumKayit ? 'Durum Etiketini Düzenle' : 'Yeni Durum Etiketi'} okText="Kaydet" cancelText="Vazgeç" confirmLoading={durumKaydediliyor} onCancel={() => setDurumModalAcik(false)} onOk={async () => { try { const v = await durumForm.validateFields(); setDurumKaydediliyor(true); await kaydet(durumKayit ? `/api/admin/durumlar/${durumKayit.id}` : '/api/admin/durumlar', durumKayit ? 'PUT' : 'POST', { key: normalizeKey(v.key), label: v.label.trim(), description: v.description?.trim() || null, color: v.color, icon: v.icon?.trim() || null, sirasi: v.sirasi, aktif: v.aktif }, durumKayit ? 'Durum etiketi güncellendi.' : 'Durum etiketi eklendi.'); setDurumModalAcik(false); } catch (e) { if (e instanceof Error) mesajApi.error(e.message); } finally { setDurumKaydediliyor(false); } }}>
        <Form form={durumForm} layout="vertical"><Form.Item name="key" label="Anahtar" rules={[{ required: true, message: 'Anahtar zorunludur.' }]}><Input /></Form.Item><Form.Item name="label" label="Etiket" rules={[{ required: true, message: 'Etiket zorunludur.' }]}><Input /></Form.Item><Form.Item name="color" label="Renk" rules={[{ required: true, message: 'Renk zorunludur.' }, { pattern: /^#[0-9a-fA-F]{6}$/, message: 'Hex biçimi kullanın.' }]}><Input placeholder="#1677FF" /></Form.Item><Form.Item name="icon" label="Simgesi"><Input /></Form.Item><Form.Item name="description" label="Açıklama"><Input.TextArea rows={3} /></Form.Item><Row gutter={12}><Col span={12}><Form.Item name="sirasi" label="Sıra" rules={[{ required: true, message: 'Sıra zorunludur.' }]}><InputNumber min={0} max={9999} style={{ width: '100%' }} /></Form.Item></Col><Col span={12}><Form.Item name="aktif" label="Aktif" valuePropName="checked"><Switch /></Form.Item></Col></Row></Form>
      </Modal>

      <Modal open={blokajModalAcik} title={blokajKayit ? 'Blokaj Nedenini Düzenle' : 'Yeni Blokaj Nedeni'} okText="Kaydet" cancelText="Vazgeç" confirmLoading={blokajKaydediliyor} onCancel={() => setBlokajModalAcik(false)} onOk={async () => { try { const v = await blokajForm.validateFields(); setBlokajKaydediliyor(true); await kaydet(blokajKayit ? `/api/admin/blokaj-nedenleri/${blokajKayit.id}` : '/api/admin/blokaj-nedenleri', blokajKayit ? 'PUT' : 'POST', { key: normalizeKey(v.key), label: v.label.trim(), description: v.description?.trim() || null, durumKey: v.durumKey, sirasi: v.sirasi, aktif: v.aktif }, blokajKayit ? 'Blokaj nedeni güncellendi.' : 'Blokaj nedeni eklendi.'); setBlokajModalAcik(false); } catch (e) { if (e instanceof Error) mesajApi.error(e.message); } finally { setBlokajKaydediliyor(false); } }}>
        <Form form={blokajForm} layout="vertical"><Form.Item name="key" label="Anahtar" rules={[{ required: true, message: 'Anahtar zorunludur.' }]}><Input /></Form.Item><Form.Item name="label" label="Etiket" rules={[{ required: true, message: 'Etiket zorunludur.' }]}><Input /></Form.Item><Form.Item name="durumKey" label="Hedef Durum" rules={[{ required: true, message: 'Hedef durum seçin.' }]}><Select options={durumSecenekleri} /></Form.Item><Form.Item name="description" label="Açıklama"><Input.TextArea rows={3} /></Form.Item><Row gutter={12}><Col span={12}><Form.Item name="sirasi" label="Sıra" rules={[{ required: true, message: 'Sıra zorunludur.' }]}><InputNumber min={0} max={9999} style={{ width: '100%' }} /></Form.Item></Col><Col span={12}><Form.Item name="aktif" label="Aktif" valuePropName="checked"><Switch /></Form.Item></Col></Row></Form>
      </Modal>

      <Modal open={unvanModalAcik} title={unvanKayit ? 'İş Türünü Düzenle' : 'Yeni İş Türü'} okText="Kaydet" cancelText="Vazgeç" confirmLoading={unvanKaydediliyor} onCancel={() => setUnvanModalAcik(false)} onOk={async () => { try { const v = await unvanForm.validateFields(); setUnvanKaydediliyor(true); await kaydet(unvanKayit ? `/api/admin/unvanlar/${unvanKayit.id}` : '/api/admin/unvanlar', unvanKayit ? 'PUT' : 'POST', { key: normalizeKey(v.key), label: v.label.trim(), puanCarpani: v.puanCarpani, sirasi: v.sirasi, aktif: v.aktif }, unvanKayit ? 'İş türü güncellendi.' : 'İş türü eklendi.'); setUnvanModalAcik(false); } catch (e) { if (e instanceof Error) mesajApi.error(e.message); } finally { setUnvanKaydediliyor(false); } }}>
        <Form form={unvanForm} layout="vertical"><Form.Item name="key" label="Anahtar" rules={[{ required: true, message: 'Anahtar zorunludur.' }]}><Input /></Form.Item><Form.Item name="label" label="Etiket" rules={[{ required: true, message: 'Etiket zorunludur.' }]}><Input /></Form.Item><Form.Item name="puanCarpani" label="Puan Çarpanı" rules={[{ required: true, message: 'Puan çarpanı zorunludur.' }]}><InputNumber min={0} max={100} step={0.1} style={{ width: '100%' }} /></Form.Item><Row gutter={12}><Col span={12}><Form.Item name="sirasi" label="Sıra" rules={[{ required: true, message: 'Sıra zorunludur.' }]}><InputNumber min={0} max={9999} style={{ width: '100%' }} /></Form.Item></Col><Col span={12}><Form.Item name="aktif" label="Aktif" valuePropName="checked"><Switch /></Form.Item></Col></Row></Form>
      </Modal>
    </>
  );
}
