import type { Request, Response } from "express";
import {
  csatResponseSchema,
  conversationIdSchema,
  sendMessageSchema,
} from "../dtos/conversation.dto.js";
import {
  ConversationClosedError,
  ConversationNotClosedError,
  ConversationNotFoundError,
  ConversationService,
  RecipientConfigurationError,
  RecipientNotAllowedError,
} from "../services/conversation.service.js";
import { ZokoApiError } from "../zoko-client.js";

export class ConversationController {
  constructor(private readonly conversationService: ConversationService) {}

  async list(_req: Request, res: Response): Promise<void> {
    try {
      res.status(200).json(await this.conversationService.listConversations());
    } catch (error) {
      res.status(500).json({
        error: "Conversation listing failed",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async get(req: Request, res: Response): Promise<void> {
    const conversationId = conversationIdSchema.safeParse(
      req.params.conversationId,
    );

    if (!conversationId.success) {
      res.status(400).json({ error: "Invalid conversation ID" });
      return;
    }

    try {
      res
        .status(200)
        .json(
          await this.conversationService.getConversation(conversationId.data),
        );
    } catch (error) {
      if (error instanceof ConversationNotFoundError) {
        res.status(404).json({
          error: "Conversation not found",
          details: error.message,
        });
        return;
      }

      res.status(500).json({
        error: "Conversation lookup failed",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async sendMessage(req: Request, res: Response): Promise<void> {
    const conversationId = conversationIdSchema.safeParse(
      req.params.conversationId,
    );

    if (!conversationId.success) {
      res.status(400).json({ error: "Invalid conversation ID" });
      return;
    }

    const body = sendMessageSchema.safeParse(req.body);

    if (!body.success) {
      res.status(400).json({ error: "Invalid message body" });
      return;
    }

    try {
      const result = await this.conversationService.sendTextMessage(
        conversationId.data,
        body.data.text,
      );
      res.status(202).json(result);
    } catch (error) {
      if (error instanceof ConversationNotFoundError) {
        res.status(404).json({
          error: "Conversation not found",
          details: error.message,
        });
        return;
      }

      if (error instanceof ConversationClosedError) {
        res.status(409).json({
          error: "Conversation is closed",
          details: error.message,
        });
        return;
      }

      if (error instanceof RecipientNotAllowedError) {
        res.status(403).json({
          error: "Recipient is not allowed",
          details: error.message,
        });
        return;
      }

      if (error instanceof RecipientConfigurationError) {
        res.status(500).json({
          error: "Recipient configuration error",
          details: error.message,
        });
        return;
      }

      if (error instanceof ZokoApiError) {
        res.status(502).json({
          error: "Zoko request failed",
          details: error.message,
        });
        return;
      }

      res.status(500).json({
        error: "Message sending failed",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async askForCsat(req: Request, res: Response): Promise<void> {
    const conversationId = conversationIdSchema.safeParse(
      req.params.conversationId,
    );

    if (!conversationId.success) {
      res.status(400).json({ error: "Invalid conversation ID" });
      return;
    }

    try {
      const result = await this.conversationService.askForCsat(
        conversationId.data,
      );
      res.status(202).json(result);
    } catch (error) {
      this.handleCsatError(error, res, "CSAT request failed");
    }
  }

  async submitCsatResponse(req: Request, res: Response): Promise<void> {
    const conversationId = conversationIdSchema.safeParse(
      req.params.conversationId,
    );

    if (!conversationId.success) {
      res.status(400).json({ error: "Invalid conversation ID" });
      return;
    }

    const body = csatResponseSchema.safeParse(req.body);

    if (!body.success) {
      res.status(400).json({ error: "Invalid CSAT response" });
      return;
    }

    try {
      const result = await this.conversationService.submitCsatResponse(
        conversationId.data,
        body.data.rating,
      );
      res.status(202).json(result);
    } catch (error) {
      this.handleCsatError(error, res, "CSAT response failed");
    }
  }

  private handleCsatError(
    error: unknown,
    res: Response,
    operationError: string,
  ): void {
    if (error instanceof ConversationNotFoundError) {
      res.status(404).json({
        error: "Conversation not found",
        details: error.message,
      });
      return;
    }

    if (error instanceof ConversationNotClosedError) {
      res.status(409).json({
        error: "Conversation is still open",
        details: error.message,
      });
      return;
    }

    res.status(500).json({
      error: operationError,
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
