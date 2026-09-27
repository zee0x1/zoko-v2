import { SyncService } from "../services/sync.service.js";
import cron, { type ScheduledTask } from "node-cron";

export function startSyncJob(syncService: SyncService): ScheduledTask {
  return cron.schedule(
    "*/6 * * * *",
    async () => {
      const startTime = Date.now();

      try {
        console.info("Zoko customers sync started");

        const customers = await syncService.syncCustomers();
        const messages = await syncService.syncCustomerMessages();
        console.info("Scheduled Zoko sync completed", {
          customers,
          messages,
          durationMs: Date.now() - startTime,
        });
      } catch (error) {
        console.error("Zoko customer sync failed", error);
      }
    },
    {
      name: "zoko-customers-sync",
      noOverlap: true,
    },
  );
}
