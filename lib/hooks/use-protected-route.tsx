'use client';

// Protected Route Hook
// ServicePro ERP - Marlin Yatçılık

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from './use-auth';
import { hasMinimumRole, hasPermission } from '@/lib/rbac/rbac';
import { UserRole } from '@prisma/client';
import { type Permission } from '@/lib/rbac/permissions';

interface UseProtectedRouteOptions {
  minimumRole?: UserRole;
  redirectTo?: string;
}

/**
 * Hook to protect routes that require authentication
 * Redirects to login if not authenticated
 * Redirects to unauthorized page if role is insufficient
 */
export function useProtectedRoute(options: UseProtectedRouteOptions = {}) {
  const { minimumRole, redirectTo = '/login' } = options;
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) {
      return; // Don't redirect while loading
    }

    if (!isAuthenticated) {
      // Not authenticated, redirect to login
      if (typeof window !== 'undefined') {
        const loginUrl = new URL(redirectTo, window.location.origin);
        loginUrl.searchParams.set('redirect', pathname);
        router.push(loginUrl.toString());
      }
      return;
    }

    if (minimumRole && user && !hasMinimumRole(user.role as UserRole, minimumRole)) {
      // Authenticated but insufficient role
      router.push('/unauthorized');
      return;
    }
  }, [isLoading, isAuthenticated, user, minimumRole, pathname, router, redirectTo]);

  return {
    user,
    isLoading,
    isAuthenticated,
    hasRequiredRole: minimumRole
      ? user
        ? hasMinimumRole(user.role as UserRole, minimumRole)
        : false
      : true,
  };
}

/**
 * Hook to check if current user has specific permission
 */
export function usePermission(permission: Permission): boolean {
  const { user } = useAuth();

  if (!user) return false;

  return hasPermission(user.role as UserRole, permission);
}
