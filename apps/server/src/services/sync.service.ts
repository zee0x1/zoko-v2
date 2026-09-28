import type { DataSource } from "typeorm";
import { Agent } from "../entities/agent.entity.js";
import { Message, MessageDirection } from "../entities/message.entity.js";
import { Customer } from "../entities/customer.entity.js";
import { ZokoClient } from "../zoko-client.js";
import { SyncCheckpoint } from "../entities/sync-checkpoint.entity.js";
import { PostHogService, type MessageEventParams } from "./posthog.service.js";
import { AgentGroupService } from "./agent-group.service.js";

export class SyncService {
  constructor(
    private readonly database: DataSource,
    private readonly zokoClient: ZokoClient,
    private readonly postHogService: PostHogService,
    private readonly agentGroupService: AgentGroupService,
  ) {}

  async syncAgents(): Promise<{ synced: number }> {
    const agents = await this.zokoClient.listAgents();

    await this.database.transaction(async (manager) => {
      for (const agent of agents) {
        await manager.getRepository(Agent).upsert(
          {
            id: agent.id,
            name: `${agent.firstName} ${agent.lastName}`.trim(),
            email: agent.email,
          },
          ["id"],
        );
      }
    });

    return { synced: agents.length };
  }

  async syncCustomers(): Promise<{
    synced: number;
    page: number;
    nextPage: number;
    totalPages: number;
  }> {
    const checkpointKey = "zoko_customers";
    const checkpointRepository = this.database.getRepository(SyncCheckpoint);

    const checkpoint = await checkpointRepository.findOneBy({
      key: checkpointKey,
    });

    if (!checkpoint) {
      console.error("Checkpoint not found. Stopping sync");
      return { synced: 0, page: 0, nextPage: 0, totalPages: 0 };
    }

    if (checkpoint.nextPage === -1) {
      console.info("Sync completed all the pages");
      return {
        synced: 0,
        page: -1,
        nextPage: -1,
        totalPages: -1,
      };
    }

    const response = await this.zokoClient.listCustomers(
      Math.abs(checkpoint.nextPage),
    );

    const nextPage =
      response.currentPage === response.totalPages
        ? -1
        : response.currentPage + 1;

    await this.database.transaction(async (manager) => {
      const customerRepository = this.database.getRepository(Customer);

      for (const customer of response.customers) {
        const channelId = customer.channelId.trim();
        const phone = channelId.startsWith("+") ? channelId : `+${channelId}`;

        await customerRepository.upsert(
          {
            id: customer.id,
            phone: phone,
            name: customer.name,
          },
          ["id"],
        );
      }

      await manager.getRepository(SyncCheckpoint).update(
        {
          key: checkpointKey,
        },
        {
          nextPage: nextPage,
        },
      );
    });

    return {
      synced: response.customers.length,
      page: response.currentPage,
      nextPage,
      totalPages: response.totalPages,
    };
  }

  async syncCustomerMessages(): Promise<{
    synced: number;
    failedCustomers: string[];
  }> {
    const customers = await this.database.getRepository(Customer).find();
    let messagesSynced = 0;

    for (const customer of customers) {
      if (customer.messageHistorySyncedAt) {
        continue;
      }

      const messages = await this.zokoClient.listCustomerMessages(customer.id);

      const transactionResult = await this.database.transaction(
        async (manager) => {
          let synced = 0;
          const messageEvents: MessageEventParams[] = [];

          for (const message of messages) {
            if (
              message.direction !== MessageDirection.FromCustomer &&
              message.direction !== MessageDirection.FromStore
            ) {
              continue;
            }

            const record = {
              id: message.key.msgId,
              customerId: message.key.customerId,
              conversationId: null,
              senderAgentId: null,
              direction: message.direction,
              platform: message.platform.trim().toLowerCase(),
              type: message.type,
              text: message.text?.trim() || null,
              fileUrl: message.fileUrl?.trim() || null,
              fileCaption: message.fileCaption?.trim() || null,
              deliveryStatus: message.deliveryStatus?.trim() || "unknown",
              platformTimestamp: new Date(message.platformTimestamp),
            };

            await manager.getRepository(Message).save(record);

            messageEvents.push({
              messageId: record.id,
              customerId: record.customerId,
              conversationId: record.conversationId,
              senderAgentId: record.senderAgentId,
              direction: record.direction,
              text: record.text ?? "",
              platformTimestamp: record.platformTimestamp,
            });
            synced += 1;
          }

          await manager
            .getRepository(Customer)
            .update(
              { id: customer.id },
              { messageHistorySyncedAt: new Date() },
            );

          return { synced, messageEvents };
        },
      );

      messagesSynced += transactionResult.synced;

      for (const messageEvent of transactionResult.messageEvents) {
        this.postHogService.captureMessages(messageEvent);
      }
    }

    return {
      synced: messagesSynced,
      failedCustomers: [],
    };
  }
}
