import { useQuery } from "@tanstack/react-query"
import {
  fetchConversation,
  fetchConversations,
} from "@/lib/api"

export function useConversationsQuery() {
  return useQuery({
    queryKey: ["conversations"],
    queryFn: fetchConversations,
  })
}

export function useConversationQuery(conversationId: number | null) {
  return useQuery({
    queryKey: ["conversations", conversationId],
    queryFn: () => fetchConversation(conversationId as number),
    enabled: conversationId !== null,
  })
}
