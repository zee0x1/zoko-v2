import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm'
import type { Relation } from 'typeorm'
import { Conversation } from './conversation.entity.js'
import { Message } from './message.entity.js'

@Entity({ name: 'customers' })
export class Customer {
  @PrimaryColumn({ type: 'uuid' })
  id: string

  @Column({ type: 'varchar', length: 255 })
  name: string

  @Column({ type: 'varchar', length: 32 })
  phone: string

  @Column({ name: 'message_history_synced_at', type: 'timestamptz', nullable: true })
  messageHistorySyncedAt: Date | null

  @OneToMany(() => Conversation, (conversation) => conversation.customer)
  conversations: Relation<Conversation[]>

  @OneToMany(() => Message, (message) => message.customer)
  messages: Relation<Message[]>

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date
}
