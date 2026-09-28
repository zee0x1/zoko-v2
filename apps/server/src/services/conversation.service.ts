import type { DataSource } from "typeorm";
import { Agent } from "../entities/agent.entity.js";
import { ChatAssignment } from "../entities/chat-assignment.entity.js";
import { Conversation } from "../entities/conversation.entity.js";
import { Message } from "../entities/message.entity.js";
import { ZokoClient } from "../zoko-client.js";
import { PostHogService } from "./posthog.service.js";

export class ConversationNotFoundError extends Error {
  constructor(conversationId: number) {
    super(`Conversation ${conversationId} does not exist`);
    this.name = "ConversationNotFoundError";
  }
}

export class ConversationClosedError extends Error {
  constructor() {
    super("Conversation is closed");
    this.name = "ConversationClosedError";
  }
}

export class RecipientNotAllowedError extends Error {
  constructor() {
    super("Recipient is not allowed");
    this.name = "RecipientNotAllowedError";
  }
}

export class RecipientConfigurationError extends Error {
  constructor() {
    super("ZOKO_ALLOWED_RECIPIENT_PHONE is required for sending messages");
    this.name = "RecipientConfigurationError";
  }
}

export class ConversationNotClosedError extends Error {
  constructor() {
    super("Conversation is still open");
    this.name = "ConversationNotClosedError";
  }
}

interface AgentResponse {
  id: string;
  name: string;
  email: string;
}

interface CustomerResponse {
  id: string;
  name: string;
  phone: string;
}

interface ConversationResponse {
  id: number;
  status: "open" | "closed";
  openedAt: Date;
  closedAt: Date | null;
  customer: CustomerResponse;
  assignedAgent: AgentResponse | null;
}

interface MessageResponse {
  id: string;
  direction: string;
  type: string;
  text: string | null;
  fileUrl: string | null;
  fileCaption: string | null;
  deliveryStatus: string;
  platformTimestamp: Date;
  senderAgent: AgentResponse | null;
}

export interface ConversationDetailsResponse extends ConversationResponse {
  messages: MessageResponse[];
}

export class ConversationService {
  constructor(
    private readonly database: DataSource,
    private readonly zokoClient: ZokoClient,
    private readonly allowedRecipientPhone: string | undefined,
    private readonly postHogService: PostHogService,
  ) {}

  async listConversations(): Promise<{
    conversations: ConversationResponse[];
  }> {
    const [conversations, assignments] = await Promise.all([
      this.database.getRepository(Conversation).find({
        relations: { customer: true },
        order: { openedAt: "DESC", id: "DESC" },
      }),
      this.database.getRepository(ChatAssignment).find({
        relations: { agent: true },
        order: {
          conversationId: "ASC",
          assignedAt: "DESC",
          id: "DESC",
        },
      }),
    ]);

    const latestAssignmentByConversation = new Map<number, ChatAssignment>();

    // Assignments are grouped by conversation and newest-first. In A -> B,
    // B is encountered first, so the map keeps B as the latest assigned agent.
    for (const assignment of assignments) {
      if (!latestAssignmentByConversation.has(assignment.conversationId)) {
        latestAssignmentByConversation.set(
          assignment.conversationId,
          assignment,
        );
      }
    }

    return {
      conversations: conversations.map((conversation) =>
        this.toConversationResponse(
          conversation,
          latestAssignmentByConversation.get(conversation.id)?.agent ?? null,
        ),
      ),
    };
  }

  async getConversation(
    conversationId: number,
  ): Promise<{ conversation: ConversationDetailsResponse }> {
    const conversation = await this.database
      .getRepository(Conversation)
      .findOne({
        where: { id: conversationId },
        relations: { customer: true },
      });

    if (!conversation) {
      throw new ConversationNotFoundError(conversationId);
    }

    const [assignments, messages] = await Promise.all([
      this.database.getRepository(ChatAssignment).find({
        where: { conversationId },
        relations: { agent: true },
        order: { assignedAt: "DESC", id: "DESC" },
      }),
      this.database.getRepository(Message).find({
        where: { conversationId },
        relations: { senderAgent: true },
        order: {
          platformTimestamp: "ASC",
          createdAt: "ASC",
          id: "ASC",
        },
      }),
    ]);

    return {
      conversation: {
        ...this.toConversationResponse(
          conversation,
          assignments[0]?.agent ?? null,
        ),
        messages: messages.map((message) => this.toMessageResponse(message)),
      },
    };
  }

  async sendTextMessage(conversationId: number, text: string) {
    const conversation = await this.database
      .getRepository(Conversation)
      .findOne({
        where: { id: conversationId },
        relations: { customer: true },
      });

    if (!conversation) {
      throw new ConversationNotFoundError(conversationId);
    }

    if (conversation.closedAt !== null) {
      throw new ConversationClosedError();
    }

    if (!this.allowedRecipientPhone) {
      throw new RecipientConfigurationError();
    }

    if (conversation.customer.phone !== `+${this.allowedRecipientPhone}`) {
      throw new RecipientNotAllowedError();
    }

    return this.zokoClient.sendTextMessage(this.allowedRecipientPhone, text);
  }

  async askForCsat(
    conversationId: number,
  ): Promise<{ status: "accepted" }> {
    const conversation = await this.getClosedConversation(conversationId);

    this.postHogService.captureCsatAsked({
      conversationId: conversation.id,
      customerId: conversation.customerId,
    });

    return { status: "accepted" };
  }

  async submitCsatResponse(
    conversationId: number,
    rating: number,
  ): Promise<{ status: "accepted" }> {
    const conversation = await this.getClosedConversation(conversationId);

    this.postHogService.captureCsatReceived({
      conversationId: conversation.id,
      customerId: conversation.customerId,
      rating,
    });

    return { status: "accepted" };
  }

  private async getClosedConversation(
    conversationId: number,
  ): Promise<Conversation> {
    const conversation = await this.database
      .getRepository(Conversation)
      .findOneBy({ id: conversationId });

    if (!conversation) {
      throw new ConversationNotFoundError(conversationId);
    }

    if (conversation.closedAt === null) {
      throw new ConversationNotClosedError();
    }

    return conversation;
  }

  private toConversationResponse(
    conversation: Conversation,
    assignedAgent: Agent | null,
  ): ConversationResponse {
    return {
      id: conversation.id,
      status: conversation.closedAt === null ? "open" : "closed",
      openedAt: conversation.openedAt,
      closedAt: conversation.closedAt,
      customer: {
        id: conversation.customer.id,
        name: conversation.customer.name,
        phone: conversation.customer.phone,
      },
      assignedAgent: this.toAgentResponse(assignedAgent),
    };
  }

  private toMessageResponse(message: Message): MessageResponse {
    return {
      id: message.id,
      direction: message.direction,
      type: message.type,
      text: message.text,
      fileUrl: message.fileUrl,
      fileCaption: message.fileCaption,
      deliveryStatus: message.deliveryStatus,
      platformTimestamp: message.platformTimestamp,
      senderAgent: this.toAgentResponse(message.senderAgent),
    };
  }

  private toAgentResponse(agent: Agent | null): AgentResponse | null {
    if (agent === null) {
      return null;
    }

    return {
      id: agent.id,
      name: agent.name,
      email: agent.email,
    };
  }
}
