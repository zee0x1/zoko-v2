import { useQuery } from "@tanstack/react-query";
import {
  fetchAgentMetrics,
  fetchFirstResponseTime,
  fetchMessagesByCustomer,
  fetchResolutionTime,
  fetchTotalMessages,
} from "@/lib/api";

export const METRIC_REFETCH_INTERVAL = 30_000;

export function useTotalMessagesQuery() {
  return useQuery({
    queryKey: ["metrics", "total-messages"],
    queryFn: fetchTotalMessages,
    refetchInterval: METRIC_REFETCH_INTERVAL,
  });
}

export function useMessagesByCustomerQuery(page: number, pageSize: number) {
  return useQuery({
    queryKey: ["metrics", "messages-by-customer", page, pageSize],
    queryFn: () => fetchMessagesByCustomer(page, pageSize),
    placeholderData: (previousData) => previousData,
    refetchInterval: METRIC_REFETCH_INTERVAL,
  });
}

export function useFirstResponseTimeQuery() {
  return useQuery({
    queryKey: ["metrics", "frt"],
    queryFn: fetchFirstResponseTime,
    refetchInterval: METRIC_REFETCH_INTERVAL,
  });
}

export function useResolutionTimeQuery() {
  return useQuery({
    queryKey: ["metrics", "resolution"],
    queryFn: fetchResolutionTime,
    refetchInterval: METRIC_REFETCH_INTERVAL,
  });
}

export function useAgentMetricsQuery() {
  return useQuery({
    queryKey: ["metrics", "agents"],
    queryFn: fetchAgentMetrics,
    refetchInterval: METRIC_REFETCH_INTERVAL,
  });
}
