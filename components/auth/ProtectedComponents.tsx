'use client';

// Permission-Based Component Protection
// ServicePro ERP - Marlin Yatçılık

import { useAuth } from '@/lib/hooks/use-auth';
import { UserRole } from '@prisma/client';
import { type Permission } from '@/lib/rbac/permissions';
import { hasPermission } from '@/lib/rbac/rbac';
import { ReactElement } from 'react';

interface PermissionCheckProps {
  permission: Permission;
  fallback?: ReactElement | null;
  children: ReactElement;
}

/**
 * Component that renders children only if current user has the specified permission
 */
export function PermissionCheck({ permission, fallback = null, children }: PermissionCheckProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!user || !hasPermission(user.role as UserRole, permission)) {
    return fallback || null;
  }

  return children;
}

interface RoleGateProps {
  allowedRoles: UserRole[];
  fallback?: ReactElement | null;
  children: ReactElement;
}

/**
 * Component that renders children only if current user's role is in allowed roles
 */
export function RoleGate({ allowedRoles, fallback = null, children }: RoleGateProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!user || !allowedRoles.includes(user.role as UserRole)) {
    return fallback || null;
  }

  return children;
}

interface MinimumRoleProps {
  minimumRole: UserRole;
  fallback?: ReactElement | null;
  children: ReactElement;
}

/**
 * Component that renders children only if current user meets minimum role level
 */
export function MinimumRole({ minimumRole, fallback = null, children }: MinimumRoleProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return fallback || null;
  }

  const roleLevels: Record<UserRole, number> = {
    ADMIN: 4,
    YETKILI: 3,
  };

  const userLevel = roleLevels[user.role as UserRole] || 0;
  const requiredLevel = roleLevels[minimumRole];

  if (userLevel < requiredLevel) {
    return fallback || null;
  }

  return children;
}
