// Logout API Endpoint
// ServicePro ERP - Marlin Yatçılık

import { NextResponse } from 'next/server';
import { verifyToken, getTokenFromHeader } from '@/lib/utils/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get('authorization');
    const token = getTokenFromHeader(authHeader);

    if (token) {
      // Verify token to get user info for audit log
      const payload = await verifyToken(token);

      if (payload) {
        // Create audit log for logout
        await prisma.auditLog.create({
          data: {
            userId: payload.userId,
            userEmail: payload.email,
            islemTuru: 'LOGOUT',
            entityTipi: 'User',
            entityId: payload.userId,
            detay: 'Kullanıcı çıkış yaptı',
          },
        });
      }
    }

    // Return success - client should remove token
    return NextResponse.json({
      success: true,
      message: 'Çıkış başarılı',
    });
  } catch (error) {
    console.error('Logout error:', error);
    // Always return success on logout
    return NextResponse.json({
      success: true,
      message: 'Çıkış başarılı',
    });
  }
}

