import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: 8000,
  database: {
    host: process.env.DB_HOST ?? "localhost",
    port: Number(process.env.DB_PORT ?? 5432),
    name: process.env.DB_NAME ?? "zoko",
    user: process.env.DB_USER ?? "zoko",
    password: process.env.DB_PASSWORD,
    logging: process.env.DB_LOGGING === "true",
  },
  zoko: {
    apiKey: process.env.ZOKO_API_KEY,
    baseUrl: "https://chat.zoko.io/v2",
    requestDelayMs: 3000,
  },
} as const;
