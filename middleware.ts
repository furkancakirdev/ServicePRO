// Middleware for Route Protection & RBAC
// ServicePro ERP - Marlin Yatçılık

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { normalizeRole, type CanonicalRole } from '@/lib/auth/role';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fallback-secret-change-in-production'
);

// Public routes that don't require authentication
const publicRoutes = [
  '/login',
  '/register',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/me',
  '/api/auth/logout',
  '/api/health',
  '/api/cron/sync',
];

// Static files that should be ignored
const staticFilePattern = /\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|eot)$/i;

// Role-based route protection
// Format: { path: requiredMinimumRole }
const protectedRoutes = {
  '/admin': 'ADMIN',
  '/ayarlar': 'ADMIN',
  '/users': 'ADMIN',
  '/raporlar': 'YETKILI',
  '/personel': 'YETKILI',
  '/puanlama': 'YETKILI',
} as const;

// Role hierarchy (higher number = more privileges)
const roleLevels: Record<CanonicalRole, number> = {
  ADMIN: 4,
  YETKILI: 3,
};

/**
 * Check if a role meets or exceeds the minimum required role level
 */
function hasMinimumRole(userRole: string, minimumRole: CanonicalRole): boolean {
  const normalizedRole = normalizeRole(userRole);
  if (!normalizedRole) return false;
  return roleLevels[normalizedRole] >= roleLevels[minimumRole];
}

/**
 * Verify JWT token and extract payload
 */
async function verifyToken(token: string): Promise<{ userId: string; email: string; role: string } | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      userId: payload.userId as string,
      email: payload.email as string,
      role: payload.role as string,
    };
  } catch {
    return null;
  }
}

/**
 * Get required role for a path
 */
function getRequiredRole(pathname: string): CanonicalRole | null {
  for (const [route, role] of Object.entries(protectedRoutes)) {
    if (pathname.startsWith(route)) {
      return role as CanonicalRole;
    }
  }
  return null;
}

/**
 * Main middleware function
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static files
  if (staticFilePattern.test(pathname)) {
    return NextResponse.next();
  }

  // Skip _next internal routes
  if (pathname.startsWith('/_next')) {
    return NextResponse.next();
  }

  // Allow public routes
  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Check for token in cookie or Authorization header
  const authHeader = request.headers.get('authorization');
  const tokenFromHeader = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
  const tokenFromCookie = request.cookies.get('token')?.value;
  const token = tokenFromHeader || tokenFromCookie;

  if (!token) {
    // No token found
    if (pathname.startsWith('/api')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Verify token
  const payload = await verifyToken(token);

  if (!payload) {
    // Invalid token
    if (pathname.startsWith('/api')) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Check role-based access control
  const requiredRole = getRequiredRole(pathname);
  if (requiredRole && !hasMinimumRole(payload.role, requiredRole)) {
    // User doesn't have required role
    if (pathname.startsWith('/api')) {
      return NextResponse.json({ error: 'Forbidden - Insufficient permissions' }, { status: 403 });
    }
    // Redirect to unauthorized page or home
    const unauthorizedUrl = new URL('/unauthorized', request.url);
    return NextResponse.redirect(unauthorizedUrl);
  }

  // Token is valid and user has required role - add user info to headers
  const response = NextResponse.next();
  response.headers.set('x-user-id', payload.userId);
  response.headers.set('x-user-email', payload.email);
  response.headers.set('x-user-role', normalizeRole(payload.role) ?? payload.role);

  return response;
}

/**
 * Matcher configuration
 */
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
