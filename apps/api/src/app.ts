import { apiConfig } from "@repo/config";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { HttpError } from "./http-error";
import { auth } from "./modules/auth/auth";
import { type AuthVariables, loadAuthSession } from "./modules/auth/middleware";
import { chatSessionsRouter } from "./modules/chat-sessions/router";
import { draftsRouter } from "./modules/drafts/router";
import { ordersRouter } from "./modules/orders/router";
import { productsRouter } from "./modules/products/router";
import { profileRouter } from "./modules/profile/router";
import { storefrontRouter } from "./modules/storefront/router";

export const app = new Hono<{ Variables: AuthVariables }>()
  .use(
    "*",
    cors({
      allowHeaders: ["Content-Type", "Authorization"],
      allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      credentials: true,
      origin: (origin) => (apiConfig.clientOrigins.includes(origin) ? origin : null),
    }),
  )
  .use("*", loadAuthSession)
  .get("/health", (c) => {
    return c.json({ ok: true, service: "api" }, 200);
  })
  .get("/session", (c) => {
    const user = c.get("user");
    const session = c.get("session");

    if (!user || !session) {
      return c.json({ error: "unauthorized" }, 401);
    }

    return c.json({ session, user }, 200);
  })
  .on(["POST", "GET"], "/api/auth/*", (c) => {
    return auth.handler(c.req.raw);
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
