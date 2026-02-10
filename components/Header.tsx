'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Avatar,
  AvatarFallback,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
} from '@/lib/components/ui';
import { toast } from '@/lib/components/ui/use-toast';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  showSearch?: boolean;
  showBackButton?: boolean;
  actions?: React.ReactNode;
}

export default function Header({
  title,
  subtitle,
  showSearch = false,
  showBackButton = false,
  actions,
}: HeaderProps) {
  const pathname = usePathname();
  const [user, setUser] = useState<{ ad: string; rol: string } | null>(null);
  const [notifications, setNotifications] = useState<{ id: string; message: string; read: boolean }[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        setUser(null);
      }
    }

    setNotifications([
      { id: '1', message: 'Yeni servis randevusu oluşturuldu', read: false },
      { id: '2', message: 'Marlin Yıldızı güncellendi', read: false },
    ]);

    if (typeof window !== 'undefined') {
      setCanGoBack(showBackButton || (pathname !== '/' && window.history.length > 1));
    }
  }, [pathname, showBackButton]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const getPageTitle = () => {
    if (title) return { title, subtitle };

    const titles: Record<string, { title: string; subtitle: string }> = {
      '/': { title: 'Dashboard', subtitle: 'Genel bakış' },
      '/servisler': { title: 'Servisler', subtitle: 'Tekne servis randevuları' },
      '/servisler/yeni': { title: 'Yeni Servis', subtitle: 'Randevu oluştur' },
      '/personel': { title: 'Personel', subtitle: 'Ekip yönetimi' },
      '/puanlama': { title: 'Marlin Yıldızı', subtitle: 'Performans değerlendirme' },
      '/puanlama/gecmis': { title: 'Geçmiş', subtitle: 'Geçmiş değerlendirmeler' },
      '/ayarlar': { title: 'Ayarlar', subtitle: 'Sistem ayarları' },
    };

    if (pathname.startsWith('/servisler/')) {
      return { title: 'Servis Detayı', subtitle: 'Randevu bilgileri' };
    }

    return titles[pathname] || { title: 'ServicePRO', subtitle: '' };
  };

  const { title: pageTitle, subtitle: pageSubtitle } = getPageTitle();

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    toast({
      title: 'Bildirimler',
      description: 'Tüm bildirimler okundu olarak işaretlendi',
    });
  };

  return (
    <header className="page-header">
      <div className="page-header-left">
        {canGoBack && (
          <Button variant="ghost" size="sm" onClick={() => window.history.back()} className="mr-2">
            ← Geri
          </Button>
        )}
        <div>
          <h1 className="page-title">{pageTitle}</h1>
          {pageSubtitle && <p className="page-subtitle">{pageSubtitle}</p>}
        </div>
      </div>

      <div className="page-header-center">
        {showSearch && (
          <div className="search-wrapper">
            <Input type="search" placeholder="Ara..." className="search-input" />
          </div>
        )}
      </div>

      <div className="page-header-right">
        {actions}

        <DropdownMenu open={showNotifications} onOpenChange={setShowNotifications}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="flex justify-between items-center">
              Bildirimler
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" onClick={handleMarkAllRead}>
                  Tümünü okundu
                </Button>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {notifications.length > 0 ? (
              notifications.map((notification) => (
                <DropdownMenuItem key={notification.id} className="flex flex-col items-start py-3">
                  <span className={notification.read ? 'text-muted-foreground' : 'font-medium'}>
                    {notification.message}
                  </span>
                  <span className="text-xs text-muted-foreground">Az önce</span>
                </DropdownMenuItem>
              ))
            ) : (
              <DropdownMenuItem disabled>Bildirim yok</DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Link href="/notifications" className="w-full text-center text-primary">
                Tüm bildirimleri gör
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="user-menu-trigger">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-sm">{user?.ad?.charAt(0)?.toUpperCase() || 'U'}</AvatarFallback>
              </Avatar>
              <span className="hidden md:inline text-sm font-medium">{user?.ad || 'Kullanıcı'}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Hesabım</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Link href="/profile">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                Profil
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Link href="/ayarlar">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-2">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
                Ayarlar
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                localStorage.removeItem('user');
                localStorage.removeItem('token');
                if (typeof window !== 'undefined') {
                  window.location.href = '/login';
                }
              }}
              className="text-red-600"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Çıkış Yap
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

