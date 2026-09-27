import type {
  AgentMetricsResponse,
  ConversationDetailsResponse,
  ConversationsResponse,
  FirstResponseTimeResponse,
  MessagesByCustomerResponse,
  SendMessageResponse,
  TotalMessagesResponse,
  DurationStatistics,
} from "@/types/api"

type ApiPayload<T> = T & { error?: string }

async function readJson<T>(response: Response): Promise<T> {
  const body = (await response.json()) as ApiPayload<T>

  if (!response.ok) {
    throw new Error(body.error ?? `Request failed (${response.status})`)
  }

  return body
}

export async function fetchTotalMessages(): Promise<TotalMessagesResponse> {
  const response = await fetch("/api/metrics/messages/total")
  return readJson<TotalMessagesResponse>(response)
}

export async function fetchMessagesByCustomer(
  page: number,
  pageSize: number,
): Promise<MessagesByCustomerResponse> {
  const searchParams = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  })
  const response = await fetch(
    `/api/metrics/messages/by-customer?${searchParams.toString()}`,
  )
  return readJson<MessagesByCustomerResponse>(response)
}

export async function fetchFirstResponseTime(): Promise<FirstResponseTimeResponse> {
  const response = await fetch("/api/metrics/frt")
  return readJson<FirstResponseTimeResponse>(response)
}

export async function fetchResolutionTime(): Promise<DurationStatistics> {
  const response = await fetch("/api/metrics/resolution")
  return readJson<DurationStatistics>(response)
}

export async function fetchAgentMetrics(): Promise<AgentMetricsResponse> {
  const response = await fetch("/api/metrics/agents")
  return readJson<AgentMetricsResponse>(response)
}

export async function fetchConversations(): Promise<ConversationsResponse> {
  const response = await fetch("/api/conversations")
  return readJson<ConversationsResponse>(response)
}

export async function fetchConversation(
  conversationId: number,
): Promise<ConversationDetailsResponse> {
  const response = await fetch(`/api/conversations/${conversationId}`)
  return readJson<ConversationDetailsResponse>(response)
}

export async function sendConversationMessage(
  conversationId: number,
  text: string,
): Promise<SendMessageResponse> {
  const response = await fetch(
    `/api/conversations/${conversationId}/messages`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    },
  )

  return readJson<SendMessageResponse>(response)
}
