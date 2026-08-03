import { z } from "zod";

export type RuntimeEnv = "development" | "test" | "production";
export type LogLevel = "fatal" | "error" | "warn" | "info" | "debug" | "trace" | "silent";
export type ModelProvider = "openai";

const defaultClientOrigins = "http://localhost:3000";
const defaultDatabaseUrl =
  "postgresql://postgres:postgres@localhost:15432/reseller_order?schema=public";
const defaultApiUrl = "http://localhost:8000";
const defaultPlatformUrl = "http://localhost:3000";

const runtimeEnvSchema = z.enum(["development", "test", "production"]).default("development");
const logLevelSchema = z
  .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
  .default("info");
const modelProviderSchema = z.enum(["openai"]).default("openai");
const optionalStringSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().optional(),
);
const serverEnvSchema = z
  .object({
    NODE_ENV: runtimeEnvSchema,
    API_PORT: z.coerce.number().int().positive().default(8000),
    API_URL: z.string().trim().url().default(defaultApiUrl),
    CLIENT_ORIGINS: z.string().trim().min(1).default(defaultClientOrigins),
    DATABASE_URL: z.string().trim().min(1).default(defaultDatabaseUrl),
    INTERNAL_AGENT_API_URL: z.string().trim().url().default(defaultApiUrl),
    LANGFUSE_BASE_URL: z.string().trim().url().default("https://cloud.langfuse.com"),
    LANGFUSE_PUBLIC_KEY: optionalStringSchema,
    LANGFUSE_SECRET_KEY: optionalStringSchema,
    LOG_LEVEL: logLevelSchema,
    MODEL_NAME: z.string().trim().min(1).default("gpt-4.1-mini"),
    MODEL_PROVIDER: modelProviderSchema,
    OPENAI_API_KEY: optionalStringSchema,
    OPENAI_BASE_URL: optionalStringSchema.pipe(z.string().url().optional()),
    PLATFORM_URL: z.string().trim().url().default(defaultPlatformUrl),
  })
  .superRefine((env, context) => {
    if (env.NODE_ENV !== "production") {
      return;
    }

    for (const [key, value] of [
      ["OPENAI_API_KEY", env.OPENAI_API_KEY],
      ["LANGFUSE_PUBLIC_KEY", env.LANGFUSE_PUBLIC_KEY],
      ["LANGFUSE_SECRET_KEY", env.LANGFUSE_SECRET_KEY],
    ] as const) {
      if (!value) {
        context.addIssue({
          code: "custom",
          message: `${key} is required in production.`,
          path: [key],
        });
      }
    }
  });

export function parseServerEnv(environment: NodeJS.ProcessEnv) {
  return serverEnvSchema.parse(environment);
}

export const env = parseServerEnv(process.env);

export const appConfig = {
  nodeEnv: env.NODE_ENV,
  isProduction: env.NODE_ENV === "production",
} as const;

export const apiConfig = {
  publicUrl: env.API_URL,
  port: env.API_PORT,
  clientOrigins: parseCsv(env.CLIENT_ORIGINS),
} as const;

export const databaseConfig = {
  url: env.DATABASE_URL,
} as const;

export const agentApiConfig = {
  internalUrl: env.INTERNAL_AGENT_API_URL,
} as const;

export const loggerConfig = {
  environment: env.NODE_ENV,
  level: env.LOG_LEVEL,
} as const;

export const langfuseConfig = {
  baseUrl: env.LANGFUSE_BASE_URL,
  environment: env.NODE_ENV,
  publicKey: env.LANGFUSE_PUBLIC_KEY,
  secretKey: env.LANGFUSE_SECRET_KEY,
} as const;

export const modelConfig = {
  apiKey: env.OPENAI_API_KEY,
  baseUrl: env.OPENAI_BASE_URL,
  model: env.MODEL_NAME,
  provider: env.MODEL_PROVIDER as ModelProvider,
} as const;

export const platformConfig = {
  url: env.PLATFORM_URL,
} as const;

function parseCsv(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
