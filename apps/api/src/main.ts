import { serve } from "@hono/node-server";
import { apiConfig, loggerConfig } from "@repo/config";
import { createLogger } from "@repo/logger";
import { ensureAnonymousUser } from "./anonymous-user";
import { app } from "./app";

const logger = createLogger({
  ...loggerConfig,
  service: "api",
});

await ensureAnonymousUser();

serve(
  {
    fetch: app.fetch,
    port: apiConfig.port,
  },
  (info) => {
    logger.info({ port: info.port }, "API listening");
  },
);
