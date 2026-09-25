import 'reflect-metadata'
import { DataSource } from 'typeorm'
import { config } from './config.js'

export const database = new DataSource({
  type: 'postgres',
  host: config.database.host,
  port: config.database.port,
  username: config.database.user,
  password: config.database.password,
  database: config.database.name,
  logging: config.database.logging,
  synchronize: false,
  entities: [],
  migrations: [],
})
