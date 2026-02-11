import * as React from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

type EmptyStateType = 'no-results' | 'no-data'

interface EmptyStateActionConfig {
  label: string
  onClick: () => void
}

interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  type?: EmptyStateType
  icon?: React.ReactNode
  title?: string
  description?: string
  action?: React.ReactNode | EmptyStateActionConfig
}

export function EmptyState({
  type,
  icon,
  title,
  description,
  action,
  className,
  ...props
}: EmptyStateProps) {
  const resolvedTitle =
    title ?? (type === 'no-results' ? 'Sonuç bulunamadı' : type === 'no-data' ? 'Henüz veri yok' : 'No data found')

  const resolvedDescription =
    description ??
    (type === 'no-results'
      ? 'Filtreleri değiştirerek tekrar deneyin.'
      : type === 'no-data'
        ? 'Yeni bir kayıt oluşturarak başlayabilirsiniz.'
        : undefined)

  const actionNode =
    action && typeof action === 'object' && 'label' in action && 'onClick' in action ? (
      <Button onClick={action.onClick}>{action.label}</Button>
    ) : (
      action
    )

  return (
    <div className={cn('flex flex-col items-center justify-center p-8 text-center', className)} {...props}>
      {icon && <div className="mb-4">{icon}</div>}
      <h3 className="text-lg font-semibold">{resolvedTitle}</h3>
      {resolvedDescription && <p className="mb-4 mt-1 text-sm text-muted-foreground">{resolvedDescription}</p>}
      {actionNode && <div>{actionNode}</div>}
    </div>
  )
}
