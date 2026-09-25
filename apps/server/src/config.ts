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
} as const;
