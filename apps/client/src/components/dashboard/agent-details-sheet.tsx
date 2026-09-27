import { Mail, MessageCircle, Percent, TimerReset, Users } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import { formatDuration, formatNumber, formatPercentage, getAgentInitials } from "@/lib/format"
import type { AgentMetric } from "@/types/api"

interface AgentDetailsSheetProps {
  agent: AgentMetric | null
  onOpenChange: (open: boolean) => void
}

function DetailStat({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium tabular-nums">{value}</p>
    </div>
  )
}

export function AgentDetailsSheet({ agent, onOpenChange }: AgentDetailsSheetProps) {
  return (
    <Sheet open={agent !== null} onOpenChange={onOpenChange}>
      {agent ? (
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader className="border-b pr-12">
            <div className="flex items-center gap-3">
              <Avatar size="lg">
                <AvatarFallback>{getAgentInitials(agent.name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <SheetTitle className="truncate">{agent.name}</SheetTitle>
                <SheetDescription className="mt-1 flex items-center gap-1 truncate">
                  <Mail className="size-3.5" aria-hidden="true" />
                  {agent.email}
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <div className="space-y-6 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Card size="sm">
                <CardContent className="flex-row items-center gap-3">
                  <div className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary">
                    <Users className="size-4" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Conversations handled</p>
                    <p className="text-lg font-semibold tabular-nums">{formatNumber(agent.conversationsHandled)}</p>
                  </div>
                </CardContent>
              </Card>
              <Card size="sm">
                <CardContent className="flex-row items-center gap-3">
                  <div className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary">
                    <MessageCircle className="size-4" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Reassigned chats</p>
                    <p className="text-lg font-semibold tabular-nums">{formatNumber(agent.reassignedChats)}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <TimerReset className="size-4 text-primary" aria-hidden="true" />
                <h3 className="text-sm font-semibold">Human first response</h3>
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                <DetailStat label="Average" value={formatDuration(agent.humanFRT.averageMs)} />
                <DetailStat label="Median" value={formatDuration(agent.humanFRT.medianMs)} />
                <DetailStat label="Sample size" value={formatNumber(agent.humanFRT.sampleSize)} />
              </div>
            </section>

            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <TimerReset className="size-4 text-primary" aria-hidden="true" />
                <h3 className="text-sm font-semibold">Resolution time</h3>
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                <DetailStat label="Average" value={formatDuration(agent.resolutionTime.averageMs)} />
                <DetailStat label="Median" value={formatDuration(agent.resolutionTime.medianMs)} />
                <DetailStat label="Sample size" value={formatNumber(agent.resolutionTime.sampleSize)} />
              </div>
            </section>

            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <Percent className="size-4 text-primary" aria-hidden="true" />
                <h3 className="text-sm font-semibold">Reassignment rate</h3>
              </div>
              <DetailStat label="Percentage of handled conversations" value={formatPercentage(agent.reassignmentRate)} />
            </section>
          </div>
        </SheetContent>
      ) : null}
    </Sheet>
  )
}
