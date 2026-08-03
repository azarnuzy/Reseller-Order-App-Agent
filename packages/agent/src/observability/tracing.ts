import {
  createPiiRedactor,
  DEFAULT_PATTERNS,
  langfuse,
  type LangfuseTracing,
  type LangfuseTracingOptions,
} from "@anvia/langfuse";
import type { AgentObserver, AgentTraceOptions } from "@anvia/core/observability";
import { langfuseConfig, modelConfig } from "@repo/config";

export const ORDER_AGENT_RELEASE = langfuseConfig.release;
export const ORDER_AGENT_USER_ID = "anonymous-user";

export type ResellerTraceContext = {
  evaluationCaseId?: string;
  evaluationRunId?: string;
  sessionId: string;
  step?: number;
};

let sharedTracing: LangfuseTracing | undefined;

const resellerRedactionPatterns = [
  ...DEFAULT_PATTERNS,
  { name: "password", regex: /\b(?:password|passwd|pwd)\s*[:=]\s*[^\s,;}]+/gi },
  { name: "ssn", regex: /\b\d{3}-\d{2}-\d{4}\b/g },
  { name: "macAddress", regex: /\b(?:[0-9a-f]{2}[:-]){5}[0-9a-f]{2}\b/gi },
  { name: "ipv6", regex: /\b(?:[0-9a-f]{1,4}:){2,7}[0-9a-f]{1,4}\b/gi },
  {
    name: "bankAccount",
    regex:
      /\b(?:iban|bank(?:\s+account)?|account(?:\s+number)?|rekening)\s*[:=#-]?\s*[a-z0-9 -]{6,34}\b/gi,
  },
  {
    name: "cryptoWallet",
    regex: /\b(?:0x[0-9a-f]{40}|bc1[ac-hj-np-z02-9]{11,71}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})\b/g,
  },
  { name: "cookie", regex: /\b(?:cookie|set-cookie)\s*[:=]\s*[^\r\n]+/gi },
  { name: "userAgent", regex: /\buser-agent\s*:\s*[^\r\n]+/gi },
];

export function createResellerTracing(options: LangfuseTracingOptions = {}) {
  return langfuse.create({
    baseUrl: langfuseConfig.baseUrl,
    environment: langfuseConfig.environment,
    publicKey: langfuseConfig.publicKey,
    redactInputs: "deep",
    redactOutputs: "deep",
    redaction: { patterns: resellerRedactionPatterns },
    release: ORDER_AGENT_RELEASE,
    secretKey: langfuseConfig.secretKey,
    serviceName: "reseller-order-agent",
    ...options,
  });
}

export function createResellerPiiRedactor() {
  return createPiiRedactor({ patterns: resellerRedactionPatterns });
}

export function getAgentTracing() {
  sharedTracing ??= createResellerTracing();
  return sharedTracing;
}

export function resellerTraceOptions(context: ResellerTraceContext): AgentTraceOptions {
  const evaluation = context.evaluationCaseId !== undefined;

  return {
    metadata: {
      anonymousUserId: ORDER_AGENT_USER_ID,
      environment: langfuseConfig.environment,
      ...(context.evaluationCaseId ? { evaluationCaseId: context.evaluationCaseId } : {}),
      ...(context.evaluationRunId ? { evaluationRunId: context.evaluationRunId } : {}),
      model: modelConfig.model,
      release: ORDER_AGENT_RELEASE,
      sessionId: context.sessionId,
      ...(context.step === undefined ? {} : { evaluationStep: context.step }),
    },
    name: evaluation ? `reseller-order-eval.${context.evaluationCaseId}` : "reseller-order.chat",
    sessionId: context.sessionId,
    tags: evaluation ? ["reseller-order", "evaluation"] : ["reseller-order", "conversation"],
    userId: ORDER_AGENT_USER_ID,
    version: ORDER_AGENT_RELEASE,
  };
}

export function createResellerTraceObserver(
  tracing: LangfuseTracing,
  context: ResellerTraceContext,
): AgentObserver {
  return {
    startRun(args) {
      const trusted = resellerTraceOptions(context);
      return tracing.startRun({
        ...args,
        trace: {
          ...args.trace,
          ...trusted,
          metadata: { ...args.trace?.metadata, ...trusted.metadata },
          tags: [...new Set([...(args.trace?.tags ?? []), ...(trusted.tags ?? [])])],
        },
      });
    },
  };
}

export function hasLangfuseCredentials() {
  return Boolean(langfuseConfig.publicKey && langfuseConfig.secretKey);
}

export async function flushAgentTracing() {
  await sharedTracing?.flush();
}

export async function shutdownAgentTracing() {
  const tracing = sharedTracing;
  sharedTracing = undefined;
  if (!tracing) return;
  await tracing.flush();
  await tracing.shutdown();
}
