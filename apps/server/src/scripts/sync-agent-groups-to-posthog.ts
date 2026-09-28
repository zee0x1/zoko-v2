import { database } from "../database.js";
import { posthogClient } from "../posthog.js";
import { AgentGroupService } from "../services/agent-group.service.js";
import { PostHogService } from "../services/posthog.service.js";

const postHogService = new PostHogService(posthogClient);
const agentGroupService = new AgentGroupService(database, postHogService);

async function syncAgentGroupsToPostHog(): Promise<void> {
  try {
    await database.initialize();

    const syncedAgents = await agentGroupService.syncAllAgents();

    console.info(`Synced ${syncedAgents} agent groups to PostHog`);
  } catch (error) {
    console.error("Failed to sync agent groups to PostHog", error);
    process.exitCode = 1;
  } finally {
    await posthogClient.shutdown();

    if (database.isInitialized) {
      await database.destroy();
    }
  }
}

void syncAgentGroupsToPostHog();
