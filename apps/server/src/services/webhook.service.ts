import { IsNull, type DataSource, type EntityManager } from "typeorm";
import type {
  ChatAssignedDto,
  ChatClosedDto,
  DeliveryUpdateDto,
  IncomingMessageDto,
  OutgoingMessageDto,
  WebhookDto,
} from "../dtos/webhook.dto.js";
import { Agent } from "../entities/agent.entity.js";
import { ChatAssignment } from "../entities/chat-assignment.entity.js";
import { Conversation } from "../entities/conversation.entity.js";
import { Customer } from "../entities/customer.entity.js";
import { Message, MessageDirection } from "../entities/message.entity.js";

type WebhookAgent = {
  id: string;
  email: string;
  name: string;
};

export class WebhookService {
  constructor(private readonly database: DataSource) {}

  process(payload: WebhookDto): Promise<void> {
    switch (payload.event) {
      case "message:user:in":
        return this.processIncomingMessage(payload);
      case "message:store:out":
        return this.processOutgoingMessage(payload);
      case "message:delivery:update":
        return this.processDeliveryUpdate(payload);
      case "zoko:chat:assigned":
        return this.processChatAssigned(payload);
      case "zoko:chat:closed":
        return this.processChatClosed(payload);
    }
  }

  private async processIncomingMessage(
    payload: IncomingMessageDto,
  ): Promise<void> {
    await this.database.transaction(async (manager) => {
      await this.upsertCustomer(
        manager,
        payload.customer.id,
        payload.customer.name,
        payload.phone,
      );
      await this.lockCustomer(manager, payload.customer.id);

      const conversations = manager.getRepository(Conversation);
      let conversation = await this.findOpenConversation(
        manager,
        payload.customer.id,
      );

      if (!conversation) {
        conversation = await conversations.save(
          conversations.create({
            customerId: payload.customer.id,
            openedAt: payload.platformTimestamp,
            closedAt: null,
            closedByAgentId: null,
          }),
        );
      }

      await this.upsertLiveMessage(
        manager,
        payload,
        conversation.id,
        null,
        MessageDirection.FromCustomer,
      );
    });
  }

  private async processOutgoingMessage(
    payload: OutgoingMessageDto,
  ): Promise<void> {
    await this.database.transaction(async (manager) => {
      await this.upsertCustomer(
        manager,
        payload.customer.id,
        payload.customer.name,
        payload.phone,
      );

      const conversation = await this.findOpenConversation(
        manager,
        payload.customer.id,
      );

      let senderAgentId: string | null = null;

      if (payload.agentEmail) {
        const agent = await manager.getRepository(Agent).findOne({
          where: { email: payload.agentEmail },
        });

        if (agent) {
          senderAgentId = agent.id;
        } else {
          console.warn(
            `No agent found for outbound Zoko message email ${payload.agentEmail}`,
          );
        }
      }

      await this.upsertLiveMessage(
        manager,
        payload,
        conversation?.id ?? null,
        senderAgentId,
        MessageDirection.FromStore,
      );
    });
  }

  private async processDeliveryUpdate(
    payload: DeliveryUpdateDto,
  ): Promise<void> {
    await this.database.transaction(async (manager) => {
      const messages = manager.getRepository(Message);
      const message = await messages.findOneBy({ id: payload.id });

      if (!message) {
        throw new Error(`Message ${payload.id} does not exist`);
      }

      await messages.update(
        { id: payload.id },
        { deliveryStatus: payload.deliveryStatus },
      );
    });
  }

