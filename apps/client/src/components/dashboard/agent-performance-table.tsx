import { useState } from "react";
import { ArrowUpRight, Mail } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { AgentDetailsSheet } from "@/components/dashboard/agent-details-sheet";
import {
  formatDuration,
  formatNumber,
  formatPercentage,
  getAgentInitials,
} from "@/lib/format";
import type { AgentMetric, DurationStatistics } from "@/types/api";

interface AgentPerformanceTableProps {
  agents: AgentMetric[] | undefined;
  isLoading: boolean;
  error: Error | null;
  onRetry: () => void;
}

function DurationSummary({ statistics }: { statistics: DurationStatistics }) {
  return (
    <div className="space-y-0.5 text-xs tabular-nums">
      <p>Avg {formatDuration(statistics.averageMs)}</p>
      <p className="text-muted-foreground">
        Med {formatDuration(statistics.medianMs)}
      </p>
      <p className="text-muted-foreground">
        n={formatNumber(statistics.sampleSize)}
      </p>
    </div>
  );
}

export function AgentPerformanceTable({
  agents,
  isLoading,
  error,
  onRetry,
}: AgentPerformanceTableProps) {
  const [selectedAgent, setSelectedAgent] = useState<AgentMetric | null>(null);

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Agent performance</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-3 px-6 pb-6">
              {Array.from({ length: 4 }, (_, index) => (
                <div className="flex items-center gap-4" key={index}>
                  <Skeleton className="size-9 rounded-full" />
                  <Skeleton className="h-5 flex-1" />
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-5 w-20" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex min-h-32 flex-col items-start justify-center gap-3 px-6 pb-6">
              <p className="text-sm text-muted-foreground">{error.message}</p>
              <Button variant="outline" size="sm" onClick={onRetry}>
                Retry
              </Button>
            </div>
          ) : !agents?.length ? (
            <div className="mx-6 mb-6 grid min-h-24 place-items-center rounded-lg border border-dashed text-sm text-muted-foreground">
              No agents found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-200">
                <TableHeader>
                  <TableRow>
                    <TableHead className="px-4 py-3">Agent</TableHead>
                    <TableHead className="px-4 py-3 text-right">
                      Conversations handled
                    </TableHead>
                    <TableHead className="px-4 py-3 text-right">
                      Human FRT
                    </TableHead>
                    <TableHead className="px-4 py-3 text-right">
                      Resolution time
                    </TableHead>
                    <TableHead className="px-4 py-3 text-right">
                      Reassigned
                    </TableHead>
                    <TableHead className="px-4 py-3 text-right">
                      Action
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agents.map((agent) => (
                    <TableRow key={agent.agentId}>
                      <TableCell className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback>
                              {getAgentInitials(agent.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-medium">{agent.name}</p>
                            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                              <Mail className="size-3" aria-hidden="true" />
                              {agent.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right font-medium tabular-nums">
                        {formatNumber(agent.conversationsHandled)}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right">
                        <DurationSummary statistics={agent.humanFRT} />
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right">
                        <DurationSummary statistics={agent.resolutionTime} />
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right">
                        <div className="space-y-0.5 text-xs tabular-nums">
                          <p>{formatNumber(agent.reassignedChats)} chats</p>
                          <p className="text-muted-foreground">
                            {formatPercentage(agent.reassignmentRate)}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1.5 px-3"
                          onClick={() => setSelectedAgent(agent)}
                        >
                          View details
                          <ArrowUpRight aria-hidden="true" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      <AgentDetailsSheet
        agent={selectedAgent}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedAgent(null);
          }
        }}
      />
    </>
  );
}
