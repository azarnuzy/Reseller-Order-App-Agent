import { serve } from "@hono/node-server";
import { apiConfig, loggerConfig } from "@repo/config";
import { createLogger } from "@repo/logger";
import { app } from "./app";

const logger = createLogger({
  ...loggerConfig,
  service: "api",
});

serve(
  {
    fetch: app.fetch,
    port: apiConfig.port,
  },
  (info) => {
    logger.info({ port: info.port }, "API listening");
  },
);
