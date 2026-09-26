import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from "typeorm";
import type { Relation } from "typeorm";
import { Agent } from "./agent.entity.js";
import { Conversation } from "./conversation.entity.js";
import { Customer } from "./customer.entity.js";

export enum MessageDirection {
  FromCustomer = "FROM_CUSTOMER",
  FromStore = "FROM_STORE",
}

@Entity({ name: "messages" })
export class Message {
  @PrimaryColumn({ type: "uuid" })
  id: string;

  @Column({ name: "customer_id", type: "uuid" })
  customerId: string;

  @ManyToOne(() => Customer, (customer) => customer.messages, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({
    name: "customer_id",
    foreignKeyConstraintName: "FK_messages_customer",
  })
  customer: Relation<Customer>;

  @Column({ name: "conversation_id", type: "integer", nullable: true })
  conversationId: number | null;

  @ManyToOne(() => Conversation, (conversation) => conversation.messages, {
    nullable: true,
    onDelete: "SET NULL",
  })
  @JoinColumn({
    name: "conversation_id",
    foreignKeyConstraintName: "FK_messages_conversation",
  })
  conversation: Relation<Conversation> | null;

  @Column({ name: "sender_agent_id", type: "uuid", nullable: true })
  senderAgentId: string | null;

  @ManyToOne(() => Agent, (agent) => agent.sentMessages, {
    nullable: true,
    onDelete: "SET NULL",
  })
  @JoinColumn({
    name: "sender_agent_id",
    foreignKeyConstraintName: "FK_messages_sender_agent",
  })
  senderAgent: Relation<Agent> | null;

  @Column({
    type: "enum",
    enum: MessageDirection,
    enumName: "message_direction_enum",
  })
  direction: MessageDirection;

  @Column({ type: "varchar", length: 32 })
  platform: string;

  @Column({ type: "varchar", length: 64 })
  type: string;

  @Column({ type: "text", nullable: true })
  text: string | null;

  @Column({ name: "file_url", type: "text", nullable: true })
  fileUrl: string | null;

  @Column({ name: "file_caption", type: "text", nullable: true })
  fileCaption: string | null;

  @Column({ name: "delivery_status", type: "varchar", length: 32 })
  deliveryStatus: string;

  @Column({ name: "platform_timestamp", type: "timestamptz" })
  platformTimestamp: Date;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}
