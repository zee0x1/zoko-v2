import type { Request, Response } from "express";
import type { SyncService } from "../services/sync.service.js";

export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  async syncAgents(_req: Request, res: Response): Promise<void> {
    try {
      const result = await this.syncService.syncAgents();
      res.status(200).json(result);
    } catch (error) {
      console.error("Agent sync failed", error);
      res.status(500).json({ error: "Agent sync failed" });
    }
  }

  async syncCustomers(_req: Request, res: Response): Promise<void> {
    try {
      const result = await this.syncService.syncCustomers();
      res.status(200).json(result);
    } catch (error) {
      console.error("Customer sync failed", error);
      res.status(500).json({ error: "Customer sync failed" });
    }
  }

  async syncCustomerMessages(_req: Request, res: Response): Promise<void> {
    try {
      const result = await this.syncService.syncCustomerMessages();
      res.status(200).json(result);
    } catch (error) {
      console.error("Customer message sync failed", error);
      res.status(500).json({ error: "Customer message sync failed" });
    }
  }
}
