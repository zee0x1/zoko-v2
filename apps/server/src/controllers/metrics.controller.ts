import type { Request, Response } from "express";
import { messagesByCustomerPaginationSchema } from "../dtos/metrics.dto.js";
import type { MetricsService } from "../services/metrics.service.js";

export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  async getTotalMessages(_req: Request, res: Response): Promise<void> {
    try {
      res.status(200).json(await this.metricsService.getTotalMessages());
    } catch (error) {
      console.error("Total messages metrics failed", error);
      res.status(500).json({
        error: "Total messages metrics failed",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async getMessagesByCustomer(req: Request, res: Response): Promise<void> {
    const pagination = messagesByCustomerPaginationSchema.safeParse(req.query);

    if (!pagination.success) {
      res.status(400).json({ error: "Invalid pagination parameters" });
      return;
    }

    try {
      res
        .status(200)
        .json(
          await this.metricsService.getMessagesByCustomer(
            pagination.data.page,
            pagination.data.pageSize,
          ),
        );
    } catch (error) {
      console.error("Messages by customer metrics failed", error);
      res.status(500).json({
        error: "Messages by customer metrics failed",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async getFRT(_req: Request, res: Response): Promise<void> {
    try {
      res.status(200).json(await this.metricsService.getFRT());
    } catch (error) {
      console.error("First response time metrics failed", error);
      res.status(500).json({
        error: "First response time metrics failed",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async getResolutionTime(_req: Request, res: Response): Promise<void> {
    try {
      res.status(200).json(await this.metricsService.getResolutionTime());
    } catch (error) {
      console.error("Resolution time metrics failed", error);
      res.status(500).json({
        error: "Resolution time metrics failed",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async getAgentMetrics(_req: Request, res: Response): Promise<void> {
    try {
      res.status(200).json(await this.metricsService.getAgentMetrics());
    } catch (error) {
      console.error("Agent metrics failed", error);
      res.status(500).json({
        error: "Agent metrics failed",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
