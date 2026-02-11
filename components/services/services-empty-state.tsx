'use client'

import { EmptyState } from '@/lib/components/ui/empty-state'

interface ServicesEmptyStateProps {
  hasFilters: boolean
  onClearFilters?: () => void
  onCreateNew?: () => void
}

export function ServicesEmptyState({ hasFilters, onClearFilters, onCreateNew }: ServicesEmptyStateProps) {
  if (hasFilters) {
    return (
      <EmptyState
        type="no-results"
        action={{
          label: 'Filtreleri Temizle',
          onClick: onClearFilters || (() => {}),
        }}
      />
    )
  }

  return (
    <EmptyState
      type="no-data"
      action={{
        label: 'Yeni Servis Oluştur',
        onClick: onCreateNew || (() => {}),
      }}
    />
  )
}
