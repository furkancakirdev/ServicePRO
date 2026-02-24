'use client';

import { useState, useEffect } from 'react';
import { Personnel } from '@/types';
import { fetchPersonnelById } from '@/lib/api';

/**
 * Custom hook for fetching and managing personnel data
 * Eliminates duplicate useEffect patterns across components.
 *
 * @param id - Personnel ID to fetch
 * @returns Personnel data, loading state, and error state
 */
export function usePersonelData(id: string) {
  const [personel, setPersonel] = useState<Personnel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setLoading(true);
      setError(null);

      try {
        const data = await fetchPersonnelById(id);

        if (!cancelled) {
          setPersonel(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Personel bilgileri yüklenirken bir hata oluştu');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, [id]);

  return { personel, loading, error, refetch: () => {} };
}
