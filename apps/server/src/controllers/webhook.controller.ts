import type { Request, Response } from "express";
import { webhookDtoSchema, webhookBaseSchema } from "../dtos/webhook.dto.js";
import type { WebhookService } from "../services/webhook.service.js";

const supportedEvents = new Set([
  "message:user:in",
  "message:store:out",
  "message:delivery:update",
  "zoko:chat:assigned",
  "zoko:chat:closed",
]);

export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  async receive(request: Request, response: Response): Promise<void> {
    const envelope = webhookBaseSchema.safeParse(request.body);

    if (!envelope.success) {
      response.status(400).json({ error: "Invalid webhook event envelope" });
      return;
    }

    if (!supportedEvents.has(envelope.data.event)) {
      response.status(400).json({ error: "Unsupported webhook event" });
      return;
    }

    const payload = webhookDtoSchema.safeParse(request.body);

    if (!payload.success) {
      response.status(400).json({ error: "Invalid webhook payload" });
      return;
    }

    try {
      await this.webhookService.process(payload.data);
      response.status(200).json({ ok: true });
    } catch (error) {
      console.error("Zoko webhook processing failed", error);
      response.status(500).json({ error: "Webhook processing failed" });
    }
  }
}
