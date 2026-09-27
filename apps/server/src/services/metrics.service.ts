import type { DataSource } from "typeorm";
import { Agent } from "../entities/agent.entity.js";
import { ChatAssignment } from "../entities/chat-assignment.entity.js";
import { Conversation } from "../entities/conversation.entity.js";
import { Message, MessageDirection } from "../entities/message.entity.js";

export interface DurationStatistics {
  averageMs: number | null;
  medianMs: number | null;
  sampleSize: number;
}

export interface AgentMetrics {
  agentId: string;
  name: string;
  email: string;
  conversationsHandled: number;
  humanFRT: DurationStatistics;
  resolutionTime: DurationStatistics;
  reassignedChats: number;
  reassignmentRate: number;
}

interface ConversationResponseTimes {
  human: {
    agentId: string;
    durationMs: number;
  } | null;
  bot: {
    durationMs: number;
  } | null;
}

interface AgentMetricAccumulator {
  agent: Agent;
  handledConversationIds: Set<number>;
  humanFRT: number[];
  resolutionTime: number[];
  reassignedConversationIds: Set<number>;
}

export class MetricsService {
  constructor(private readonly database: DataSource) {}

  async getTotalMessages(): Promise<{ totalMessages: number }> {
    const totalMessages = await this.database.getRepository(Message).count();

    return { totalMessages };
  }

  async getMessagesByCustomer(): Promise<{
    customers: Array<{
      customerId: string;
      customerName: string;
      phone: string;
      messageCount: number;
    }>;
  }> {
    const rows = await this.database.query<
      Array<{
        customerId: string;
        customerName: string;
        phone: string;
        messageCount: string;
      }>
    >(`
      SELECT
        customer.id AS "customerId",
        customer.name AS "customerName",
        customer.phone AS "phone",
        COUNT(message.id) AS "messageCount"
      FROM "messages" AS message
      INNER JOIN "customers" AS customer
        ON customer.id = message.customer_id
      GROUP BY customer.id, customer.name, customer.phone
      ORDER BY COUNT(message.id) DESC, customer.id ASC
    `);

    return {
      customers: rows.map((row) => ({
        customerId: row.customerId,
        customerName: row.customerName,
        phone: row.phone,
        messageCount: Number(row.messageCount),
      })),
    };
  }

  async getFRT(): Promise<{
    human: DurationStatistics;
    bot: DurationStatistics;
  }> {
    const conversationMsgs = await this.loadConversationMessages();
    const responseTimes = this.calculateFRTs(conversationMsgs);
    const humanDurations: number[] = [];
    const botDurations: number[] = [];

    for (const responseTime of responseTimes) {
      if (responseTime.human) {
        humanDurations.push(responseTime.human.durationMs);
      }

      if (responseTime.bot) {
        botDurations.push(responseTime.bot.durationMs);
      }
    }

    return {
      human: this.calculateStatistics(humanDurations),
      bot: this.calculateStatistics(botDurations),
    };
  }

  async getResolutionTime(): Promise<DurationStatistics> {
    const conversations = await this.loadClosedConversations();
    const durations = conversations.flatMap((conversation) => {
      const duration = this.calculateResolutionDuration(conversation);

      return duration === null ? [] : [duration];
    });

    return this.calculateStatistics(durations);
  }

  async getAgentMetrics(): Promise<{
    agents: AgentMetrics[];
  }> {
    const [agents, assignments, messages, closedConversations] =
      await Promise.all([
        this.loadAgents(),
        this.loadAssignments(),
        this.loadConversationMessages(),
        this.loadClosedConversations(),
      ]);

    const metricsByAgent = new Map<string, AgentMetricAccumulator>();

    for (const agent of agents) {
      metricsByAgent.set(agent.id, {
        agent,
        handledConversationIds: new Set<number>(),
        humanFRT: [],
        resolutionTime: [],
        reassignedConversationIds: new Set<number>(),
      });
    }

    let previousAssignment: ChatAssignment | null = null;

    for (const assignment of assignments) {
      const currentAgentMetrics = metricsByAgent.get(assignment.agentId);

      if (currentAgentMetrics) {
        // A set counts the conversation only once for this agent.
        // Example: in A -> B -> A, agent A handled one conversation, not two.
        currentAgentMetrics.handledConversationIds.add(
          assignment.conversationId,
        );
      }
      // checking if the assingment belongs to the same convo
      // Example: A -> B (both with conversation_id X) means this row belongs to B and the previous row
      // belongs to A, so the conversation was reassigned away from A.
      if (
        previousAssignment !== null &&
        previousAssignment.conversationId === assignment.conversationId
      ) {
        const previousAgentMetrics = metricsByAgent.get(
          previousAssignment.agentId,
        );

        if (previousAgentMetrics) {
          // The set still counts one reassigned chat for A in A -> B -> A -> C for a convo,
          // even though that same conversation was reassigned away from A twice.
          previousAgentMetrics.reassignedConversationIds.add(
            assignment.conversationId,
          );
        }
      }

      previousAssignment = assignment;
    }

    const responseTimes = this.calculateFRTs(messages);

    for (const responseTime of responseTimes) {
      const humanResponse = responseTime.human;

      if (humanResponse === null) {
        continue;
      }

      const agentMetrics = metricsByAgent.get(humanResponse.agentId);

      if (agentMetrics === undefined) {
        continue;
      }

      agentMetrics.humanFRT.push(humanResponse.durationMs);
    }

    for (const conversation of closedConversations) {
      if (conversation.closedByAgentId === null) {
        continue;
      }

      const metric = metricsByAgent.get(conversation.closedByAgentId);
      const duration = this.calculateResolutionDuration(conversation);

      if (metric && duration !== null) {
        metric.resolutionTime.push(duration);
      }
    }

    const sortedMetrics = [...metricsByAgent.values()].sort((left, right) => {
      const nameDifference = left.agent.name.localeCompare(right.agent.name);

      return nameDifference !== 0
        ? nameDifference
        : left.agent.id.localeCompare(right.agent.id);
    });

    return {
      agents: sortedMetrics.map((metric) => {
        const conversationsHandled = metric.handledConversationIds.size;
        const reassignedChats = metric.reassignedConversationIds.size;

        return {
          agentId: metric.agent.id,
          name: metric.agent.name,
          email: metric.agent.email,
          conversationsHandled,
          humanFRT: this.calculateStatistics(metric.humanFRT),
          resolutionTime: this.calculateStatistics(metric.resolutionTime),
          reassignedChats,
          reassignmentRate:
            conversationsHandled === 0
              ? 0
              : reassignedChats / conversationsHandled,
        };
      }),
    };
  }

