'use client';

import { ReactNode } from 'react';
import Header from './Header';

interface PageLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  showSearch?: boolean;
  showBackButton?: boolean;
  actions?: ReactNode;
  className?: string;
}

export default function PageLayout({
  children,
  title,
  subtitle,
  showSearch = false,
  showBackButton = false,
  actions,
  className = '',
}: PageLayoutProps) {
  return (
    <div className={`page-layout ${className}`}>
      <Header
        title={title}
        subtitle={subtitle}
        showSearch={showSearch}
        showBackButton={showBackButton}
        actions={actions}
      />
      <main className="page-content">
        <div className="page-container">
          {children}
        </div>
      </main>
    </div>
  );
}
