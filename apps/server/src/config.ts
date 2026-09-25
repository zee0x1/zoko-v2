import 'dotenv/config'

function readInteger(name: string, fallback: number): number {
  const rawValue = process.env[name]

  if (rawValue === undefined) {
    return fallback
  }

  const value = Number(rawValue)

  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer; received "${rawValue}".`)
  }

  return value
}

export const config = {
  port: readInteger('PORT', 3000),
  database: {
    host: process.env.DB_HOST ?? 'localhost',
    port: readInteger('DB_PORT', 5432),
    name: process.env.DB_NAME ?? 'zoko',
    user: process.env.DB_USER ?? 'zoko',
    password: process.env.DB_PASSWORD ?? 'zoko',
    logging: process.env.DB_LOGGING === 'true',
  },
} as const
