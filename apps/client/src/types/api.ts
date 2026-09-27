export interface DurationStatistics {
  averageMs: number | null
  medianMs: number | null
  sampleSize: number
}

export interface TotalMessagesResponse {
  totalMessages: number
}

export interface MessagesByCustomerResponse {
  customers: Array<{
    customerId: string
    customerName: string
    phone: string
    messageCount: number
  }>
  pagination: {
    page: number
    pageSize: number
    totalItems: number
    totalPages: number
  }
  maxMessageCount: number
}

export interface FirstResponseTimeResponse {
  human: DurationStatistics
  bot: DurationStatistics
}

export interface AgentMetric {
  agentId: string
  name: string
  email: string
  conversationsHandled: number
  humanFRT: DurationStatistics
  resolutionTime: DurationStatistics
  reassignedChats: number
  reassignmentRate: number
}

export interface AgentMetricsResponse {
  agents: AgentMetric[]
}

export interface Agent {
  id: string
  name: string
  email: string
}

export interface Customer {
  id: string
  name: string
  phone: string
}

export interface Conversation {
  id: number
  status: "open" | "closed"
  openedAt: string
  closedAt: string | null
  customer: Customer
  assignedAgent: Agent | null
}

export interface ConversationsResponse {
  conversations: Conversation[]
}

export interface ConversationMessage {
  id: string
  direction: "FROM_CUSTOMER" | "FROM_STORE"
  type: string
  text: string | null
  fileUrl: string | null
  fileCaption: string | null
  deliveryStatus: string
  platformTimestamp: string
  senderAgent: Agent | null
}

export interface ConversationDetails extends Conversation {
  messages: ConversationMessage[]
}

export interface ConversationDetailsResponse {
  conversation: ConversationDetails
}

export interface SendMessageResponse {
  status: string
  statusText: string
  messageId: string
}
