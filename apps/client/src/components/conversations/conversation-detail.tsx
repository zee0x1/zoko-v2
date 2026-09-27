import { ArrowLeft, ExternalLink, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useConversationQuery } from "@/queries/conversations";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { MessageComposer } from "@/components/conversations/message-composer";

interface ConversationDetailProps {
  conversationId: number | null;
  onBack: () => void;
}

function safeExternalUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

export function ConversationDetail({
  conversationId,
  onBack,
}: ConversationDetailProps) {
  const query = useConversationQuery(conversationId);

  if (conversationId === null) {
    return (
      <div className="grid h-full place-items-center p-6 text-center text-sm text-muted-foreground">
        Select a conversation to view its messages.
      </div>
    );
  }

  if (query.isLoading) {
    return (
      <div className="h-full space-y-4 p-5">
        <div className="space-y-2 border-b pb-5">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-4 w-80" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-20 w-3/4" />
          <Skeleton className="ml-auto h-24 w-3/4" />
          <Skeleton className="h-16 w-2/3" />
        </div>
      </div>
    );
  }

  if (query.error || !query.data) {
    return (
      <div className="flex h-full flex-col items-start justify-center gap-3 p-6">
        <p className="text-sm text-muted-foreground">
          {query.error?.message ?? "Conversation could not be loaded"}
        </p>
        <Button variant="outline" size="sm" onClick={() => query.refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  const conversation = query.data.conversation;

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col">
      <header className="shrink-0 border-b bg-card p-3 sm:p-4 lg:p-5">
        <div className="flex min-w-0 items-start gap-2 sm:gap-3">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onBack}
            className="-ml-1 lg:hidden"
            aria-label="Back to conversations"
            title="Back to conversations"
          >
            <ArrowLeft aria-hidden="true" />
          </Button>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-lg font-semibold tracking-tight">
                {conversation.customer.name}
              </h2>
              <Badge
                variant="outline"
                className={cn(
                  "capitalize",
                  conversation.status === "open"
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "text-muted-foreground",
                )}
              >
                {conversation.status}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {conversation.customer.phone}
            </p>
          </div>
          <div className="hidden shrink-0 gap-1 text-right text-xs text-muted-foreground sm:grid">
            <p>Opened {formatDateTime(conversation.openedAt)}</p>
            {conversation.closedAt ? (
              <p>Closed {formatDateTime(conversation.closedAt)}</p>
            ) : null}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground sm:ml-0">
          <span className="flex items-center gap-2">
            <UserRound className="size-3.5" aria-hidden="true" />
            Assigned agent: {conversation.assignedAgent?.name ?? "Unassigned"}
          </span>
          <span className="sm:hidden">
            Opened {formatDateTime(conversation.openedAt)}
          </span>
        </div>
      </header>

      <ScrollArea
        className="min-h-0 flex-1 bg-muted/20"
        aria-label="Conversation messages"
      >
        <div className="space-y-3 p-3 sm:space-y-4 sm:p-5 lg:p-6">
          {!conversation.messages.length ? (
            <div className="grid min-h-40 place-items-center rounded-lg border border-dashed bg-card px-4 text-center text-sm text-muted-foreground">
              This conversation has no messages.
            </div>
          ) : (
            conversation.messages.map((message) => {
              const isOutbound = message.direction === "FROM_STORE";
              const attachmentUrl = message.fileUrl
                ? safeExternalUrl(message.fileUrl)
                : null;
              const attachmentCaption = attachmentUrl
                ? message.fileCaption ||
                  (message.text && message.text !== message.fileUrl
                    ? message.text
                    : null)
                : null;

              return (
                <div
                  className={cn(
                    "flex",
                    isOutbound ? "justify-end" : "justify-start",
                  )}
                  key={message.id}
                >
                  <article
                    className={cn(
                      "w-fit max-w-[min(85%,65ch)] rounded-2xl border px-3.5 py-2.5 text-sm shadow-sm sm:px-4 sm:py-3",
                      isOutbound
                        ? "rounded-br-md border-primary/20 bg-primary/10"
                        : "rounded-bl-md bg-card",
                    )}
                  >
                    {isOutbound ? (
                      <p className="mb-2 text-xs font-medium text-primary">
                        {message.senderAgent?.name ?? "Store"}
                      </p>
                    ) : null}
                    {attachmentUrl ? (
                      <>
                        {attachmentCaption ? (
                          <p className="whitespace-pre-wrap wrap-break-word">
                            {attachmentCaption}
                          </p>
                        ) : null}
                        <a
                          href={attachmentUrl}
                          target="_blank"
                          rel="noreferrer noopener"
                          className={cn(
                            "mt-2 flex items-start gap-2 break-all text-xs font-medium underline underline-offset-4",
                            isOutbound ? "text-primary" : "text-foreground",
                          )}
                        >
                          <ExternalLink
                            className="mt-0.5 size-3.5 shrink-0"
                            aria-hidden="true"
                          />
                          {attachmentUrl}
                        </a>
                      </>
                    ) : message.text ? (
                      <p className="whitespace-pre-wrap wrap-break-word">
                        {message.text}
                      </p>
                    ) : null}
                    {!message.text && !attachmentUrl ? (
                      <p className="text-muted-foreground">{message.type}</p>
                    ) : null}
                    <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                      <span>{formatDateTime(message.platformTimestamp)}</span>
                      {isOutbound ? (
                        <span>· {message.deliveryStatus}</span>
                      ) : null}
                    </div>
                  </article>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>

      {conversation.status === "open" ? (
        <MessageComposer conversationId={conversation.id} />
      ) : (
        <div className="border-t bg-card p-4 text-center text-sm text-muted-foreground">
          This conversation is closed.
        </div>
      )}
    </div>
  );
}