  private async loadAgents(): Promise<Agent[]> {
    return this.database.query<Agent[]>(`
      SELECT id, name, email
      FROM "agents"
    `);
  }

  private async loadAssignments(): Promise<ChatAssignment[]> {
    return this.database.query<ChatAssignment[]>(`
      SELECT
        id,
        conversation_id AS "conversationId",
        agent_id AS "agentId",
        assigned_at AS "assignedAt"
      FROM "chat_assignments"
      ORDER BY conversation_id ASC, assigned_at ASC, id ASC
    `);
  }

  private async loadConversationMessages(): Promise<Message[]> {
    return this.database.query<Message[]>(`
      SELECT
        id,
        conversation_id AS "conversationId",
        sender_agent_id AS "senderAgentId",
        direction,
        platform_timestamp AS "platformTimestamp",
        created_at AS "createdAt"
      FROM "messages"
      WHERE conversation_id IS NOT NULL
      ORDER BY platform_timestamp ASC, created_at ASC, id ASC
    `);
  }

  private async loadClosedConversations(): Promise<Conversation[]> {
    return this.database.query<Conversation[]>(`
      SELECT
        id,
        opened_at AS "openedAt",
        closed_at AS "closedAt",
        closed_by_agent_id AS "closedByAgentId"
      FROM "conversations"
      WHERE closed_at IS NOT NULL
    `);
  }

  private calculateFRTs(messages: Message[]): ConversationResponseTimes[] {
    const messagesByConversation = new Map<number, Message[]>();

    for (const message of messages) {
      if (message.conversationId === null) {
        continue;
      }

      const conversationMessages = messagesByConversation.get(
        message.conversationId,
      );

      if (conversationMessages) {
        conversationMessages.push(message);
      } else {
        messagesByConversation.set(message.conversationId, [message]);
      }
    }

    const responseTimes: ConversationResponseTimes[] = [];

    for (const conversationMessages of messagesByConversation.values()) {
      const firstCustomerMessage = conversationMessages.find(
        (message) => message.direction === MessageDirection.FromCustomer,
      );

      if (!firstCustomerMessage) {
        continue;
      }

      const firstCustomerTimestamp =
        firstCustomerMessage.platformTimestamp.getTime();
      let humanResponse: Message | null = null;
      let botResponse: Message | null = null;

      for (const message of conversationMessages) {
        if (
          message.direction !== MessageDirection.FromStore ||
          message.platformTimestamp.getTime() < firstCustomerTimestamp
        ) {
          continue;
        }

        if (message.senderAgentId === null && botResponse === null) {
          botResponse = message;
        }

        if (message.senderAgentId !== null && humanResponse === null) {
          humanResponse = message;
        }

        if (humanResponse !== null && botResponse !== null) {
          break;
        }
      }

      responseTimes.push({
        human: humanResponse
          ? {
              agentId: humanResponse.senderAgentId!,
              durationMs:
                humanResponse.platformTimestamp.getTime() -
                firstCustomerTimestamp,
            }
          : null,
        bot: botResponse
          ? {
              durationMs:
                botResponse.platformTimestamp.getTime() -
                firstCustomerTimestamp,
            }
          : null,
      });
    }

    return responseTimes;
  }

  private calculateResolutionDuration(
    conversation: Conversation,
  ): number | null {
    if (!conversation.closedAt) {
      console.warn(
        `Conversation ${conversation.id} has no closedAt value. Can't calculate resolution time`,
      );
      return null;
    }
    const duration =
      conversation.closedAt.getTime() - conversation.openedAt.getTime();

    if (duration < 0) {
      console.warn(
        `Negative resolution duration excluded for conversation ${conversation.id}`,
      );
      return null;
    }

    return duration;
  }

  private calculateStatistics(values: number[]): DurationStatistics {
    if (values.length === 0) {
      return {
        averageMs: null,
        medianMs: null,
        sampleSize: 0,
      };
    }

    const sortedValues = [...values].sort((left, right) => left - right);
    const middleIndex = Math.floor(sortedValues.length / 2);
    const median =
      sortedValues.length % 2 === 1
        ? sortedValues[middleIndex]!
        : (sortedValues[middleIndex - 1]! + sortedValues[middleIndex]!) / 2;
    const total = values.reduce((sum, value) => sum + value, 0);

    return {
      averageMs: Math.round(total / values.length),
      medianMs: Math.round(median),
      sampleSize: values.length,
    };
  }
}
