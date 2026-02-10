'use client';

// New Service Form Page
// ServicePro ERP - Marlin Yatçılık

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/lib/hooks/use-auth';

// Form validation schema
const yeniServisSchema = z.object({
  tekneId: z.string().min(1, 'Tekne seçiniz'),
  tarih: z.string().min(1, 'Tarih giriniz'),
  saat: z.string().optional(),
  isTuru: z.enum(['PAKET', 'ARIZA', 'PROJE']),
  adres: z.string().min(1, 'Adres giriniz'),
  yer: z.string().min(1, 'Lokasyon giriniz'),
  servisAciklamasi: z.string().min(5, 'Servis açıklaması en az 5 karakter olmalı'),
  irtibatKisi: z.string().optional(),
  telefon: z.string().optional(),
  durum: z.enum(['RANDEVU_VERILDI', 'DEVAM_EDIYOR', 'PARCA_BEKLIYOR', 'MUSTERI_ONAY_BEKLIYOR', 'RAPOR_BEKLIYOR', 'KESIF_KONTROL', 'TAMAMLANDI']),
  taseronNotlari: z.string().optional(),
});

type YeniServisForm = z.infer<typeof yeniServisSchema>;

interface Tekne {
  id: string;
  ad: string;
  marka: string | null;
}

export default function YeniServisPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [tekneler, setTekneler] = useState<Tekne[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<YeniServisForm>({
    resolver: zodResolver(yeniServisSchema),
    defaultValues: {
      tekneId: '',
      tarih: new Date().toISOString().split('T')[0],
      durum: 'RANDEVU_VERILDI',
      isTuru: 'PAKET',
    },
  });

  // Fetch tekneler and personeller
  useEffect(() => {
    const fetchData = async () => {
      try {
        const tekneRes = await fetch('/api/tekneler');

        if (tekneRes.ok) {
          const data = await tekneRes.json();
          setTekneler(data);
        }

      } catch (err) {
        console.error('Veri yüklenemedi:', err);
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated && !loading) {
      router.push('/login');
    }
  }, [isAuthenticated, loading, router]);

  const onSubmit = async (data: YeniServisForm) => {
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/services', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          ...data,
          tekneAdi: tekneler.find((t) => t.id === data.tekneId)?.ad || '',
          userId: user?.id,
          userEmail: user?.email,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Servis oluşturulamadı');
      }

      router.push('/servisler');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu');
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Yükleniyor...</div>;
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px' }}>
          Yeni Servis
        </h1>
        <p style={{ color: 'var(--color-text-muted)' }}>
          Yeni servis kaydı oluşturun
        </p>
      </div>

      {/* Error */}
      {error && (
        <div
          style={{
            padding: '16px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid #ef4444',
            borderRadius: '8px',
            color: '#ef4444',
            marginBottom: '24px',
          }}
        >
          {error}
        </div>
      )}

      {/* Form */}
      <form
        onSubmit={handleSubmit(onSubmit)}
        style={{
          background: 'rgba(255, 255, 255, 0.03)',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          padding: '32px',
        }}
      >
        {/* Tekne */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>
            Tekne <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <select
            {...register('tekneId')}
            style={{
              width: '100%',
              padding: '12px 16px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              color: '#fff',
            }}
          >
            <option value="">Tekne Seçin</option>
            {tekneler.map((tekne) => (
              <option key={tekne.id} value={tekne.id}>
                {tekne.ad}
              </option>
            ))}
          </select>
          {errors.tekneId && (
            <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
              {errors.tekneId.message}
            </span>
          )}
        </div>

        {/* Tarih ve Saat */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>
              Tarih <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="date"
              {...register('tarih')}
              style={{
                width: '100%',
                padding: '12px 16px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                color: '#fff',
              }}
            />
            {errors.tarih && (
              <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                {errors.tarih.message}
              </span>
            )}
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>
              Saat
            </label>
            <input
              type="time"
              {...register('saat')}
              style={{
                width: '100%',
                padding: '12px 16px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                color: '#fff',
              }}
            />
          </div>
        </div>

        {/* İş Türü ve Durum */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>
              İş Türü
            </label>
            <select
              {...register('isTuru')}
              style={{
                width: '100%',
                padding: '12px 16px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                color: '#fff',
              }}
            >
              <option value="PAKET">Paket İş</option>
              <option value="ARIZA">Arıza / Keşif</option>
              <option value="PROJE">Proje / Refit</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>
              Durum
            </label>
            <select
              {...register('durum')}
              style={{
                width: '100%',
                padding: '12px 16px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                color: '#fff',
              }}
            >
              <option value="RANDEVU_VERILDI">Randevu Verildi</option>
              <option value="DEVAM_EDIYOR">Devam Ediyor</option>
              <option value="PARCA_BEKLIYOR">Parça Bekliyor</option>
              <option value="MUSTERI_ONAY_BEKLIYOR">Müşteri Onay Bekliyor</option>
              <option value="RAPOR_BEKLIYOR">Rapor Bekliyor</option>
              <option value="KESIF_KONTROL">Keşif-Kontrol</option>
              <option value="TAMAMLANDI">Tamamlandı</option>
            </select>
          </div>
        </div>

        {/* Adres ve Lokasyon */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', marginBottom: '24px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>
              Adres <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              {...register('adres')}
              placeholder="Teknenin bulunduğu adres"
              style={{
                width: '100%',
                padding: '12px 16px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                color: '#fff',
              }}
            />
            {errors.adres && (
              <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                {errors.adres.message}
              </span>
            )}
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>
              Lokasyon <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              {...register('yer')}
              placeholder="Yatmarin / Netsel / Dış"
              style={{
                width: '100%',
                padding: '12px 16px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                color: '#fff',
              }}
            />
            {errors.yer && (
              <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                {errors.yer.message}
              </span>
            )}
          </div>
        </div>

        {/* Servis Açıklaması */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>
            Servis Açıklaması <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <textarea
            {...register('servisAciklamasi')}
            rows={4}
            placeholder="Servisin detaylı açıklaması..."
            style={{
              width: '100%',
              padding: '12px 16px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              color: '#fff',
              resize: 'vertical',
            }}
          />
          {errors.servisAciklamasi && (
            <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
              {errors.servisAciklamasi.message}
            </span>
          )}
        </div>

        {/* İrtibat ve Telefon */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>
              İrtibat Kişi
            </label>
            <input
              type="text"
              {...register('irtibatKisi')}
              placeholder="Müşteri yetkilisi"
              style={{
                width: '100%',
                padding: '12px 16px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                color: '#fff',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>
              Telefon
            </label>
            <input
              type="tel"
              {...register('telefon')}
              placeholder="Telefon numarası"
              style={{
                width: '100%',
                padding: '12px 16px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                color: '#fff',
              }}
            />
          </div>
        </div>

        {/* Taşeron Notları */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>
            Taşeron Notları
          </label>
          <textarea
            {...register('taseronNotlari')}
            rows={2}
            placeholder="Taşeron varsa notlar..."
            style={{
              width: '100%',
              padding: '12px 16px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              color: '#fff',
              resize: 'vertical',
            }}
          />
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={() => router.back()}
            disabled={submitting}
            style={{
              padding: '12px 24px',
              background: 'transparent',
              color: 'var(--color-text-muted)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            İptal
          </button>

          <button
            type="submit"
            disabled={submitting}
            style={{
              padding: '12px 32px',
              background: '#3b82f6',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: submitting ? 'not-allowed' : 'pointer',
              fontWeight: 500,
              opacity: submitting ? 0.5 : 1,
            }}
          >
            {submitting ? 'Kaydediliyor...' : 'Servis Oluştur'}
          </button>
        </div>
      </form>
    </div>
  );
}


