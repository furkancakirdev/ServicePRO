'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { PageTaskHintBar } from '@/components/ui/page-task-hint-bar';

const PUBLIC_ROUTES = ['/login', '/unauthorized'];

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => pathname.startsWith(route));
}

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const publicRoute = isPublicRoute(pathname);

  return (
    <>
      {!publicRoute ? <Sidebar /> : null}
      <main className={`main-content ${publicRoute ? 'main-content--public' : ''}`}>
        {!publicRoute ? <PageTaskHintBar /> : null}
        {children}
      </main>
    </>
  );
}
