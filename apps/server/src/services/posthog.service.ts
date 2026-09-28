import type { PostHog } from "posthog-node";
import type { MessageDirection } from "../entities/message.entity.js";

type ConversationEventParams = {
  conversationId: number;
  customerId: string;
};

export type MessageEventParams = {
  messageId: string;
  customerId: string;
  conversationId: number | null;
  senderAgentId: string | null;
  direction: MessageDirection;
  text: string;
  platformTimestamp: Date;
};

interface ConversationOpenedParams extends ConversationEventParams {
  sourceEvent: "message:user:in" | "zoko:chat:assigned";
}

interface ConversationClosedParams extends ConversationEventParams {
  closedByAgentId: string;
}

interface CsatReceivedParams extends ConversationEventParams {
  rating: number;
}

export class PostHogService {
  constructor(private readonly client: PostHog) {}

  captureConversationOpened(params: ConversationOpenedParams): void {
    this.captureConversationEvent("conversation_opened", params, {
      sourceEvent: params.sourceEvent,
    });
  }

  captureConversationClosed(params: ConversationClosedParams): void {
    this.captureConversationEvent("conversation_closed", params, {
      closedByAgentId: params.closedByAgentId,
    });
  }

  captureCsatAsked(params: ConversationEventParams): void {
    this.captureConversationEvent("csat_asked", params, {
      simulated: true,
    });
  }

  captureCsatReceived(params: CsatReceivedParams): void {
    this.captureConversationEvent("csat_received", params, {
      rating: params.rating,
      simulated: true,
    });
  }

  captureMessages(params: MessageEventParams): void {
    this.captureMessageEvent("message_event", params);
  }

  private captureConversationEvent(
    event: string,
    params: ConversationEventParams,
    properties: Record<string, boolean | number | string>,
  ): void {
    try {
      this.client.capture({
        distinctId: `conversation:${params.conversationId}`,
        event,
        properties: {
          conversationId: params.conversationId,
          customerId: params.customerId,
          ...properties,
        },
      });
      console.info(
        `PostHog event emitted: ${event} for conversation ${params.conversationId}`,
      );
    } catch (error) {
      console.error(
        `Failed to emit PostHog event ${event} for conversation ${params.conversationId}`,
        error,
      );
    }
  }

  private captureMessageEvent(
    event: string,
    params: MessageEventParams,
  ): void {
    try {
      this.client.capture({
        distinctId: `message:${params.messageId}`,
        event,
        timestamp: params.platformTimestamp,
        properties: {
          ...params,
        },
      });
      console.info(
        `PostHog event emitted: ${event} for message ${params.messageId}`,
      );
    } catch (error) {
      console.error(
        `Failed to emit PostHog event ${event} for message ${params.messageId}`,
        error,
      );
    }
  }
}
