'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { BellOutlined, DownOutlined, PlusOutlined, SearchOutlined, UserOutlined } from '@ant-design/icons';
import { ProLayout, type MenuDataItem } from '@ant-design/pro-components';
import { Avatar, Badge, Button, Dropdown, Input, Space, type MenuProps } from 'antd';
import { useAuth } from '@/lib/auth/auth-context';
import { PageTaskHintBar } from '@/components/ui/page-task-hint-bar';

const PUBLIC_ROUTES = ['/login', '/unauthorized'];

const MENU_ROUTES: MenuDataItem[] = [
  { path: '/operasyon', name: 'Operasyon' },
  { path: '/is-emirleri', name: 'İş Emirleri' },
  { path: '/takvim', name: 'Planlama' },
  { path: '/talepler', name: 'Talepler' },
  {
    name: 'Yönetim',
    children: [
      { path: '/tekneler', name: 'Tekneler' },
      { path: '/personel', name: 'Personel' },
      { path: '/ayarlar', name: 'Ayarlar' },
    ],
  },
];

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => pathname.startsWith(route));
}

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const publicRoute = isPublicRoute(pathname);

  if (publicRoute) {
    return <main className="min-h-screen">{children}</main>;
  }

  const newMenuItems: MenuProps['items'] = [
    {
      key: 'yeni-talep',
      label: 'Talep',
      onClick: () => router.push('/talepler'),
    },
    {
      key: 'yeni-is-emri',
      label: 'İş Emri',
      onClick: () => router.push('/is-emirleri/yeni'),
    },
  ];

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profil',
      label: 'Profil',
      onClick: () => router.push('/profile'),
    },
    { type: 'divider' },
    {
      key: 'cikis',
      label: 'Çıkış Yap',
      danger: true,
      onClick: () => logout(),
    },
  ];

  const userInitial = (user?.ad?.trim().charAt(0) || 'K').toLocaleUpperCase('tr-TR');

  return (
    <ProLayout
      title="ServicePRO"
      logo={false}
      layout="top"
      splitMenus={false}
      route={{ routes: MENU_ROUTES }}
      location={{ pathname }}
      menuItemRender={(item, dom) => (item.path ? <Link href={item.path}>{dom}</Link> : dom)}
      onMenuHeaderClick={() => router.push('/operasyon')}
      actionsRender={() => [
        <Input
          key="global-search"
          allowClear
          prefix={<SearchOutlined />}
          placeholder="Tekne, iş emri veya talep ara..."
          style={{ width: 280 }}
        />,
        <Dropdown key="quick-create" menu={{ items: newMenuItems }} trigger={['click']}>
          <Button type="default">
            <Space size={6}>
              <PlusOutlined />
              Yeni
              <DownOutlined />
            </Space>
          </Button>
        </Dropdown>,
        <Badge key="notifications" dot>
          <Button
            aria-label="Bildirimler"
            icon={<BellOutlined />}
            onClick={() => router.push('/notifications')}
          />
        </Badge>,
      ]}
      avatarProps={{
        title: user?.ad || 'Kullanıcı',
        icon: <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#1677ff' }}>{userInitial}</Avatar>,
        render: (_, avatarDom) => (
          <Dropdown menu={{ items: userMenuItems }} trigger={['click']}>
            <span>{avatarDom}</span>
          </Dropdown>
        ),
      }}
      contentStyle={{
        minWidth: 0,
        padding: '16px 24px 24px',
      }}
    >
      <div className="min-w-0">
        <PageTaskHintBar />
        {children}
      </div>
    </ProLayout>
  );
}
