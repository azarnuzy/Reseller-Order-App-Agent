import { apiConfig } from "@repo/config";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { HttpError } from "./http-error";
import { chatSessionsRouter } from "./modules/chat-sessions/router";
import { draftsRouter } from "./modules/drafts/router";
import { ordersRouter } from "./modules/orders/router";
import { productsRouter } from "./modules/products/router";
import { profileRouter } from "./modules/profile/router";
import { storefrontRouter } from "./modules/storefront/router";

export const app = new Hono()
  .use(
    "*",
    cors({
      allowHeaders: ["Content-Type"],
      allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      origin: (origin) => (apiConfig.clientOrigins.includes(origin) ? origin : null),
    }),
  )
  .get("/health", (c) => {
    return c.json({ ok: true, service: "api" }, 200);
  })
  .route("/profile", profileRouter)
  .route("/api/storefront", storefrontRouter)
  .route("/api", productsRouter)
  .route("/api/chat/sessions", chatSessionsRouter)
  .route("/api/chat/sessions", draftsRouter)
  .route("/api/chat/sessions", ordersRouter)
  .notFound((c) => {
    return c.json({ error: { code: "NOT_FOUND", message: "Route was not found." } }, 404);
  })
  .onError((error, c) => {
    if (error instanceof HttpError) {
      return c.json(
        {
          error: {
            code: error.code,
            ...(error.details ? { details: error.details } : {}),
            message: error.message,
          },
        },
        error.status,
      );
    }

    return c.json(
      { error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred." } },
      500,
    );
  });

export type AppType = typeof app;
