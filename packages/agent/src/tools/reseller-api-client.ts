import { z } from "zod";
import type {
  AddDraftItemInput,
  AvailabilityInput,
  RankingInput,
  RecommendationInput,
  SaveCustomerDataInput,
  SearchProductsInput,
  UpdateDraftItemInput,
} from "./tool-schemas";
import { apiErrorCodeSchema } from "./tool-schemas";

type TrustedHeaderValues = Headers | Record<string, string>;
type TrustedHeaders =
  | TrustedHeaderValues
  | (() => TrustedHeaderValues | Promise<TrustedHeaderValues>);

export type ResellerApiClientOptions = {
  baseUrl: string;
  fetch?: typeof fetch;
  headers?: TrustedHeaders;
  sessionId: string;
  timeoutMs?: number;
};

const apiErrorEnvelopeSchema = z.object({
  error: z.object({
    code: z.string(),
    details: z.record(z.string(), z.unknown()).optional(),
    message: z.string(),
  }),
});

export class ResellerApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: z.output<typeof apiErrorCodeSchema>,
    message: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ResellerApiError";
  }
}

export class ResellerApiClient {
  readonly #baseUrl: URL;
  readonly #fetch: typeof fetch;
  readonly #headers?: TrustedHeaders;
  readonly #sessionId: string;
  readonly #timeoutMs: number;

  constructor(options: ResellerApiClientOptions) {
    this.#baseUrl = new URL(ensureTrailingSlash(options.baseUrl));
    this.#fetch = options.fetch ?? globalThis.fetch;
    this.#headers = options.headers;
    this.#sessionId = options.sessionId;
    this.#timeoutMs = options.timeoutMs ?? 15_000;
  }

  getStoreProfile() {
    return this.#request("api/storefront");
  }

  createChatSession() {
    return this.#request("api/chat/sessions", { method: "POST" });
  }

  searchProducts(input: SearchProductsInput) {
    return this.#request("api/products", { query: input });
  }

  getProductDetail(productId: string) {
    return this.#request(`api/products/${encodeURIComponent(productId)}`);
  }

  checkProductAvailability(input: AvailabilityInput) {
    return this.#request(`api/products/${encodeURIComponent(input.productId)}/availability`, {
      query: { quantity: input.quantity },
    });
  }

  recommendProducts(input: RecommendationInput) {
    return this.#request("api/product-recommendations", { query: input });
  }

  getTopProducts(input: RankingInput) {
    return this.#request("api/product-rankings", { query: input });
  }

  listCategories() {
    return this.#request("api/categories");
  }

  getActiveDraft() {
    return this.#request(`${this.#sessionPath()}/draft`);
  }

  addDraftItem(input: AddDraftItemInput) {
    return this.#request(`${this.#sessionPath()}/draft/items`, { body: input, method: "POST" });
  }

  updateDraftItem(input: UpdateDraftItemInput) {
    return this.#request(`${this.#sessionPath()}/draft/items/${encodeURIComponent(input.itemId)}`, {
      body: { quantity: input.quantity },
      method: "PATCH",
    });
  }

  removeDraftItem(itemId: string) {
    return this.#request(`${this.#sessionPath()}/draft/items/${encodeURIComponent(itemId)}`, {
      method: "DELETE",
    });
  }

  saveCustomerData(input: SaveCustomerDataInput) {
    return this.#request(`${this.#sessionPath()}/draft/customer`, { body: input, method: "PUT" });
  }

  getLatestCustomerData() {
    return this.#request(`${this.#sessionPath()}/customer/latest`);
  }

  validateDraft() {
    return this.#request(`${this.#sessionPath()}/draft/validate`, { method: "POST" });
  }

  getOrderSummary() {
    return this.#request(`${this.#sessionPath()}/draft/summary`, { method: "POST" });
  }

  cancelDraft() {
    return this.#request(`${this.#sessionPath()}/draft`, { method: "DELETE" });
  }

  confirmOrder(draftVersion: number) {
    return this.#request(`${this.#sessionPath()}/orders`, {
      body: { draftVersion },
      method: "POST",
    });
  }

  getOrder(orderNumber: string) {
    return this.#request(`${this.#sessionPath()}/orders/${encodeURIComponent(orderNumber)}`);
  }

  #sessionPath() {
    return `api/chat/sessions/${encodeURIComponent(this.#sessionId)}`;
  }

  async #request(
    path: string,
    options: {
      body?: unknown;
      method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
      query?: Record<string, unknown>;
    } = {},
  ): Promise<unknown> {
    const url = new URL(path, this.#baseUrl);
    appendQuery(url, options.query);
    const headers = new Headers(
      typeof this.#headers === "function" ? await this.#headers() : this.#headers,
    );
    if (options.body !== undefined) headers.set("Content-Type", "application/json");

    let response: Response;
    try {
      response = await this.#fetch(url, {
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
        headers,
        method: options.method ?? "GET",
        signal: AbortSignal.timeout(this.#timeoutMs),
      });
    } catch {
      throw new ResellerApiError(
        503,
        "INTERNAL_ERROR",
        "The ordering service is temporarily unavailable.",
      );
    }

    const payload = await readJson(response);
    if (!response.ok) {
      const parsed = apiErrorEnvelopeSchema.safeParse(payload);
      const code = parsed.success
        ? (apiErrorCodeSchema.safeParse(parsed.data.error.code).data ?? "INTERNAL_ERROR")
        : "INTERNAL_ERROR";
      throw new ResellerApiError(
        response.status,
        code,
        parsed.success ? parsed.data.error.message : "The ordering request failed.",
        parsed.success ? parsed.data.error.details : undefined,
      );
    }
    return payload;
  }
}

export async function executeResellerApiCall<DataSchema extends z.ZodType>(
  dataSchema: DataSchema,
  operation: () => Promise<unknown>,
) {
  try {
    return { data: dataSchema.parse(await operation()), ok: true as const };
  } catch (error) {
    if (error instanceof ResellerApiError) {
      return {
        error: {
          code: error.code,
          ...(error.details ? { details: error.details } : {}),
          message: error.message,
          retryable: error.status >= 500,
        },
        ok: false as const,
      };
    }
    return {
      error: {
        code: "INTERNAL_ERROR" as const,
        message: "The ordering service returned data in an unexpected format.",
        retryable: false,
      },
      ok: false as const,
    };
  }
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    if (!response.ok) return undefined;
    throw new ResellerApiError(
      502,
      "INTERNAL_ERROR",
      "The ordering service returned invalid data.",
    );
  }
}

function appendQuery(url: URL, query?: Record<string, unknown>) {
  if (!query) return;
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined) continue;
    url.searchParams.set(key, Array.isArray(value) ? value.join(",") : String(value));
  }
}

function ensureTrailingSlash(value: string) {
  return value.endsWith("/") ? value : `${value}/`;
}
