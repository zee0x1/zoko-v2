import { database } from "../database.js";
import { Message } from "../entities/message.entity.js";
import { posthogClient } from "../posthog.js";
import { PostHogService } from "../services/posthog.service.js";

const postHogService = new PostHogService(posthogClient);

async function syncMessagesToPostHog(): Promise<void> {
  try {
    await database.initialize();

    const messages = await database.getRepository(Message).find({
      order: {
        platformTimestamp: "ASC",
        id: "ASC",
      },
    });

    console.info(`Found ${messages.length} messages to sync to PostHog`);

    for (const message of messages) {
      postHogService.captureMessages({
        messageId: message.id,
        customerId: message.customerId,
        conversationId: message.conversationId,
        senderAgentId: message.senderAgentId,
        direction: message.direction,
        text: message.text ?? "",
        platformTimestamp: message.platformTimestamp,
      });
    }

    console.info(`Synced ${messages.length} messages to PostHog`);
  } catch (error) {
    console.error("Failed to sync messages to PostHog", error);
    process.exitCode = 1;
  } finally {
    await posthogClient.shutdown();

    if (database.isInitialized) {
      await database.destroy();
    }
  }
}

void syncMessagesToPostHog();
