import type { AnyTool } from "@anvia/core";
import { createCatalogTools } from "./catalog-tools";
import { createDraftTools } from "./draft-tools";
import { createOrderTools } from "./order-tools";
import type { ResellerApiClient } from "./reseller-api-client";

export function createResellerOrderTools(client: ResellerApiClient): AnyTool[] {
  return [...createCatalogTools(client), ...createDraftTools(client), ...createOrderTools(client)];
}

export { ResellerApiClient, ResellerApiError } from "./reseller-api-client";
export type { ResellerApiClientOptions } from "./reseller-api-client";
