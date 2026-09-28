import { app, syncService } from "./app.js";
import { database } from "./database.js";
import { startSyncJob } from "./jobs/sync.job.js";
import { posthogClient } from "./posthog.js";

async function startServer(): Promise<void> {
  try {
    await database.initialize();
    console.info(`✅ DB Connection Success`);
  } catch (error) {
    console.error(
      "Unable to connect to PostgreSQL. Check if PostgreSQL is running or not. The server will not start.",
    );
    process.exitCode = 1;
    return;
  }

  const syncTask = startSyncJob(syncService);
  console.info("Customer sync Job registered");

  const server = app.listen(8000, () => {
    console.info(`Server listening at port 8000`);
  });

  function shutdown(): void {
    console.info("Shutting down server...");
    syncTask.stop();
    server.close(async () => {
      try {
        await posthogClient.shutdown();
      } catch (error) {
        console.error("Unable to shut down the PostHog client cleanly.", error);
      } finally {
        await database.destroy();
        console.info("Server shut down.");
      }
    });
  }

  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}

startServer();
