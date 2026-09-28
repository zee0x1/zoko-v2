import express from "express";
import { ConversationController } from "./controllers/conversation.controller.js";
import { MetricsController } from "./controllers/metrics.controller.js";
import { SyncController } from "./controllers/sync.controller.js";
import { WebhookController } from "./controllers/webhook.controller.js";
import { config } from "./config.js";
import { database } from "./database.js";
import { ConversationService } from "./services/conversation.service.js";
import { MetricsService } from "./services/metrics.service.js";
import { PostHogService } from "./services/posthog.service.js";
import { SyncService } from "./services/sync.service.js";
import { WebhookService } from "./services/webhook.service.js";
import { posthogClient } from "./posthog.js";
import { ZokoClient } from "./zoko-client.js";

export const app = express();

app.disable("x-powered-by");
app.use(express.json());

const zokoClient = new ZokoClient(
  config.zoko.baseUrl,
  config.zoko.apiKey,
  config.zoko.requestDelayMs,
);
const postHogService = new PostHogService(posthogClient);

export const syncService = new SyncService(
  database,
  zokoClient,
  postHogService,
);
const syncController = new SyncController(syncService);
const conversationController = new ConversationController(
  new ConversationService(
    database,
    zokoClient,
    config.zoko.allowedRecipientPhone,
    postHogService,
  ),
);
const metricsController = new MetricsController(new MetricsService(database));
const webhookController = new WebhookController(
  new WebhookService(database, postHogService),
);

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
app.get(
  "/api/conversations",
  conversationController.list.bind(conversationController),
);
app.get(
  "/api/conversations/:conversationId",
  conversationController.get.bind(conversationController),
);
app.post(
  "/api/conversations/:conversationId/messages",
  conversationController.sendMessage.bind(conversationController),
);
app.post(
  "/api/conversations/:conversationId/csat/ask",
  conversationController.askForCsat.bind(conversationController),
);
app.post(
  "/api/conversations/:conversationId/csat/response",
  conversationController.submitCsatResponse.bind(conversationController),
);
app.post("/webhooks/zoko", webhookController.receive.bind(webhookController));
