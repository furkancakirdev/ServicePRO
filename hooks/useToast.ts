'use client';

import { toast } from 'sonner';

/**
 * Toast notification hook wrapper
 * Provides a consistent API for showing notifications across the application.
 *
 * Usage:
 * ```tsx
 * const { showSuccess, showError, showInfo, showWarning } = useToast();
 *
 * showSuccess('İşlem başarılı!');
 * showError('Bir hata oluştu', { description: 'Lütfen tekrar deneyin' });
 * ```
 */
export function useToast() {
  const showSuccess = (message: string, options?: { description?: string; duration?: number }) => {
    toast.success(message, {
      description: options?.description,
      duration: options?.duration ?? 4000,
    });
  };

  const showError = (message: string, options?: { description?: string; duration?: number }) => {
    toast.error(message, {
      description: options?.description,
      duration: options?.duration ?? 5000,
    });
  };

  const showInfo = (message: string, options?: { description?: string; duration?: number }) => {
    toast.info(message, {
      description: options?.description,
      duration: options?.duration ?? 4000,
    });
  };

  const showWarning = (message: string, options?: { description?: string; duration?: number }) => {
    toast.warning(message, {
      description: options?.description,
      duration: options?.duration ?? 4000,
    });
  };

  const showPromise = <T,>(
    promise: Promise<T>,
    options: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: Error) => string);
    }
  ) => {
    return toast.promise(promise, {
      loading: options.loading,
      success: options.success,
      error: options.error,
    });
  };

  return {
    showSuccess,
    showError,
    showInfo,
    showWarning,
    showPromise,
  };
}
