'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/lib/components/ui';
import { normalizeRole } from '@/lib/auth/role';

// Icons as SVG components
const Icons = {
  Dashboard: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </svg>
  ),
  Calendar: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  Users: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  Star: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
  Trophy: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  ),
  Document: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  ),
  Settings: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  Logout: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
  ChevronDown: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  ),
  Anchor: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="5" r="3" />
      <line x1="12" y1="22" x2="12" y2="8" />
      <path d="M5 12H2a10 10 0 0 0 20 0h-3" />
    </svg>
  ),
};

interface NavItem {
  href: string;
  label: string;
  icon: keyof typeof Icons;
  badge?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

interface User {
  id: string;
  ad: string;
  rol: 'ADMIN' | 'YETKILI' | 'TEKNIisyEN' | 'MUSTERI';
  email?: string;
}

const navSections: NavSection[] = [
  {
    title: 'Genel',
    items: [
      { href: '/', label: 'Kontrol Merkezi', icon: 'Dashboard' },
    ],
  },
  {
    title: 'Operasyon',
    items: [
      { href: '/servisler', label: 'Servisler', icon: 'Calendar', badge: '5' },
      { href: '/takvim', label: 'Takvim', icon: 'Calendar' },
      { href: '/personel', label: 'Personel', icon: 'Users' },
    ],
  },
  {
    title: 'Performans',
    items: [
      { href: '/puanlama', label: 'Puanlama', icon: 'Star' },
      { href: '/puanlama/gecmis', label: 'Geçmiş & Klasman', icon: 'Trophy' },
    ],
  },
  {
    title: 'Raporlar',
    items: [
      { href: '/raporlar/performans', label: 'Aylık Performans', icon: 'Document' },
      { href: '/raporlar/rozetler', label: 'Rozet Kazananları', icon: 'Trophy' },
    ],
  },
  {
    title: 'Yönetim',
    items: [
      { href: '/ayarlar', label: 'Ayarlar', icon: 'Settings' },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem('user');
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        setUser(null);
      }
    } else {
      setUser(null);
    }
    setIsHydrated(true);
  }, []);

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(href);
  };

  const getRoleLabel = (role: string) => {
    const normalizedRole = normalizeRole(role) ?? role;
    const labels: Record<string, string> = {
      ADMIN: 'Admin',
      YETKILI: 'Yetkili',
      TEKNIisyEN: 'Teknisyen',
      MUSTERI: 'Müşteri',
    };
    return labels[normalizedRole] || normalizedRole;
  };

  const getRoleColor = (role: string) => {
    const normalizedRole = normalizeRole(role) ?? role;
    const colors: Record<string, string> = {
      ADMIN: 'var(--color-warning)',
      YETKILI: 'var(--color-primary)',
      TEKNIisyEN: 'var(--color-success)',
      MUSTERI: 'var(--color-info)',
    };
    return colors[normalizedRole] || 'var(--color-text-muted)';
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  };

  const visibleSections = navSections.filter((section) => {
    // Admin-only sections
    if (
      section.title === 'Yönetim' &&
      (!isHydrated || (normalizeRole(user?.rol ?? '') ?? user?.rol) !== 'ADMIN')
    ) {
      return false;
    }
    return true;
  });

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <Icons.Anchor />
        </div>
        <div className="sidebar-brand">
          <span className="sidebar-title">ServicePRO</span>
          <span className="sidebar-subtitle">Marlin Yatçılık</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {visibleSections.map((section) => (
          <div key={section.title} className="sidebar-section">
            <div className="sidebar-section-title">{section.title}</div>
            {section.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`sidebar-link ${isActive(item.href) ? 'active' : ''}`}
              >
                <span className="sidebar-icon">
                  {Icons[item.icon]()}
                </span>
                <span className="sidebar-label">{item.label}</span>
                {item.badge && (
                  <span className="sidebar-badge">{item.badge}</span>
                )}
              </Link>
            ))}
          </div>
        ))}
      </nav>

      {/* User Profile Dropdown */}
      {user && (
        <div className="sidebar-user">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="sidebar-user-trigger">
                <div
                  className="sidebar-user-avatar"
                  style={{ backgroundColor: getRoleColor(user.rol) }}
                >
                  {user.ad.charAt(0).toUpperCase()}
                </div>
                <div className="sidebar-user-info">
                  <span className="sidebar-user-name">{user.ad}</span>
                  <span className="sidebar-user-role">{getRoleLabel(user.rol)}</span>
                </div>
                <Icons.ChevronDown />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Hesap</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Link href="/profile">
                  <span>Profil</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Link href="/ayarlar">
                  <span>Ayarlar</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                <Icons.Logout />
                <span>Çıkış Yap</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      <div className="sidebar-footer">
        <span className="sidebar-version">v6.0</span>
      </div>
    </aside>
  );
}

