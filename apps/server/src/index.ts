import { app } from "./app.js";
import { database } from "./database.js";

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

  const server = app.listen(8000, () => {
    console.info(`Server listening at port 8000`);
  });

  function shutdown(): void {
    console.info("Shutting down server...");
    server.close(async () => {
      await database.destroy();
      console.info("Server shut down.");
    });
  }

  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}

startServer();
