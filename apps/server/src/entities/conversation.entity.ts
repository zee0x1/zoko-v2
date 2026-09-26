import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import type { Relation } from "typeorm";
import { Agent } from "./agent.entity.js";
import { ChatAssignment } from "./chat-assignment.entity.js";
import { Customer } from "./customer.entity.js";
import { Message } from "./message.entity.js";

/**
 * The service code of this should ensure closedAt >= openedAt.
 */

@Entity({ name: "conversations" })
export class Conversation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "customer_id", type: "uuid" })
  customerId: string;

  @ManyToOne(() => Customer, (customer) => customer.conversations, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({
    name: "customer_id",
    foreignKeyConstraintName: "FK_conversations_customer",
  })
  customer: Relation<Customer>;

  @OneToMany(() => Message, (message) => message.conversation)
  messages: Relation<Message[]>;

  @OneToMany(() => ChatAssignment, (assignment) => assignment.conversation)
  chatAssignments: Relation<ChatAssignment[]>;

  @Column({ name: "opened_at", type: "timestamptz" })
  openedAt: Date;

  @Column({ name: "closed_at", type: "timestamptz", nullable: true })
  closedAt: Date | null;

  @Column({ name: "closed_by_agent_id", type: "uuid", nullable: true })
  closedByAgentId: string | null;

  @ManyToOne(() => Agent, (agent) => agent.closedConversations, {
    nullable: true,
    onDelete: "SET NULL",
  })
  @JoinColumn({
    name: "closed_by_agent_id",
    foreignKeyConstraintName: "FK_conversations_closed_by_agent",
  })
  closedByAgent: Relation<Agent> | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}
