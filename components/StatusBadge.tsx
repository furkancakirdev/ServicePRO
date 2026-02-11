'use client'

import { ServisDurumu } from '@prisma/client'
import { getStatusConfig } from '@/lib/config/status-config'

interface StatusBadgeProps {
  status: ServisDurumu
  showIcon?: boolean
}

export function StatusBadge({ status, showIcon = true }: StatusBadgeProps) {
  const config = getStatusConfig(status)

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.color} ${config.bgColor}`}>
      {showIcon && <span>{config.icon}</span>}
      {config.label}
    </span>
  )
}
