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

export type AgentGroupParams = {
  agentId: string;
  name: string;
  email: string;
  messagesSent: number;
  conversationsHandled: number;
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

  captureAgentMetrics(params: AgentGroupParams): void {
    this.captureAgentGroupEvent("agent_metrics_updated", params);
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

  private captureAgentGroupEvent(
    event: string,
    params: AgentGroupParams,
  ): void {
    try {
      const distinctId = `agent:${params.agentId}`;

      this.client.groupIdentify({
        groupType: "agent",
        groupKey: params.agentId,
        distinctId,
        properties: {
          name: params.name,
          email: params.email,
          messagesSent: params.messagesSent,
          conversationsHandled: params.conversationsHandled,
        },
      });

      this.client.capture({
        distinctId,
        event,
        groups: {
          agent: params.agentId,
        },
        properties: {
          agentId: params.agentId,
        },
      });

      console.info(
        `PostHog agent group updated for agent ${params.agentId}`,
      );
    } catch (error) {
      console.error(
        `Failed to update PostHog agent group for agent ${params.agentId}`,
        error,
      );
    }
  }
}
