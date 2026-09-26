import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm'
import type { Relation } from 'typeorm'
import { ChatAssignment } from './chat-assignment.entity.js'
import { Conversation } from './conversation.entity.js'
import { Message } from './message.entity.js'

@Entity({ name: 'agents' })
export class Agent {
  @PrimaryColumn({ type: 'uuid' })
  id: string

  @Column({ type: 'varchar', length: 255 })
  name: string

  @Column({ type: 'varchar', length: 320, unique: true })
  email: string

  @OneToMany(() => ChatAssignment, (assignment) => assignment.agent)
  chatAssignments: Relation<ChatAssignment[]>

  @OneToMany(() => Message, (message) => message.senderAgent)
  sentMessages: Relation<Message[]>

  @OneToMany(() => Conversation, (conversation) => conversation.closedByAgent)
  closedConversations: Relation<Conversation[]>

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date
}
