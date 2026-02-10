'use client';

// Login Page
// ServicePro ERP - Marlin Yatçılık

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/lib/hooks/use-auth';

// Login form validation schema
const loginSchema = z.object({
  email: z.string().email('Geçersiz e-posta formatı'),
  password: z.string().min(1, 'Şifre gerekli'),
  rememberMe: z.boolean().optional(),
});

type LoginForm = z.infer<typeof loginSchema>;

function clearTokenArtifactsOnLoginPage() {
  if (typeof window === 'undefined') return;

  localStorage.removeItem('token');

  const expires = 'Thu, 01 Jan 1970 00:00:00 GMT';
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  const host = window.location.hostname;
  const domains = Array.from(new Set([host, `.${host}`].filter(Boolean)));

  document.cookie = `token=; path=/; expires=${expires}; SameSite=Lax${secure}`;
  document.cookie = `token=; path=/; domain=; expires=${expires}; SameSite=Lax${secure}`;

  for (const domain of domains) {
    document.cookie = `token=; path=/; domain=${domain}; expires=${expires}; SameSite=Lax${secure}`;
  }
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isAuthenticated } = useAuth();
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
  });

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const redirectTo = searchParams.get('redirect') || '/';
      router.push(redirectTo);
    }
  }, [isAuthenticated, router, searchParams]);

  // Always clean stale token artifacts when the login page is opened.
  useEffect(() => {
    clearTokenArtifactsOnLoginPage();
  }, []);

  const onSubmit = async (data: LoginForm) => {
    setError('');
    setIsLoading(true);

    try {
      await login(data.email, data.password);

      // Get redirect from URL query param
      const redirectTo = searchParams.get('redirect') || '/';

      // Use window.location.href for full page reload to ensure middleware sees the cookie
      if (typeof window !== 'undefined') {
        window.location.href = redirectTo;
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Giriş başarısız');
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, var(--color-bg) 0%, #1a1a2e 100%)',
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '400px',
          padding: 'var(--space-2xl)',
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-xl)' }}>
          <div style={{ fontSize: '3rem', marginBottom: 'var(--space-md)' }}>⚓</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>ServicePRO</h1>
          <p
            style={{
              color: 'var(--color-text-muted)',
              fontSize: '0.85rem',
            }}
          >
            Tekne Teknik Servis Takip Sistemi
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div
            style={{
              padding: 'var(--space-md)',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid var(--color-error)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-error)',
              marginBottom: 'var(--space-lg)',
              fontSize: '0.85rem',
            }}
          >
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit(onSubmit)}>
          {/* Email Field */}
          <div style={{ marginBottom: 'var(--space-lg)' }}>
            <label
              style={{
                display: 'block',
                marginBottom: 'var(--space-xs)',
                fontSize: '0.85rem',
                color: 'var(--color-text-muted)',
              }}
            >
              E-posta
            </label>
            <input
              type="email"
              className="form-input"
              placeholder="ornek@servicepro.com"
              {...register('email')}
              style={{ width: '100%' }}
              aria-invalid={errors.email ? 'true' : 'false'}
            />
            {errors.email && (
              <span
                style={{
                  color: 'var(--color-error)',
                  fontSize: '0.75rem',
                  display: 'block',
                  marginTop: 'var(--space-xs)',
                }}
              >
                {errors.email.message}
              </span>
            )}
          </div>

          {/* Password Field */}
          <div style={{ marginBottom: 'var(--space-lg)' }}>
            <label
              style={{
                display: 'block',
                marginBottom: 'var(--space-xs)',
                fontSize: '0.85rem',
                color: 'var(--color-text-muted)',
              }}
            >
              Şifre
            </label>
            <input
              type="password"
              className="form-input"
              placeholder="••••••••"
              {...register('password')}
              style={{ width: '100%' }}
              aria-invalid={errors.password ? 'true' : 'false'}
            />
            {errors.password && (
              <span
                style={{
                  color: 'var(--color-error)',
                  fontSize: '0.75rem',
                  display: 'block',
                  marginTop: 'var(--space-xs)',
                }}
              >
                {errors.password.message}
              </span>
            )}
          </div>

          {/* Remember Me Checkbox */}
          <div style={{ marginBottom: 'var(--space-xl)' }}>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input
                type="checkbox"
                {...register('rememberMe')}
                style={{ marginRight: 'var(--space-xs)' }}
              />
              <span style={{ fontSize: '0.85rem' }}>Beni hatırla</span>
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isLoading}
            style={{
              width: '100%',
              padding: 'var(--space-md)',
              fontSize: '1rem',
            }}
          >
            {isLoading ? ' Giriş yapılıyor...' : ' Giriş Yap'}
          </button>
        </form>

        {/* Demo Credentials */}
        <div
          style={{
            marginTop: 'var(--space-xl)',
            padding: 'var(--space-md)',
            background: 'var(--color-surface-elevated)',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.75rem',
          }}
        >
          <div style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-xs)' }}>
            Demo Giriş Bilgileri:
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-xs)' }}>
            <span>Admin:</span>
            <code>admin@servicepro.com / admin123</code>
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
            (Önce veritabanına admin kullanıcısı ekleyin)
          </div>
        </div>
      </div>
    </div>
  );
}

// Loading fallback for Suspense
function LoginLoading() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, var(--color-bg) 0%, #1a1a2e 100%)',
      }}
    >
      <div className="card" style={{ width: '100%', maxWidth: '400px', padding: 'var(--space-2xl)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: 'var(--space-md)' }}>⚓</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>ServicePRO</h1>
          <p style={{ color: 'var(--color-text-muted)', marginTop: 'var(--space-lg)' }}>
            Yükleniyor...
          </p>
        </div>
      </div>
    </div>
  );
}

// Main page component with Suspense
export default function LoginPage() {
  return (
    <Suspense fallback={<LoginLoading />}>
      <LoginForm />
    </Suspense>
  );
}





