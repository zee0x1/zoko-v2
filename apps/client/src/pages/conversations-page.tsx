import { useNavigate } from "@tanstack/react-router";
import { ConversationDetail } from "@/components/conversations/conversation-detail";
import { ConversationList } from "@/components/conversations/conversation-list";
import { useConversationsQuery } from "@/queries/conversations";
import { cn } from "@/lib/utils";

interface ConversationWorkspaceProps {
  selectedConversationId: number | null;
}

function ConversationWorkspace({
  selectedConversationId,
}: ConversationWorkspaceProps) {
  const navigate = useNavigate();
  const conversationsQuery = useConversationsQuery();

  const navigateToConversation = (conversationId: number) => {
    void navigate({
      to: "/conversations/$conversationId",
      params: { conversationId: String(conversationId) },
    });
  };

  return (
    <div className="mx-auto flex h-[calc(100svh-3rem)] min-h-0 w-full max-w-screen-2xl flex-none flex-col gap-4 overflow-hidden px-3 py-3 sm:px-5 sm:py-4 md:h-svh lg:gap-5 lg:px-6 lg:py-5">
      <header
        className={cn(
          selectedConversationId !== null && "hidden lg:block",
          "shrink-0",
        )}
      >
        <p className="text-sm font-medium text-primary">Operations</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
          Conversations
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Review customer conversations and send messages from eligible open
          chats.
        </p>
      </header>

      <div className="grid min-h-0 flex-1 overflow-hidden rounded-xl border bg-card shadow-sm lg:grid-cols-[minmax(18rem,1fr)_minmax(0,3fr)]">
        <div
          className={cn(
            selectedConversationId !== null && "hidden lg:block",
            "min-h-0",
          )}
        >
          <ConversationList
            conversations={conversationsQuery.data?.conversations}
            selectedConversationId={selectedConversationId}
            isLoading={conversationsQuery.isLoading}
            error={conversationsQuery.error}
            onRetry={() => void conversationsQuery.refetch()}
            onSelect={navigateToConversation}
          />
        </div>
        <div
          className={cn(
            selectedConversationId === null && "hidden lg:flex",
            "min-h-0 min-w-0",
          )}
        >
          {selectedConversationId === null ? (
            <div className="grid flex-1 place-items-center p-6 text-center text-sm text-muted-foreground">
              Select a conversation to view its messages.
            </div>
          ) : (
            <ConversationDetail
              conversationId={selectedConversationId}
              onBack={() => void navigate({ to: "/conversations" })}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export function ConversationsPage() {
  return <ConversationWorkspace selectedConversationId={null} />;
}

export function ConversationDetailPage({
  conversationId,
}: {
  conversationId: number | null;
}) {
  return <ConversationWorkspace selectedConversationId={conversationId} />;
}
