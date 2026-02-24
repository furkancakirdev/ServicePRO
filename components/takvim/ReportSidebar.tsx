'use client';

import { useState } from 'react';
import { FileText, FileSpreadsheet, MessageSquare, X } from 'lucide-react';
import { Button, Checkbox, DatePicker, Form, Select, Spin, message } from 'antd';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useToast } from '@/hooks/useToast';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;

interface ReportConfig {
  tarihAraligi: [string, string] | null;
  durumlar: string[];
  includeTekneAdi: boolean;
  includeAdres: boolean;
  includeTeknisyen: boolean;
  includeAciklama: boolean;
  includeTarih: boolean;
  includeDurum: boolean;
}

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

interface ReportSidebarProps {
  open: boolean;
  onClose: () => void;
}

export function ReportSidebar({ open, onClose }: ReportSidebarProps) {
  const [form] = Form.useForm<ReportConfig>();
  const [loading, setLoading] = useState(false);
  const { showSuccess, showError } = useToast();
  const [messageApi, messageContextHolder] = message.useMessage();

  const defaultConfig: ReportConfig = {
    tarihAraligi: [dayjs().format('YYYY-MM-DD'), dayjs().format('YYYY-MM-DD')],
    durumlar: ['TAMAMLANDI'],
    includeTekneAdi: true,
    includeAdres: true,
    includeTeknisyen: true,
    includeAciklama: false,
    includeTarih: true,
    includeDurum: true,
  };

  const getAuthHeaders = (): HeadersInit => {
    if (typeof window === 'undefined') return {};
    const token = window.localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchServicesForReport = async (config: ReportConfig) => {
    const params = new URLSearchParams();
    params.set('limit', '500');
    if (config.tarihAraligi && config.tarihAraligi.length === 2) {
      params.set('baslangic', config.tarihAraligi[0]);
      params.set('bitis', config.tarihAraligi[1]);
    }

    if (config.durumlar.length > 0) {
      params.set('durum', config.durumlar.join(','));
    }

    const response = await fetch(`/api/services?${params.toString()}`, {
      cache: 'no-store',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Servisler getirilemedi');
    }

    const payload = await response.json();
    return payload.services || [];
  };

  const generateExcel = async () => {
    try {
      setLoading(true);
      const values = await form.validateFields();
      const services = await fetchServicesForReport(values);

      if (services.length === 0) {
        messageApi.warning('Raporlanacak servis bulunamadı');
        return;
      }

      // Satır oluştur
      const rows = services.map((service: any) => {
        const row: any = {};

        if (values.includeTekneAdi) row['Tekne'] = service.tekneAdi || '-';
        if (values.includeAdres) row['Adres'] = service.yer || service.adres || '-';
        if (values.includeTeknisyen) {
          const teknisyenler = service.personeller
            ?.map((p: any) => p.personel?.ad)
            .filter(Boolean)
            .join(', ') || '-';
          row['Teknisyen'] = teknisyenler;
        }
        if (values.includeAciklama) row['Açıklama'] = service.servisAciklamasi || '-';
        if (values.includeTarih) row['Tarih'] = service.tarih || '-';
        if (values.includeDurum) row['Durum'] = service.durum || '-';

        return row;
      });

      // CSV oluştur
      const headers = Object.keys(rows[0] || []);
      const csvContent = [
        headers.join(','),
        ...rows.map((row: any) => headers.map((header: string) => {
          const value = String(row[header] || '');
          // Virgülleri escape et
          if (value.includes(',') || value.includes('"') || value.includes('\n')) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(','))
      ].join('\n');

      // Blob ve download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const baslangic = values.tarihAraligi?.[0] || dayjs().format('YYYY-MM-DD');
      link.download = `servis-raporu-${baslangic}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showSuccess('Excel raporu başarıyla indirildi');
    } catch (error) {
      showError('Excel oluşturulamadı', {
        description: error instanceof Error ? error.message : 'Bilinmeyen hata'
      });
    } finally {
      setLoading(false);
    }
  };

  const generateWhatsApp = async () => {
    try {
      setLoading(true);
      const values = await form.validateFields();
      const services = await fetchServicesForReport(values);

      if (services.length === 0) {
        messageApi.warning('Raporlanacak servis bulunamadı');
        return;
      }

      // WhatsApp mesajı oluştur
      const [baslangic, bitis] = values.tarihAraligi || [dayjs().format('YYYY-MM-DD'), dayjs().format('YYYY-MM-DD')];
      const lines = [
        '📋 *Servis Raporu*',
        `📅 ${baslangic} - ${bitis}`,
        '',
        `Toplam: ${services.length} servis`,
        '',
      ];

      services.forEach((service: any, index: number) => {
        lines.push(`${index + 1}. ${service.tekneAdi}`);
        if (values.includeTeknisyen && service.personeller?.length > 0) {
          const teknisyenler = service.personeller
            .map((p: any) => p.personel?.ad)
            .filter(Boolean)
            .join(', ');
          lines.push(`👷 ${teknisyenler}`);
        }
        if (values.includeAdres) {
          lines.push(`📍 ${service.yer || service.adres || '-'}`);
        }
        if (values.includeDurum) {
          lines.push(`📊 ${service.durum || '-'}`);
        }
        if (values.includeAciklama) {
          lines.push(`📝 ${service.servisAciklamasi?.substring(0, 50) || ''}${service.servisAciklamasi?.length > 50 ? '...' : ''}`);
        }
        lines.push('');
      });

      const text = lines.join('\n');
      const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
      window.open(url, '_blank');

      showSuccess('WhatsApp açıldı');
    } catch (error) {
      showError('WhatsApp açılamadı', {
        description: error instanceof Error ? error.message : 'Bilinmeyen hata'
      });
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = async () => {
    try {
      setLoading(true);
      const values = await form.validateFields();
      const services = await fetchServicesForReport(values);
      const [baslangic, bitis] = values.tarihAraligi || [dayjs().format('YYYY-MM-DD'), dayjs().format('YYYY-MM-DD')];

      if (services.length === 0) {
        messageApi.warning('Raporlanacak servis bulunamadı');
        return;
      }

      // Basit PDF (tarayıcı üzerinden yazdırma)
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        messageApi.error('Pop-up engellendi, lütfen pop-up\'e izin verin');
        return;
      }

      // Tablo HTML oluştur
      let tableHeaders = '';
      if (values.includeTekneAdi) tableHeaders += '<th>Tekne</th>';
      if (values.includeAdres) tableHeaders += '<th>Adres</th>';
      if (values.includeTeknisyen) tableHeaders += '<th>Teknisyen</th>';
      if (values.includeTarih) tableHeaders += '<th>Tarih</th>';
      if (values.includeDurum) tableHeaders += '<th>Durum</th>';
      if (values.includeAciklama) tableHeaders += '<th>Açıklama</th>';

      const tableRows = services.map((service: any) => {
        let row = '';
        if (values.includeTekneAdi) row += `<td>${service.tekneAdi || '-'}</td>`;
        if (values.includeAdres) row += `<td>${service.yer || service.adres || '-'}</td>`;
        if (values.includeTeknisyen) {
          const teknisyenler = service.personeller
            ?.map((p: any) => p.personel?.ad)
            .filter(Boolean)
            .join(', ') || '-';
          row += `<td>${teknisyenler}</td>`;
        }
        if (values.includeTarih) row += `<td>${service.tarih || '-'}</td>`;
        if (values.includeDurum) row += `<td>${service.durum || '-'}</td>`;
        if (values.includeAciklama) {
          const aciklama = (service.servisAciklamasi || '-').substring(0, 100);
          row += `<td>${aciklama}</td>`;
        }
        return `<tr>${row}</tr>`;
      }).join('');

      const styles = `
        <html>
          <head>
            <title>Servis Raporu</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              h1 { color: #1B3B6F; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background: #f4f4f4; }
              .header { margin-bottom: 20px; }
              .footer { margin-top: 20px; font-size: 12px; color: #666; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>📋 Servis Raporu</h1>
              <p><strong>Tarih Aralığı:</strong> ${baslangic} - ${bitis}</p>
              <p><strong>Toplam Servis:</strong> ${services.length}</p>
            </div>
            <table>
              <thead>
                <tr>${tableHeaders}</tr>
              </thead>
              <tbody>
                ${tableRows}
              </tbody>
            </table>
            <div class="footer">
              ServicePro ERP - Marlin Yatçılık
            </div>
          </body>
        </html>
      `;

      printWindow.document.write(styles);
      printWindow.document.close();

      showSuccess('PDF yazdırma penceresi açıldı');
    } catch (error) {
      showError('PDF oluşturulamadı', {
        description: error instanceof Error ? error.message : 'Bilinmeyen hata'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Rapor Çıktısı</SheetTitle>
          <button
            type="button"
            onClick={onClose}
            title="Kapat"
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary"
          >
            <X className="h-4 w-4" />
          </button>
        </SheetHeader>

        <div className="px-6 py-4 space-y-6 overflow-y-auto max-h-[calc(100vh-100px)]">
          <Form
            form={form}
            layout="vertical"
            initialValues={defaultConfig}
          >
            <Form.Item
              label="Tarih Aralığı"
              name="tarihAraligi"
              getValueProps={(value) => ({
                value: value ? [dayjs(value[0]), dayjs(value[1])] : null,
              })}
              normalize={(value) => {
                if (!value || value.length !== 2) return null;
                return [
                  value[0] ? dayjs(value[0]).format('YYYY-MM-DD') : null,
                  value[1] ? dayjs(value[1]).format('YYYY-MM-DD') : null,
                ];
              }}
              trigger="onOk"
            >
              <RangePicker
                style={{ width: '100%' }}
                format="YYYY-MM-DD"
                placeholder={['Başlangıç', 'Bitiş']}
              />
            </Form.Item>

            <Form.Item label="Durumlar" name="durumlar">
              <Select
                mode="multiple"
                placeholder="Durum seçin"
                options={DURUM_SECENEKLERI}
                allowClear
              />
            </Form.Item>

            <div className="space-y-3">
              <p className="text-sm font-medium">Dahil Edilecek Bilgiler</p>

              <Form.Item name="includeTekneAdi" valuePropName="checked" noStyle>
                <Checkbox>Tekne Adı</Checkbox>
              </Form.Item>

              <Form.Item name="includeAdres" valuePropName="checked" noStyle>
                <Checkbox>Adres</Checkbox>
              </Form.Item>

              <Form.Item name="includeTeknisyen" valuePropName="checked" noStyle>
                <Checkbox>Teknisyen</Checkbox>
              </Form.Item>

              <Form.Item name="includeTarih" valuePropName="checked" noStyle>
                <Checkbox>Tarih</Checkbox>
              </Form.Item>

              <Form.Item name="includeDurum" valuePropName="checked" noStyle>
                <Checkbox>Durum</Checkbox>
              </Form.Item>

              <Form.Item name="includeAciklama" valuePropName="checked" noStyle>
                <Checkbox>Açıklama</Checkbox>
              </Form.Item>
            </div>
          </Form>

          <div className="space-y-3 pt-4 border-t">
            <Button
              type="primary"
              icon={<FileSpreadsheet className="h-4 w-4 mr-2" />}
              onClick={generateExcel}
              loading={loading}
              block
              size="large"
            >
              Excel Çıktısı (.csv)
            </Button>

            <Button
              icon={<MessageSquare className="h-4 w-4 mr-2" />}
              onClick={generateWhatsApp}
              loading={loading}
              block
            >
              WhatsApp
            </Button>

            <Button
              icon={<FileText className="h-4 w-4 mr-2" />}
              onClick={generatePDF}
              loading={loading}
              block
            >
              PDF / Yazdır
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
