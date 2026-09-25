import { app } from './app.js'
import { config } from './config.js'
import { database } from './database.js'

async function startServer(): Promise<void> {
  try {
    await database.initialize()
    console.info(
      `Connected to PostgreSQL at ${config.database.host}:${config.database.port}/${config.database.name}.`,
    )
  } catch (error) {
    console.error('Unable to connect to PostgreSQL. The server will not start.')
    console.error(
      `Target: ${config.database.host}:${config.database.port}/${config.database.name} as ${config.database.user}.`,
    )
    console.error(
      'Check that PostgreSQL is running (`docker compose up -d`) and that the DB_* environment variables are correct.',
    )
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
    return
  }

  const server = app.listen(config.port, () => {
    console.info(`Server listening at http://localhost:${config.port}.`)
  })

  async function shutdown(signal: NodeJS.Signals): Promise<void> {
    console.info(`Received ${signal}; shutting down.`)
    server.close(async (closeError) => {
      if (closeError) {
        console.error('Express failed to close cleanly.', closeError)
        process.exitCode = 1
      }

      if (database.isInitialized) {
        await database.destroy()
      }
    })
  }

  process.once('SIGINT', () => void shutdown('SIGINT'))
  process.once('SIGTERM', () => void shutdown('SIGTERM'))
}

void startServer()
