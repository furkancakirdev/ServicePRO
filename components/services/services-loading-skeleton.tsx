import { Skeleton } from '@/lib/components/ui/loading'

export function ServicesLoadingSkeleton() {
  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="space-y-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]/30 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>

      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]/30 p-4">
        <div className="mb-4 grid gap-3 lg:grid-cols-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>

        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-12 w-full" />
          ))}
        </div>
      </div>
    </div>
  )
}
