'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button, Form, Input, Modal, Select, Space, Table, Tag, message, type TableColumnsType } from 'antd';

type KullanicilarYonetimPanelProps = {
  aktif: boolean;
};

type KullaniciKaydi = {
  id: string;
  ad: string;
  email: string;
  rol: 'admin' | 'yetkili';
  aktif: boolean;
};

type YeniKullaniciFormDegeri = {
  ad: string;
  email: string;
  password?: string;
  rol: 'admin' | 'yetkili';
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

export default function KullanicilarYonetimPanel({ aktif }: KullanicilarYonetimPanelProps) {
  const [mesajApi, mesajBaglami] = message.useMessage();
  const [kullanicilar, setKullanicilar] = useState<KullaniciKaydi[]>([]);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [modalAcik, setModalAcik] = useState(false);
  const [form] = Form.useForm<YeniKullaniciFormDegeri>();

  const loadKullanicilar = useCallback(async () => {
    if (!aktif) return;
    setYukleniyor(true);
    try {
      const response = await fetch('/api/users', {
        cache: 'no-store',
        credentials: 'include',
        headers: getAuthHeaders(),
      });
      const payload = (await response.json().catch(() => null)) as KullaniciKaydi[] | { error?: string } | null;
      if (!response.ok) {
        throw new Error(parseError(payload, 'Kullanıcılar getirilemedi.'));
      }
      setKullanicilar(payload as KullaniciKaydi[]);
    } catch (error) {
      mesajApi.error(error instanceof Error ? error.message : 'Kullanıcılar getirilemedi.');
    } finally {
      setYukleniyor(false);
    }
  }, [aktif, mesajApi]);

  useEffect(() => {
    void loadKullanicilar();
  }, [loadKullanicilar]);

  const kullaniciKolonlari: TableColumnsType<KullaniciKaydi> = [
    { title: 'Ad Soyad', dataIndex: 'ad', key: 'ad' },
    { title: 'E-posta', dataIndex: 'email', key: 'email' },
    {
      title: 'Rol',
      dataIndex: 'rol',
      key: 'rol',
      width: 130,
      render: (rol: 'admin' | 'yetkili') => (
        <Tag color={rol === 'admin' ? 'blue' : 'geekblue'}>{rol === 'admin' ? 'Yönetici' : 'Yetkili'}</Tag>
      ),
    },
    {
      title: 'Durum',
      dataIndex: 'aktif',
      key: 'aktif',
      width: 120,
      render: (aktifMi: boolean) => <Tag color={aktifMi ? 'green' : 'default'}>{aktifMi ? 'Aktif' : 'Pasif'}</Tag>,
    },
  ];

  return (
    <>
      {mesajBaglami}
      <Table<KullaniciKaydi>
        rowKey="id"
        loading={yukleniyor}
        size="small"
        columns={kullaniciKolonlari}
        dataSource={kullanicilar}
        pagination={{ pageSize: 8 }}
        scroll={{ x: 720 }}
        title={() => (
          <Space>
            <Button type="primary" onClick={() => { form.resetFields(); form.setFieldsValue({ rol: 'yetkili' }); setModalAcik(true); }}>
              Yeni Kullanıcı
            </Button>
            <Button onClick={() => void loadKullanicilar()}>Yenile</Button>
          </Space>
        )}
      />

      <Modal
        open={modalAcik}
        title="Yeni Kullanıcı"
        okText="Oluştur"
        cancelText="Vazgeç"
        confirmLoading={kaydediliyor}
        onCancel={() => setModalAcik(false)}
        onOk={async () => {
          try {
            const values = await form.validateFields();
            setKaydediliyor(true);
            const response = await fetch('/api/users', {
              method: 'POST',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
              body: JSON.stringify({
                ad: values.ad.trim(),
                email: values.email.trim().toLocaleLowerCase('tr-TR'),
                password: values.password?.trim() || undefined,
                rol: values.rol,
              }),
            });
            const payload = await response.json().catch(() => null);
            if (!response.ok) {
              throw new Error(parseError(payload, 'Kullanıcı oluşturulamadı.'));
            }
            mesajApi.success('Kullanıcı oluşturuldu.');
            setModalAcik(false);
            await loadKullanicilar();
          } catch (error) {
            if (error instanceof Error) {
              mesajApi.error(error.message);
            }
          } finally {
            setKaydediliyor(false);
          }
        }}
      >
        <Form form={form} layout="vertical" initialValues={{ rol: 'yetkili' }}>
          <Form.Item name="ad" label="Ad Soyad" rules={[{ required: true, message: 'Ad soyad zorunludur.' }]}>
            <Input />
          </Form.Item>
          <Form.Item
            name="email"
            label="E-posta"
            rules={[
              { required: true, message: 'E-posta zorunludur.' },
              { type: 'email', message: 'Geçerli bir e-posta girin.' },
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="password" label="Şifre" extra="Boş bırakırsanız varsayılan şifre atanır.">
            <Input.Password />
          </Form.Item>
          <Form.Item name="rol" label="Rol" rules={[{ required: true, message: 'Rol seçimi zorunludur.' }]}>
            <Select
              options={[
                { value: 'yetkili', label: 'Yetkili' },
                { value: 'admin', label: 'Yönetici' },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