  private async processChatAssigned(payload: ChatAssignedDto): Promise<void> {
    await this.database.transaction(async (manager) => {
      const customer = await manager
        .getRepository(Customer)
        .findOneBy({ id: payload.customerId });

      if (!customer) {
        console.error(
          `Unknown customer ${payload.customerId} in ${payload.event}`,
        );
        throw new Error(`Customer ${payload.customerId} does not exist`);
      }

      await this.upsertAgent(manager, payload.agent);
      await this.lockCustomer(manager, payload.customerId);

      const conversations = manager.getRepository(Conversation);
      let conversation = await this.findOpenConversation(
        manager,
        payload.customerId,
      );

      if (!conversation) {
        conversation = await conversations.save(
          conversations.create({
            customerId: payload.customerId,
            openedAt: payload.eventAt,
            closedAt: null,
            closedByAgentId: null,
          }),
        );
      }

      const latestAssignment = await manager
        .getRepository(ChatAssignment)
        .findOne({
          where: { conversationId: conversation.id },
          order: { assignedAt: "DESC", id: "DESC" },
        });

      if (latestAssignment?.agentId === payload.agent.id) {
        return;
      }

      await manager.getRepository(ChatAssignment).insert({
        conversationId: conversation.id,
        agentId: payload.agent.id,
        assignedAt: payload.eventAt,
      });
    });
  }

  private async processChatClosed(payload: ChatClosedDto): Promise<void> {
    await this.database.transaction(async (manager) => {
      const customer = await manager
        .getRepository(Customer)
        .findOneBy({ id: payload.customerId });

      if (!customer) {
        console.error(
          `Unknown customer ${payload.customerId} in ${payload.event}`,
        );
        throw new Error(`Customer ${payload.customerId} does not exist`);
      }

      await this.upsertAgent(manager, payload.agent);
      await this.upsertAgent(manager, payload.closedBy.agent);
      await this.lockCustomer(manager, payload.customerId);

      const conversations = manager.getRepository(Conversation);
      const openConversation = await this.findOpenConversation(
        manager,
        payload.customerId,
      );

      if (openConversation) {
        openConversation.closedAt = payload.eventAt;
        openConversation.closedByAgentId = payload.closedBy.agent.id;
        await conversations.save(openConversation);
        return;
      }

      const latestConversation = await conversations.findOne({
        where: { customerId: payload.customerId },
        order: { openedAt: "DESC", id: "DESC" },
      });

      if (
        latestConversation?.closedAt?.getTime() === payload.eventAt.getTime() &&
        latestConversation.closedByAgentId === payload.closedBy.agent.id
      ) {
        return;
      }

      console.warn(
        `Close event for untracked conversation: customer ${payload.customerId}`,
      );
    });
  }

  private async upsertCustomer(
    manager: EntityManager,
    id: string,
    name: string,
    phoneValue: string,
  ): Promise<void> {
    const phone = phoneValue.trim().startsWith("+")
      ? phoneValue.trim()
      : `+${phoneValue.trim()}`;

    await manager.getRepository(Customer).upsert(
      {
        id,
        name,
        phone,
      },
      ["id"],
    );
  }

  private async upsertAgent(
    manager: EntityManager,
    agent: WebhookAgent,
  ): Promise<void> {
    await manager.getRepository(Agent).upsert(
      {
        id: agent.id,
        name: agent.name.trim(),
        email: agent.email,
      },
      ["id"],
    );
  }

  private async lockCustomer(
    manager: EntityManager,
    customerId: string,
  ): Promise<void> {
    await manager
      .getRepository(Customer)
      .createQueryBuilder("customers")
      .setLock("pessimistic_write")
      .where("customers.id = :customerId", { customerId })
      .getOneOrFail();
  }

  private findOpenConversation(
    manager: EntityManager,
    customerId: string,
  ): Promise<Conversation | null> {
    return manager.getRepository(Conversation).findOne({
      where: {
        customerId,
        closedAt: IsNull(),
      },
      order: { openedAt: "DESC", id: "DESC" },
    });
  }

  private async upsertLiveMessage(
    manager: EntityManager,
    payload: IncomingMessageDto | OutgoingMessageDto,
    conversationId: number | null,
    senderAgentId: string | null,
    direction: MessageDirection,
  ): Promise<void> {
    await manager.getRepository(Message).upsert(
      {
        id: payload.id,
        customerId: payload.customer.id,
        conversationId,
        senderAgentId,
        direction,
        platform: payload.platform.trim().toLowerCase(),
        type: payload.type,
        text: payload.text?.trim() || null,
        fileUrl: payload.fileUrl?.trim() || null,
        fileCaption: payload.fileCaption?.trim() || null,
        deliveryStatus: payload.deliveryStatus,
        platformTimestamp: payload.platformTimestamp,
      },
      ["id"],
    );
  }
}
