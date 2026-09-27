import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Bot,
  Clock3,
  MessagesSquare,
  RefreshCw,
  TimerReset,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { MetricCard } from "@/components/dashboard/metric-card";
import { MessagesByCustomer } from "@/components/dashboard/messages-by-customer";
import { AgentPerformanceTable } from "@/components/dashboard/agent-performance-table";
import {
  useAgentMetricsQuery,
  useFirstResponseTimeQuery,
  useMessagesByCustomerQuery,
  useResolutionTimeQuery,
  useTotalMessagesQuery,
} from "@/queries/metrics";
import { formatDateTime, formatDuration, formatNumber } from "@/lib/format";

const CUSTOMERS_PER_PAGE = 10;

function durationDetail(medianMs: number | null, sampleSize: number) {
  return `Median ${formatDuration(medianMs)} · n=${formatNumber(sampleSize)}`;
}

export function OverviewPage() {
  const [customerPage, setCustomerPage] = useState(1);
  const queryClient = useQueryClient();
  const totalMessagesQuery = useTotalMessagesQuery();
  const messagesByCustomerQuery = useMessagesByCustomerQuery(
    customerPage,
    CUSTOMERS_PER_PAGE,
  );
  const firstResponseTimeQuery = useFirstResponseTimeQuery();
  const resolutionTimeQuery = useResolutionTimeQuery();
  const agentMetricsQuery = useAgentMetricsQuery();

  const lastUpdatedAt = useMemo(
    () =>
      Math.max(
        totalMessagesQuery.dataUpdatedAt,
        messagesByCustomerQuery.dataUpdatedAt,
        firstResponseTimeQuery.dataUpdatedAt,
        resolutionTimeQuery.dataUpdatedAt,
        agentMetricsQuery.dataUpdatedAt,
      ),
    [
      agentMetricsQuery.dataUpdatedAt,
      firstResponseTimeQuery.dataUpdatedAt,
      messagesByCustomerQuery.dataUpdatedAt,
      resolutionTimeQuery.dataUpdatedAt,
      totalMessagesQuery.dataUpdatedAt,
    ],
  );
  const isFetchingMetrics =
    totalMessagesQuery.isFetching ||
    messagesByCustomerQuery.isFetching ||
    firstResponseTimeQuery.isFetching ||
    resolutionTimeQuery.isFetching ||
    agentMetricsQuery.isFetching;

  const refreshMetrics = () => {
    void queryClient.invalidateQueries({ queryKey: ["metrics"] });
  };

  const humanFRT = firstResponseTimeQuery.data?.human;
  const botFRT = firstResponseTimeQuery.data?.bot;
  const resolutionTime = resolutionTimeQuery.data;

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">Command center</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            Support overview
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            All synchronized conversations and messages
          </p>
        </div>
        <div className="flex items-center gap-3 self-start sm:self-auto">
          <p className="text-xs text-muted-foreground">
            {lastUpdatedAt > 0
              ? `Updated ${formatDateTime(new Date(lastUpdatedAt).toISOString())}`
              : "Waiting for metrics"}
          </p>
          <Button
            variant="outline"
            size="icon"
            aria-label="Refresh metrics"
            title="Refresh metrics"
            onClick={refreshMetrics}
          >
            <RefreshCw
              className={isFetchingMetrics ? "animate-spin" : undefined}
              aria-hidden="true"
            />
          </Button>
        </div>
      </header>

      <section
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
        aria-label="Key metrics"
      >
        <MetricCard
          title="Total messages"
          icon={MessagesSquare}
          value={formatNumber(totalMessagesQuery.data?.totalMessages ?? 0)}
          isLoading={totalMessagesQuery.isLoading}
          error={totalMessagesQuery.error}
          onRetry={() => void totalMessagesQuery.refetch()}
        />
        <MetricCard
          title="Human first response"
          icon={Clock3}
          value={formatDuration(humanFRT?.averageMs ?? null)}
          detail={
            humanFRT
              ? durationDetail(humanFRT.medianMs, humanFRT.sampleSize)
              : undefined
          }
          isLoading={firstResponseTimeQuery.isLoading}
          error={firstResponseTimeQuery.error}
          onRetry={() => void firstResponseTimeQuery.refetch()}
        />
        <MetricCard
          title="Bot first response"
          icon={Bot}
          value={formatDuration(botFRT?.averageMs ?? null)}
          detail={
            botFRT
              ? durationDetail(botFRT.medianMs, botFRT.sampleSize)
              : undefined
          }
          isLoading={firstResponseTimeQuery.isLoading}
          error={firstResponseTimeQuery.error}
          onRetry={() => void firstResponseTimeQuery.refetch()}
        />
        <MetricCard
          title="Resolution time"
          icon={TimerReset}
          value={formatDuration(resolutionTime?.averageMs ?? null)}
          detail={
            resolutionTime
              ? durationDetail(
                  resolutionTime.medianMs,
                  resolutionTime.sampleSize,
                )
              : undefined
          }
          isLoading={resolutionTimeQuery.isLoading}
          error={resolutionTimeQuery.error}
          onRetry={() => void resolutionTimeQuery.refetch()}
        />
      </section>

      <MessagesByCustomer
        customers={messagesByCustomerQuery.data?.customers}
        pagination={messagesByCustomerQuery.data?.pagination}
        maxMessageCount={messagesByCustomerQuery.data?.maxMessageCount ?? 0}
        isLoading={messagesByCustomerQuery.isLoading}
        isFetching={messagesByCustomerQuery.isFetching}
        error={messagesByCustomerQuery.error}
        onRetry={() => void messagesByCustomerQuery.refetch()}
        onPreviousPage={() => setCustomerPage((page) => page - 1)}
        onNextPage={() => setCustomerPage((page) => page + 1)}
      />

      <AgentPerformanceTable
        agents={agentMetricsQuery.data?.agents}
        isLoading={agentMetricsQuery.isLoading}
        error={agentMetricsQuery.error}
        onRetry={() => void agentMetricsQuery.refetch()}
      />
    </div>
  );
}
