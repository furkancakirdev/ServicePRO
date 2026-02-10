'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, type User } from '@/lib/auth/auth-context';
import { toast } from '@/lib/components/ui/use-toast';

// User interface artık auth-context'ten import ediliyor

interface ChangePasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);

  const [passwordForm, setPasswordForm] = useState<ChangePasswordForm>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }
    // user zaten auth context'ten geliyor, localStorage'a gerek yok
  }, [isAuthenticated, isLoading, router]);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess(false);

    // Validation
    if (!passwordForm.currentPassword) {
      setPasswordError('Mevcut şifre gereklidir');
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setPasswordError('Yeni şifre en az 8 karakter olmalıdır');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('Yeni şifre ve tekrarı eşleşmiyor');
      return;
    }

    setIsUpdating(true);

    try {
      const res = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Şifre değiştirilemedi');
      }

      setPasswordSuccess(true);
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });

      toast({
        title: 'Başarılı',
        description: 'Şifreniz başarıyla değiştirildi',
      });

      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : 'Bir hata oluştu');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleLogout = () => {
    logout();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Yükleniyor...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Kullanıcı bulunamadı</div>
      </div>
    );
  }

  const roleLabels: Record<string, string> = {
    admin: 'Yönetici',
    yetkili: 'Yetkili',
    ADMIN: 'Yönetici',
    YETKILI: 'Yetkili',
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl animate-fade-in">
      <header className="hero-panel mb-6">
        <h1 className="page-title">Profilim</h1>
        <p className="page-subtitle mt-1">Hesap bilgileriniz</p>
      </header>

      <div className="grid gap-6">
        {/* Kullanıcı Bilgileri */}
        <div className="card surface-panel">
          <h2 className="card-title">Kişisel Bilgiler</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="text-sm text-[var(--color-text-muted)]">Ad Soyad</label>
              <input
                type="text"
                value={user.ad || ''}
                readOnly
                className="w-full mt-1 px-3 py-2 bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-md text-[var(--color-text)]"
              />
            </div>
            <div>
              <label className="text-sm text-[var(--color-text-muted)]">E-posta</label>
              <input
                type="email"
                value={user.email || ''}
                readOnly
                className="w-full mt-1 px-3 py-2 bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-md text-[var(--color-text)]"
              />
            </div>
            <div>
              <label className="text-sm text-[var(--color-text-muted)]">Rol</label>
              <input
                type="text"
                value={roleLabels[user.role] || user.role}
                readOnly
                className="w-full mt-1 px-3 py-2 bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-md text-[var(--color-text)]"
              />
            </div>
            <div>
              <label className="text-sm text-[var(--color-text-muted)]">Kullanıcı ID</label>
              <input
                type="text"
                value={user.id}
                readOnly
                className="w-full mt-1 px-3 py-2 bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-md text-[var(--color-text)] text-sm font-mono"
              />
            </div>
          </div>
        </div>

        {/* Şifre Değiştirme */}
        <div className="card surface-panel">
          <h2 className="card-title">Şifre Değiştir</h2>
          <form onSubmit={handlePasswordChange} className="mt-4 space-y-4">
            <div>
              <label htmlFor="currentPassword" className="block text-sm font-medium mb-1">
                Mevcut Şifre
              </label>
              <input
                id="currentPassword"
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                className="w-full px-3 py-2 bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-md text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                required
              />
            </div>
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium mb-1">
                Yeni Şifre
              </label>
              <input
                id="newPassword"
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                className="w-full px-3 py-2 bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-md text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                placeholder="En az 8 karakter"
                required
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium mb-1">
                Yeni Şifre (Tekrar)
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                className="w-full px-3 py-2 bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-md text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                placeholder="Yeni şifreyi tekrar girin"
                required
              />
            </div>

            {passwordError && (
              <div className="p-3 bg-[var(--color-error)] bg-opacity-20 border border-[var(--color-error)] rounded-md text-[var(--color-error)] text-sm">
                {passwordError}
              </div>
            )}

            {passwordSuccess && (
              <div className="p-3 bg-[var(--color-success)] bg-opacity-20 border border-[var(--color-success)] rounded-md text-[var(--color-success)] text-sm">
                Şifreniz başarıyla değiştirildi!
              </div>
            )}

            <button
              type="submit"
              disabled={isUpdating}
              className="btn btn-primary"
            >
              {isUpdating ? 'Değiştiriliyor...' : 'Şifreyi Değiştir'}
            </button>
          </form>
        </div>

        {/* Hesap İşlemleri */}
        <div className="card surface-panel">
          <h2 className="card-title">Hesap İşlemleri</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              onClick={handleLogout}
              className="btn btn-secondary"
            >
              Çıkış Yap
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
