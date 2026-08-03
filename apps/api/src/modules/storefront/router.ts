import { Hono } from "hono";
import { getStorefront } from "./service";

export const storefrontRouter = new Hono().get("/", async (c) => {
  return c.json({ store: await getStorefront() }, 200);
});
