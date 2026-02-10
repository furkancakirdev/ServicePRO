// Role-Based Access Control - Permission Definitions
// ServicePro ERP - Marlin Yatçılık

import { UserRole } from '@prisma/client';

/**
 * All available permissions in the system
 * Format: resource.action
 */
export type Permission =
  // User Management
  | 'users.create'
  | 'users.read'
  | 'users.update'
  | 'users.delete'
  // Service Management
  | 'servis.create'
  | 'servis.read'
  | 'servis.update'
  | 'servis.delete'
  // Personnel Management
  | 'personel.create'
  | 'personel.read'
  | 'personel.update'
  | 'personel.delete'
  // Reports
  | 'raporlar.read'
  | 'raporlar.create'
  | 'raporlar.export'
  // Settings
  | 'ayarlar.manage'
  // Scoring System
  | 'puanlama.read'
  | 'puanlama.create'
  | 'puanlama.update';

/**
 * Permission matrix for each role
 * Defines which permissions each role has access to
 */
export const ROLE_PERMISSIONS: Partial<Record<UserRole, Permission[]>> = {
  // ADMIN - Full system access
  ADMIN: [
    'users.create',
    'users.read',
    'users.update',
    'users.delete',
    'servis.create',
    'servis.read',
    'servis.update',
    'servis.delete',
    'personel.create',
    'personel.read',
    'personel.update',
    'personel.delete',
    'raporlar.read',
    'raporlar.create',
    'raporlar.export',
    'ayarlar.manage',
    'puanlama.read',
    'puanlama.create',
    'puanlama.update',
  ],

  // YETKILI - Service operations and reporting
  YETKILI: [
    'servis.create',
    'servis.read',
    'servis.update',
    'servis.delete',
    'personel.read',
    'personel.update',
    'raporlar.read',
    'raporlar.create',
    'raporlar.export',
    'puanlama.read',
    'puanlama.create',
    'puanlama.update',
  ],
};

/**
 * Get all permissions for a given role
 * @param role - User role
 * @returns Array of permissions
 */
export function getPermissionsForRole(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}

/**
 * Check if a role has a specific permission
 * @param role - User role
 * @param permission - Permission to check
 * @returns True if role has the permission
 */
export function roleHasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/**
 * Permission groups for UI display
 */
export const PERMISSION_GROUPS = {
  KULLANICILAR: ['users.create', 'users.read', 'users.update', 'users.delete'],
  SERVISLER: ['servis.create', 'servis.read', 'servis.update', 'servis.delete'],
  PERSONEL: ['personel.create', 'personel.read', 'personel.update', 'personel.delete'],
  RAPORLAR: ['raporlar.read', 'raporlar.create', 'raporlar.export'],
  AYARLAR: ['ayarlar.manage'],
  PUANLAMA: ['puanlama.read', 'puanlama.create', 'puanlama.update'],
} as const;

/**
 * Human-readable permission labels
 */
export const PERMISSION_LABELS: Record<Permission, string> = {
  'users.create': 'Kullanıcı Oluştur',
  'users.read': 'Kullanıcıları Görüntüle',
  'users.update': 'Kullanıcı Düzenle',
  'users.delete': 'Kullanıcı Sil',
  'servis.create': 'Servis Oluştur',
  'servis.read': 'Servisleri Görüntüle',
  'servis.update': 'Servis Düzenle',
  'servis.delete': 'Servis Sil',
  'personel.create': 'Personel Ekle',
  'personel.read': 'Personeli Görüntüle',
  'personel.update': 'Personel Düzenle',
  'personel.delete': 'Personel Sil',
  'raporlar.read': 'Raporları Görüntüle',
  'raporlar.create': 'Rapor Oluştur',
  'raporlar.export': 'Rapor Dışa Aktar',
  'ayarlar.manage': 'Ayarları Yönet',
  'puanlama.read': 'Puanları Görüntüle',
  'puanlama.create': 'Puanlama Yap',
  'puanlama.update': 'Puan Düzenle',
};
