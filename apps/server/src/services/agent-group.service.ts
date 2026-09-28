import type { DataSource } from "typeorm";
import type { AgentGroupParams } from "./posthog.service.js";
import { PostHogService } from "./posthog.service.js";

type AgentGroupRow = {
  agentId: string;
  name: string;
  email: string;
  messagesSent: string;
  conversationsHandled: string;
};

export class AgentGroupService {
  constructor(
    private readonly database: DataSource,
    private readonly postHogService: PostHogService,
  ) {}

  async syncAgent(agentId: string): Promise<void> {
    const agents = await this.loadAgentMetrics(agentId);
    const agent = agents[0];

    if (!agent) {
      throw new Error(`Agent ${agentId} does not exist`);
    }

    this.captureAgentMetrics(agent);
  }

  async syncAllAgents(): Promise<number> {
    const agents = await this.loadAgentMetrics(null);

    for (const agent of agents) {
      this.captureAgentMetrics(agent);
    }

    return agents.length;
  }

  private loadAgentMetrics(agentId: string | null): Promise<AgentGroupRow[]> {
    return this.database.query<AgentGroupRow[]>(
      `
        SELECT
          agent.id AS "agentId",
          agent.name,
          agent.email,
          (
            SELECT COUNT(*)
            FROM "messages" AS message
            WHERE message.sender_agent_id = agent.id
              AND message.direction = 'FROM_STORE'
          ) AS "messagesSent",
          (
            SELECT COUNT(DISTINCT assignment.conversation_id)
            FROM "chat_assignments" AS assignment
            WHERE assignment.agent_id = agent.id
          ) AS "conversationsHandled"
        FROM "agents" AS agent
        WHERE $1::uuid IS NULL OR agent.id = $1::uuid
        ORDER BY agent.name ASC, agent.id ASC
      `,
      [agentId],
    );
  }

  private captureAgentMetrics(agent: AgentGroupRow): void {
    const params: AgentGroupParams = {
      agentId: agent.agentId,
      name: agent.name,
      email: agent.email,
      messagesSent: Number(agent.messagesSent),
      conversationsHandled: Number(agent.conversationsHandled),
    };

    this.postHogService.captureAgentMetrics(params);
  }
}
