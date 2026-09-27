import express from "express";
import { MetricsController } from "./controllers/metrics.controller.js";
import { SyncController } from "./controllers/sync.controller.js";
import { WebhookController } from "./controllers/webhook.controller.js";
import { config } from "./config.js";
import { database } from "./database.js";
import { MetricsService } from "./services/metrics.service.js";
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

export const syncService = new SyncService(database, zokoClient);
const syncController = new SyncController(syncService);
const metricsController = new MetricsController(new MetricsService(database));
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
app.get(
  "/api/metrics/messages/total",
  metricsController.getTotalMessages.bind(metricsController),
);
app.get(
  "/api/metrics/messages/by-customer",
  metricsController.getMessagesByCustomer.bind(metricsController),
);
app.get("/api/metrics/frt", metricsController.getFRT.bind(metricsController));
app.get(
  "/api/metrics/resolution",
  metricsController.getResolutionTime.bind(metricsController),
);
app.get(
  "/api/metrics/agents",
  metricsController.getAgentMetrics.bind(metricsController),
);
app.post("/webhooks/zoko", webhookController.receive.bind(webhookController));
