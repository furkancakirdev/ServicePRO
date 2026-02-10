// Login API Endpoint
// ServicePro ERP - Marlin Yatçılık

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword } from '@/lib/utils/password';
import { generateToken } from '@/lib/utils/auth';
import { isWhitelistedYetkili, markWhitelistedIfExists } from '@/lib/utils/yetkili-whitelist';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'E-posta ve şifre gerekli' },
        { status: 400 }
      );
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Geçersiz e-posta veya şifre' },
        { status: 401 }
      );
    }

    // Check if user is active
    if (!user.aktif) {
      return NextResponse.json(
        { error: 'Bu hesap devre dışı bırakılmış' },
        { status: 403 }
      );
    }

    // Verify password
    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Geçersiz e-posta veya şifre' },
        { status: 401 }
      );
    }

    // Update last login timestamp ve whitelist kontrolü
    // Email whitelist'te ise otomatik olarak yetkili işaretle
    await markWhitelistedIfExists(user.email);

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Generate JWT token
    const token = await generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        userEmail: user.email,
        islemTuru: 'LOGIN',
        entityTipi: 'User',
        entityId: user.id,
        detay: 'Kullanıcı giriş yaptı',
      },
    });

    // Return user data without password
    return NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        ad: user.ad,
        role: user.role,
        whitelistedYetkili: isWhitelistedYetkili(user.email), // Whitelist kontrolü
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Sunucu hatası' },
      { status: 500 }
    );
  }
}

