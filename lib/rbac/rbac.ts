// Role-Based Access Control - Helper Functions
// ServicePro ERP

import { ROLE_PERMISSIONS, type Permission } from './permissions';
import { UserRole } from '@prisma/client';

/**
 * Check if a role has a specific permission.
 */
export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/**
 * Check if a role has ANY of the specified permissions.
 */
export function hasAnyPermission(role: UserRole, permissions: Permission[]): boolean {
  return permissions.some((p) => hasPermission(role, p));
}

/**
 * Check if a role has ALL of the specified permissions.
 */
export function hasAllPermissions(role: UserRole, permissions: Permission[]): boolean {
  return permissions.every((p) => hasPermission(role, p));
}

/**
 * Check if a user's role matches any of the allowed roles.
 */
export function hasRole(userRole: UserRole, allowedRoles: UserRole[]): boolean {
  return allowedRoles.includes(userRole);
}

/**
 * Get the hierarchy level of a role.
 * Higher number = more privileges.
 */
export function getRoleLevel(role: UserRole): number {
  const levels: Partial<Record<UserRole, number>> = {
    ADMIN: 4,
    YETKILI: 3,
  };
  return levels[role] ?? 0;
}

/**
 * Check if a user's role meets or exceeds a minimum role level.
 */
export function hasMinimumRole(userRole: UserRole, minimumRole: UserRole): boolean {
  return getRoleLevel(userRole) >= getRoleLevel(minimumRole);
}

/**
 * Get all permissions for a role.
 */
export function getRolePermissions(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}

/**
 * Role display names.
 */
export const ROLE_LABELS: Partial<Record<UserRole, string>> = {
  ADMIN: 'Yonetici',
  YETKILI: 'Yetkili',
};

/**
 * Role icons.
 */
export const ROLE_ICONS: Partial<Record<UserRole, string>> = {
  ADMIN: 'shield',
  YETKILI: 'key',
};

/**
 * Role colors.
 */
export const ROLE_COLORS: Partial<Record<UserRole, string>> = {
  ADMIN: '#dc2626', // red-600
  YETKILI: '#2563eb', // blue-600
};

/**
 * Get role display information.
 */
export function getRoleInfo(role: UserRole) {
  return {
    label: ROLE_LABELS[role] ?? String(role),
    icon: ROLE_ICONS[role] ?? 'user',
    color: ROLE_COLORS[role] ?? '#6b7280',
  };
}

