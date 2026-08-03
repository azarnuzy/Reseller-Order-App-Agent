import pino, { type Bindings, type Logger, type LoggerOptions } from "pino";

export type LogLevel = "fatal" | "error" | "warn" | "info" | "debug" | "trace" | "silent";

export type LoggerConfig = {
  environment: string;
  level: LogLevel;
  service: string;
};

export type TraceContext = {
  spanId?: string;
  traceFlags?: string;
  traceId?: string;
};

export type CreateLoggerOptions = LoggerConfig & {
  bindings?: Bindings;
  options?: LoggerOptions;
  traceContext?: TraceContext;
};

export const redactedLogPaths = [
  "authorization",
  "cookie",
  "password",
  "passwordHash",
  "req.headers.authorization",
  "req.headers.cookie",
  "request.headers.authorization",
  "request.headers.cookie",
  "*.authorization",
  "*.cookie",
  "*.password",
  "*.passwordHash",
];

export function createLogger({
  bindings,
  environment,
  level,
  options,
  service,
  traceContext,
}: CreateLoggerOptions): Logger {
  const { mixin, ...loggerOptions } = options ?? {};

  return pino({
    base: {
      environment,
      service,
      ...getTraceLogBindings(traceContext),
      ...bindings,
    },
    level,
    redact: {
      censor: "[redacted]",
      paths: redactedLogPaths,
    },
    ...(mixin ? { mixin } : {}),
    timestamp: pino.stdTimeFunctions.isoTime,
    ...loggerOptions,
  });
}

export function createChildLogger(logger: Logger, bindings: Bindings) {
  return logger.child(bindings);
}

export function createTraceLogger(logger: Logger, traceContext: TraceContext) {
  return logger.child(getTraceLogBindings(traceContext));
}

export function getTraceLogBindings(traceContext: TraceContext | undefined): Bindings {
  return {
    ...(traceContext?.traceId ? { trace_id: traceContext.traceId } : {}),
    ...(traceContext?.spanId ? { span_id: traceContext.spanId } : {}),
    ...(traceContext?.traceFlags ? { trace_flags: traceContext.traceFlags } : {}),
  };
}

export type { Logger };
