import 'reflect-metadata'
import { DataSource } from 'typeorm'
import { config } from './config.js'
import { Agent } from './entities/agent.entity.js'
import { ChatAssignment } from './entities/chat-assignment.entity.js'
import { Conversation } from './entities/conversation.entity.js'
import { Customer } from './entities/customer.entity.js'
import { Message } from './entities/message.entity.js'
import { CreateSupportEntities1790421158000 } from './migrations/1790421158000-create-support-entities.js'
import { AddMessageHistorySyncedAt1790468449000 } from './migrations/1790468449000-add-message-history-synced-at.js'

export const database = new DataSource({
  type: 'postgres',
  host: config.database.host,
  port: config.database.port,
  username: config.database.user,
  password: config.database.password,
  database: config.database.name,
  logging: config.database.logging,
  synchronize: false,
  entities: [Customer, Agent, Conversation, Message, ChatAssignment],
  migrations: [
    CreateSupportEntities1790421158000,
    AddMessageHistorySyncedAt1790468449000,
  ],
})
