import type { LucideIcon } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

interface MetricCardProps {
  title: string
  icon: LucideIcon
  value: string
  detail?: string
  isLoading: boolean
  error: Error | null
  onRetry: () => void
}

export function MetricCard({
  title,
  icon: Icon,
  value,
  detail,
  isLoading,
  error,
  onRetry,
}: MetricCardProps) {
  return (
    <Card className="min-w-0">
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-4" aria-hidden="true" />
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-9 w-28" />
            <Skeleton className="h-4 w-36" />
          </div>
        ) : error ? (
          <div className="flex min-h-18 flex-col items-start justify-between gap-3">
            <p className="text-sm text-muted-foreground">{error.message}</p>
            <Button variant="outline" size="sm" onClick={onRetry}>
              Retry
            </Button>
          </div>
        ) : (
          <>
            <p className="text-3xl font-semibold tracking-tight tabular-nums">{value}</p>
            {detail ? <p className="mt-1 text-xs text-muted-foreground">{detail}</p> : null}
          </>
        )}
      </CardContent>
    </Card>
  )
}
