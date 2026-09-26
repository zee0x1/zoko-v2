import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm'
import type { Relation } from 'typeorm'
import { Agent } from './agent.entity.js'
import { Conversation } from './conversation.entity.js'

@Entity({ name: 'chat_assignments' })
export class ChatAssignment {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ name: 'conversation_id', type: 'integer' })
  conversationId: number

  @ManyToOne(() => Conversation, (conversation) => conversation.chatAssignments, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'conversation_id',
    foreignKeyConstraintName: 'FK_chat_assignments_conversation',
  })
  conversation: Relation<Conversation>

  @Column({ name: 'agent_id', type: 'uuid' })
  agentId: string

  @ManyToOne(() => Agent, (agent) => agent.chatAssignments, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'agent_id',
    foreignKeyConstraintName: 'FK_chat_assignments_agent',
  })
  agent: Relation<Agent>

  @Column({ name: 'assigned_at', type: 'timestamptz' })
  assignedAt: Date

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date
}
