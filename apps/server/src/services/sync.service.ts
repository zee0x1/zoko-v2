import type { DataSource } from "typeorm";
import { Agent } from "../entities/agent.entity.js";
import { Message, MessageDirection } from "../entities/message.entity.js";
import { Customer } from "../entities/customer.entity.js";
import { ZokoClient } from "../zoko-client.js";

export class SyncService {
  constructor(
    private readonly database: DataSource,
    private readonly zokoClient: ZokoClient,
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

  async syncCustomers(): Promise<{ synced: number }> {
    let customersSynced = 0;
    let page = 1;

    while (true) {
      const customerPage = await this.zokoClient.listCustomers(page);

      await this.database.transaction(async (manager) => {
        for (const customer of customerPage.customers) {
          const channelId = customer.channelId.trim();
          const phone = channelId.startsWith("+") ? channelId : `+${channelId}`;

          await manager.getRepository(Customer).upsert(
            {
              id: customer.id,
              name: customer.name,
              phone,
            },
            ["id"],
          );
        }
      });

      customersSynced += customerPage.customers.length;

      if (customerPage.currentPage >= customerPage.totalPages) {
        break;
      }

      page = customerPage.currentPage + 1;
    }

    return { synced: customersSynced };
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

      messagesSynced += await this.database.transaction(async (manager) => {
        let synced = 0;

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

          synced += 1;
        }

        await manager.getRepository(Customer).update(
          { id: customer.id },
          { messageHistorySyncedAt: new Date() },
        );

        return synced;
      });
    }

    return {
      synced: messagesSynced,
      failedCustomers: [],
    };
  }
}
