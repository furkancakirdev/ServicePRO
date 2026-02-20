'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Anchor, KeyRound, Mail } from 'lucide-react';
import { useAuth } from '@/lib/hooks/use-auth';

const loginSchema = z.object({
  email: z.string().email('Gecerli bir e-posta girin'),
  password: z.string().min(1, 'Sifre gerekli'),
  rememberMe: z.boolean().optional(),
});

type LoginForm = z.infer<typeof loginSchema>;

function LoginFormContent() {
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

  useEffect(() => {
    if (!isAuthenticated) return;
    const redirectTo = searchParams.get('redirect') || '/';
    router.push(redirectTo);
  }, [isAuthenticated, router, searchParams]);

  const onSubmit = async (data: LoginForm) => {
    setError('');
    setIsLoading(true);
    try {
      await login(data.email, data.password);
      const redirectTo = searchParams.get('redirect') || '/';
      if (typeof window !== 'undefined') {
        window.location.href = redirectTo;
      }
    } catch (submitError: unknown) {
      setError(submitError instanceof Error ? submitError.message : 'Giris basarisiz');
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.18),transparent_42%),linear-gradient(180deg,#08111d_0%,#0f172a_100%)] px-4 py-8">
      <div className="w-full max-w-md rounded-2xl border border-slate-700/70 bg-slate-950/80 p-6 shadow-2xl backdrop-blur-sm">
        <div className="mb-5 text-center">
          <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-sky-500/20 text-sky-300">
            <Anchor className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-semibold text-white">ServicePRO</h1>
          <p className="mt-1 text-sm text-slate-300">Giris yaparak bugunku is planina ulasin</p>
        </div>

        <div className="mb-4 rounded-lg border border-sky-800/70 bg-sky-950/30 px-3 py-2 text-xs text-sky-100">
          Ne yapmaliyim? E-posta ve sifreyi girin, sonra &quot;Giris Yap&quot; butonuna basin.
        </div>

        {error ? (
          <div className="mb-4 rounded-lg border border-red-700/70 bg-red-950/40 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm text-slate-300">
              E-posta
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                id="email"
                type="email"
                autoComplete="email"
                className="form-input w-full pl-9"
                placeholder="ornek@servicepro.com"
                {...register('email')}
                aria-invalid={errors.email ? 'true' : 'false'}
              />
            </div>
            {errors.email ? <p className="mt-1 text-xs text-red-300">{errors.email.message}</p> : null}
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm text-slate-300">
              Sifre
            </label>
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                className="form-input w-full pl-9"
                placeholder="••••••••"
                {...register('password')}
                aria-invalid={errors.password ? 'true' : 'false'}
              />
            </div>
            {errors.password ? <p className="mt-1 text-xs text-red-300">{errors.password.message}</p> : null}
          </div>

          <label htmlFor="rememberMe" className="flex items-center gap-2 text-sm text-slate-300">
            <input id="rememberMe" type="checkbox" {...register('rememberMe')} />
            Beni hatirla
          </label>

          <button type="submit" className="btn btn-primary w-full" disabled={isLoading}>
            {isLoading ? 'Giris yapiliyor...' : 'Giris Yap'}
          </button>
        </form>

        <div className="mt-5 rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2 text-xs text-slate-300">
          <p className="mb-1 font-medium text-slate-200">Demo hesap:</p>
          <p>
            admin@servicepro.com / admin123
          </p>
        </div>
      </div>
    </div>
  );
}

function LoginLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#08111d_0%,#0f172a_100%)]">
      <div className="rounded-xl border border-slate-800/80 bg-slate-950/70 px-6 py-5 text-sm text-slate-300">
        Giris ekrani yukleniyor...
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginLoading />}>
      <LoginFormContent />
    </Suspense>
  );
}
