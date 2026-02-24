'use client';

import { useState } from 'react';
import { ReloadOutlined } from '@ant-design/icons';
import { Button, message } from 'antd';
import Link from 'next/link';
import { PageContent } from '@/components/layout/page-content';
import { PageHeader } from '@/components/layout/page-header';
import { IsEmirleriProTable } from '@/components/is-emirleri/IsEmirleriProTable';
import { useAuth } from '@/lib/auth/auth-context';

function getAuthHeaders(): HeadersInit {
  if (typeof window === 'undefined') return {};
  const token = window.localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function IsEmirleriPage() {
  const { user } = useAuth();
  const [syncing, setSyncing] = useState(false);
  const [messageApi, messageContextHolder] = message.useMessage();

  const isAdmin = user?.role === 'ADMIN';

  const handleGoogleSync = async () => {
    setSyncing(true);
    try {
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ mode: 'incremental' }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Sync başarısız' }));
        throw new Error(error.error || 'Sync başarısız');
      }

      const result = await response.json();
      messageApi.success(`Sync tamamlandı: ${result.processed || 0} kayıt güncellendi`);

      // Table'ı yenile
      window.location.reload();
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : 'Sync hatası');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <>
      {messageContextHolder}
      <PageContent className="max-w-none">
        <PageHeader
          title="İş Emirleri"
          description="Durum, öncelik ve lokasyon filtreleriyle iş emri listesini yönetin."
          breadcrumbs={[
            { label: 'Operasyon', href: '/operasyon' },
            { label: 'İş Emirleri' },
          ]}
          rightActions={
            <>
              {isAdmin && (
                <Button
                  type="primary"
                  icon={<ReloadOutlined />}
                  onClick={handleGoogleSync}
                  loading={syncing}
                  style={{ marginRight: '8px' }}
                >
                  Google Sync
                </Button>
              )}
              <Link href="/is-emirleri/yeni" className="btn btn-primary h-10 px-4 py-2">
                Yeni İş Emri
              </Link>
            </>
          }
        />
        <div className="min-w-0 overflow-x-auto">
          <IsEmirleriProTable />
        </div>
      </PageContent>
    </>
  );
}
