import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { sendConversationMessage } from "@/lib/api";

interface MessageComposerProps {
  conversationId: number;
}

export function MessageComposer({ conversationId }: MessageComposerProps) {
  const [text, setText] = useState("");
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (messageText: string) =>
      sendConversationMessage(conversationId, messageText),
    onSuccess: async () => {
      setText("");
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["conversations", conversationId],
        }),
        queryClient.invalidateQueries({ queryKey: ["conversations"] }),
      ]);
      toast.success("Message sent");
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Message sending failed",
      );
    },
  });

  const trimmedText = text.trim();

  return (
    <form
      className="shrink-0 border-t bg-card p-3 sm:p-4 lg:p-5"
      onSubmit={(event) => {
        event.preventDefault();
        if (!trimmedText || mutation.isPending) {
          return;
        }

        mutation.mutate(trimmedText);
      }}
    >
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 sm:gap-3">
        <Textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Write a message..."
          rows={2}
          disabled={mutation.isPending}
          aria-label="Message text"
          className="max-h-40 min-h-16 resize-none"
        />
        <Button
          type="submit"
          size="icon"
          disabled={!trimmedText || mutation.isPending}
          aria-label={mutation.isPending ? "Sending message" : "Send message"}
          className="sm:w-auto sm:px-3"
        >
          <Send aria-hidden="true" />
          <span className="hidden sm:inline">Send</span>
        </Button>
      </div>
    </form>
  );
}
