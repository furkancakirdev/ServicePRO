import * as React from 'react'
import { cn } from '@/lib/utils'

interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg'
}

const sizeClasses = {
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-8 w-8 border-3',
}

export function Spinner({
  className,
  size = 'md',
  ...props
}: SpinnerProps) {
  return (
    <div
      className={cn(
        'animate-spin rounded-full border-primary border-t-transparent',
        sizeClasses[size],
        className
      )}
      {...props}
    />
  )
}

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  width?: string | number
  height?: string | number
  borderRadius?: string
}

export function Skeleton({
  className,
  width,
  height,
  borderRadius,
  ...props
}: SkeletonProps) {
  return (
    <div
      className={cn('animate-pulse rounded bg-muted', className)}
      style={{ width, height, borderRadius }}
      {...props}
    />
  )
}
