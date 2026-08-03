export type ApiErrorCode =
  | "CONFIRMATION_REQUIRED"
  | "CUSTOMER_DATA_INCOMPLETE"
  | "DRAFT_NOT_FOUND"
  | "DRAFT_VERSION_CONFLICT"
  | "IDEMPOTENCY_CONFLICT"
  | "INSUFFICIENT_STOCK"
  | "INTERNAL_ERROR"
  | "INVALID_REQUEST"
  | "MINIMUM_ORDER_NOT_MET"
  | "ORDER_NOT_FOUND"
  | "PRODUCT_NOT_FOUND"
  | "PRODUCT_NOT_ORDERABLE"
  | "PRODUCT_OUT_OF_STOCK"
  | "SESSION_NOT_FOUND";

export class HttpError extends Error {
  constructor(
    readonly status: 400 | 404 | 409 | 410 | 422 | 500,
    readonly code: ApiErrorCode,
    message: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "HttpError";
  }
}
