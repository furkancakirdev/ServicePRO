/**
 * Yetkili Whitelist Kontrolü
 *
 * Marlin Yatçılık yönetim modülünde sadece belirlenen 4 yetkili
 * admin sayfalarına erişebilir ve puanlama ayarlarını değiştirebilir.
 *
 * Email Listesi:
 * - furkan.cakir@marlin.com.tr
 * - mehmet@marlin.com.tr
 * - tugrul.semiz@marlin.com.tr
 * - burak@marlin.com.tr
 */

// 4 yetkili beyaz listesi - sadece bu kişiler admin yetkisine sahip olabilir
export const YETKILI_WHITELIST = [
  'furkan.cakir@marlin.com.tr',
  'mehmet@marlin.com.tr',
  'tugrul.semiz@marlin.com.tr',
  'burak@marlin.com.tr',
] as const;

// Whitelist tipi
export type YetkiliEmail = (typeof YETKILI_WHITELIST)[number];

/**
 * Email'in whitelist'te olup olmadığını kontrol eder
 * @param email - Kontrol edilecek email adresi
 * @returns true ise email whitelist'te, false değilse
 */
export function isWhitelistedYetkili(email: string): boolean {
  if (!email) return false;

  const emailLower = email.toLowerCase().trim();
  return YETKILI_WHITELIST.some((allowed) =>
    allowed.toLowerCase() === emailLower
  );
}

/**
 * Kullanıcının yetkili olup olmadığını veritabanından kontrol eder
 * @param userId - Kullanıcı ID
 * @returns Promise<boolean> - true ise yetkili, false değilse
 */
export async function checkYetkiliAccess(
  userId: string
): Promise<boolean> {
  try {
    const { prisma } = await import('@/lib/prisma');

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { whitelistedYetkili: true, role: true },
    });

    // Hem whitelist hem de ADMIN veya YETKILI rolü kontrolü
    return (
      user?.whitelistedYetkili === true &&
      (user?.role === 'ADMIN' || user?.role === 'YETKILI')
    );
  } catch (error) {
    console.error('Yetkili kontrol hatası:', error);
    return false;
  }
}

/**
 * Email whitelist'te ise kullanıcıyı yetkili işaretler
 * @param email - Kullanıcı email
 * @returns Promise<boolean> - güncelleme başarılı ise true
 */
export async function markWhitelistedIfExists(
  email: string
): Promise<boolean> {
  if (!isWhitelistedYetkili(email)) {
    return false;
  }

  try {
    const { prisma } = await import('@/lib/prisma');

    await prisma.user.updateMany({
      where: { email: email },
      data: { whitelistedYetkili: true },
    });

    return true;
  } catch (error) {
    console.error('Whitelist işaretleme hatası:', error);
    return false;
  }
}

/**
 * Tüm yetkili email'leri döndürür (frontend için)
 */
export function getAllYetkiliEmails(): readonly string[] {
  return YETKILI_WHITELIST;
}
