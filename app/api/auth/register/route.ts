// Register API Endpoint
// ServicePro ERP - Marlin Yatçılık

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, validatePasswordStrength } from '@/lib/utils/password';
import { normalizeUserRoleForDb } from '@/lib/domain-mappers';
import { z } from 'zod';

// Register validation schema
const registerSchema = z.object({
  email: z.string().email('Geçersiz e-posta formatı'),
  password: z.string().min(8, 'Şifre en az 8 karakter olmalı'),
  ad: z.string().min(2, 'İsim en az 2 karakter olmalı'),
  role: z.enum(['ADMIN', 'YETKILI']).optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate input
    const validation = registerSchema.safeParse(body);
    if (!validation.success) {
      const firstError = validation.error.issues[0];
      return NextResponse.json(
        { error: firstError?.message || 'Validation failed' },
        { status: 400 }
      );
    }

    const { email, password, ad, role = 'YETKILI' } = validation.data;
    const normalizedRole = normalizeUserRoleForDb(role);

    // Password strength validation
    const strengthCheck = validatePasswordStrength(password);
    if (!strengthCheck.valid) {
      return NextResponse.json(
        { error: strengthCheck.errors.join(', ') },
        { status: 400 }
      );
    }

    // Check for existing user
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Bu e-posta adresi zaten kayıtlı' },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        ad,
        role: normalizedRole as 'ADMIN' | 'YETKILI',
        aktif: true,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        userEmail: user.email,
        islemTuru: 'CREATE',
        entityTipi: 'User',
        entityId: user.id,
        detay: 'Yeni kullanıcı kaydı oluşturuldu',
      },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        ad: user.ad,
        role: user.role,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json(
      { error: 'Sunucu hatası' },
      { status: 500 }
    );
  }
}


