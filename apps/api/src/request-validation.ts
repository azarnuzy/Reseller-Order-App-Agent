import type { Context } from "hono";

type ValidationFailure = {
  success: boolean;
  error?: {
    issues?: Array<{ message?: string; path?: PropertyKey[] }>;
  };
};

export function invalidRequest(result: ValidationFailure, c: Context) {
  if (result.success) return;

  const issues = (result.error?.issues ?? []).map((issue) => ({
    message: issue.message ?? "Invalid value.",
    path: (issue.path ?? []).map(String),
  }));
  return c.json(
    {
      error: {
        code: "INVALID_REQUEST",
        details: { issues },
        message: "Request validation failed.",
      },
    },
    400,
  );
}
