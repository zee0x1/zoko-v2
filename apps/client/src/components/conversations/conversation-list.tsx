import { useMemo, useState } from "react"
import { Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { formatDateTime } from "@/lib/format"
import type { Conversation } from "@/types/api"
import { cn } from "@/lib/utils"

interface ConversationListProps {
  conversations: Conversation[] | undefined
  selectedConversationId: number | null
  isLoading: boolean
  error: Error | null
  onRetry: () => void
  onSelect: (conversationId: number) => void
}

export function ConversationList({
  conversations,
  selectedConversationId,
  isLoading,
  error,
  onRetry,
  onSelect,
}: ConversationListProps) {
  const [search, setSearch] = useState("")
  const normalizedSearch = search.trim().toLocaleLowerCase()

  const filteredConversations = useMemo(() => {
    if (!conversations) {
      return []
    }

    if (!normalizedSearch) {
      return conversations
    }

    return conversations.filter((conversation) => {
      const searchableText = [
        conversation.customer.name,
        conversation.customer.phone,
        conversation.assignedAgent?.name ?? "",
      ]
        .join(" ")
        .toLocaleLowerCase()

      return searchableText.includes(normalizedSearch)
    })
  }, [conversations, normalizedSearch])

  return (
    <section className="flex h-full min-h-0 flex-col border-b bg-card lg:border-r lg:border-b-0">
      <div className="shrink-0 space-y-3 border-b p-4">
        <div>
          <h2 className="font-semibold">Conversations</h2>
          <p className="mt-1 text-xs text-muted-foreground">Select a conversation to inspect its messages.</p>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search conversations"
            aria-label="Search conversations"
            className="pl-9"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3 overflow-hidden p-4">
          {Array.from({ length: 6 }, (_, index) => (
            <div className="space-y-2 rounded-lg border p-3" key={index}>
              <Skeleton className="h-4 w-3/5" />
              <Skeleton className="h-3 w-2/5" />
              <Skeleton className="h-3 w-4/5" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-1 flex-col items-start justify-center gap-3 p-4">
          <p className="text-sm text-muted-foreground">{error.message}</p>
          <Button variant="outline" size="sm" onClick={onRetry}>
            Retry
          </Button>
        </div>
      ) : !conversations?.length ? (
        <div className="grid flex-1 place-items-center p-4 text-center text-sm text-muted-foreground">
          No conversations found.
        </div>
      ) : !filteredConversations.length ? (
        <div className="grid flex-1 place-items-center p-4 text-center text-sm text-muted-foreground">
          No conversations match your search.
        </div>
      ) : (
        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-1 p-2">
            {filteredConversations.map((conversation) => {
              const isSelected = conversation.id === selectedConversationId

              return (
                <button
                  type="button"
                  key={conversation.id}
                  aria-current={isSelected ? "page" : undefined}
                  onClick={() => onSelect(conversation.id)}
                  className={cn(
                    "w-full rounded-lg border border-transparent px-3 py-3 text-left transition-colors hover:bg-muted/70 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                    isSelected && "border-primary/20 bg-primary/10",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="min-w-0 truncate text-sm font-medium">{conversation.customer.name}</p>
                    <Badge
                      variant="outline"
                      className={cn(
                        "shrink-0 capitalize",
                        conversation.status === "open"
                          ? "border-primary/30 bg-primary/10 text-primary"
                          : "text-muted-foreground",
                      )}
                    >
                      {conversation.status}
                    </Badge>
                  </div>
                  <p className="mt-1 truncate text-xs text-muted-foreground">{conversation.customer.phone}</p>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className="truncate">{conversation.assignedAgent?.name ?? "Unassigned"}</span>
                    <span>{formatDateTime(conversation.openedAt)}</span>
                  </div>
                </button>
              )
            })}
          </div>
        </ScrollArea>
      )}
    </section>
  )
}
