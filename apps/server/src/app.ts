import express from "express";
import { SyncController } from "./controllers/sync.controller.js";
import { WebhookController } from "./controllers/webhook.controller.js";
import { config } from "./config.js";
import { database } from "./database.js";
import { SyncService } from "./services/sync.service.js";
import { WebhookService } from "./services/webhook.service.js";
import { ZokoClient } from "./zoko-client.js";

export const app = express();

app.disable("x-powered-by");
app.use(express.json());

const zokoClient = new ZokoClient(
  config.zoko.baseUrl,
  config.zoko.apiKey,
  config.zoko.requestDelayMs,
);
const syncController = new SyncController(
  new SyncService(database, zokoClient),
);
const webhookController = new WebhookController(new WebhookService(database));

app.get("/health", (_request, response) => {
  response.status(200).json({ status: "ok" });
});

app.post(
  "/api/ingestion/sync/agents",
  syncController.syncAgents.bind(syncController),
);
app.post(
  "/api/ingestion/sync/customers",
  syncController.syncCustomers.bind(syncController),
);
app.post(
  "/api/ingestion/sync/customer-messages",
  syncController.syncCustomerMessages.bind(syncController),
);
app.post("/webhooks/zoko", webhookController.receive.bind(webhookController));
