import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNumber } from "@/lib/format";
import type { MessagesByCustomerResponse } from "@/types/api";

type CustomerMessageCount = MessagesByCustomerResponse["customers"][number];

interface MessagesByCustomerProps {
  customers: CustomerMessageCount[] | undefined;
  pagination: MessagesByCustomerResponse["pagination"] | undefined;
  maxMessageCount: number;
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
  onRetry: () => void;
  onPreviousPage: () => void;
  onNextPage: () => void;
}

function CustomerTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload?: CustomerMessageCount }>;
}) {
  if (!active || !payload?.length || !payload[0]?.payload) {
    return null;
  }

  const customer = payload[0].payload;

  return (
    <div className="grid min-w-44 gap-1 rounded-lg border bg-background px-3 py-2 text-xs shadow-xl">
      <p className="font-medium">{customer.customerName}</p>
      <p className="text-muted-foreground">{customer.phone}</p>
      <p className="font-mono tabular-nums text-foreground">
        {formatNumber(customer.messageCount)} messages
      </p>
    </div>
  );
}

export function MessagesByCustomer({
  customers,
  pagination,
  maxMessageCount,
  isLoading,
  isFetching,
  error,
  onRetry,
  onPreviousPage,
  onNextPage,
}: MessagesByCustomerProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Messages per customer</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-110 w-full" />
        ) : error ? (
          <div className="flex min-h-32 flex-col items-start justify-center gap-3">
            <p className="text-sm text-muted-foreground">{error.message}</p>
            <Button variant="outline" size="sm" onClick={onRetry}>
              Retry
            </Button>
          </div>
        ) : !customers?.length ? (
          <div className="grid min-h-32 place-items-center rounded-lg border border-dashed text-sm text-muted-foreground">
            No customer messages yet.
          </div>
        ) : (
          <div className="space-y-3">
            <div className="w-full rounded-lg border bg-muted/20">
              <div className="w-full px-3 py-4">
                <ChartContainer
                  config={{
                    messageCount: {
                      label: "Messages",
                      color: "var(--primary)",
                    },
                  }}
                  className="h-110 w-full aspect-auto"
                >
                  <BarChart
                    accessibilityLayer
                    data={customers}
                    layout="vertical"
                    margin={{ top: 4, right: 18, bottom: 4, left: 4 }}
                  >
                    <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                    <XAxis
                      type="number"
                      domain={[0, maxMessageCount]}
                      allowDecimals={false}
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                    />
                    <YAxis
                      dataKey="customerName"
                      type="category"
                      interval={0}
                      width={150}
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                    />
                    <ChartTooltip
                      cursor={{ fill: "var(--muted)" }}
                      content={<CustomerTooltip />}
                    />
                    <Bar
                      dataKey="messageCount"
                      fill="var(--color-messageCount)"
                      radius={[0, 4, 4, 0]}
                      barSize={24}
                    />
                  </BarChart>
                </ChartContainer>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                aria-label="Previous customer page"
                title="Previous customer page"
                disabled={isFetching || !pagination || pagination.page <= 1}
                onClick={onPreviousPage}
              >
                <ChevronLeft aria-hidden="true" />
              </Button>
              <span
                className="min-w-16 self-center text-center text-xs text-muted-foreground tabular-nums"
                aria-live="polite"
              >
                {pagination
                  ? `${pagination.page} of ${pagination.totalPages}`
                  : null}
              </span>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                aria-label="Next customer page"
                title="Next customer page"
                disabled={
                  isFetching ||
                  !pagination ||
                  pagination.page >= pagination.totalPages
                }
                onClick={onNextPage}
              >
                <ChevronRight aria-hidden="true" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
