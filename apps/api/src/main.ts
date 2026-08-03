import { serve } from "@hono/node-server";
import { shutdownAgentTracing } from "@repo/agent";
import { apiConfig, loggerConfig } from "@repo/config";
import { createLogger } from "@repo/logger";
import { ensureAnonymousUser } from "./anonymous-user";
import { app } from "./app";
import { prisma } from "./prisma";

const logger = createLogger({
  ...loggerConfig,
  service: "api",
});

await ensureAnonymousUser();

const server = serve(
  {
    fetch: app.fetch,
    port: apiConfig.port,
  },
  (info) => {
    logger.info({ port: info.port }, "API listening");
  },
);

let shuttingDown = false;

async function shutdown(signal: "SIGINT" | "SIGTERM") {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, "API shutting down");

  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  await Promise.all([shutdownAgentTracing(), prisma.$disconnect()]);
  logger.info("API shutdown complete");
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    void shutdown(signal).catch((error) => {
      logger.error({ error, signal }, "API graceful shutdown failed");
      process.exitCode = 1;
    });
  });
}
