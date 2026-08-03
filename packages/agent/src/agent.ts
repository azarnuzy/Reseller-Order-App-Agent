import { AgentBuilder, type AnyTool, type CompletionModel, type MemoryStore } from "@anvia/core";
import type { LangfuseTracing } from "@anvia/langfuse";
import type { AgentObserver } from "@anvia/core/observability";
import { BASE_INSTRUCTIONS } from "./prompts/base-instructions";
import { createResellerOrderTools } from "./tools";
import type { ResellerApiClient } from "./tools/reseller-api-client";

export const ORDER_AGENT_ID = "reseller-order-agent";
export const DEFAULT_MAX_TURNS = 12;

export type CreateResellerOrderAgentOptions = {
  additionalInstructions?: string[];
  agentId?: string;
  apiClient?: ResellerApiClient;
  maxTurns?: number;
  memory?: MemoryStore;
  model: CompletionModel;
  observers?: AgentObserver[];
  tracing?: LangfuseTracing;
  tools?: AnyTool[];
};

export function createResellerOrderAgent(options: CreateResellerOrderAgentOptions) {
  const tools =
    options.tools ?? (options.apiClient ? createResellerOrderTools(options.apiClient) : undefined);
  if (!tools) {
    throw new Error("createResellerOrderAgent requires apiClient or injected tools.");
  }

  const builder = new AgentBuilder(options.agentId ?? ORDER_AGENT_ID, options.model)
    .name("Reseller Order Assistant")
    .description("Browses the trusted catalog and prepares explicitly confirmed reseller orders.")
    .instructions(BASE_INSTRUCTIONS)
    .tools(tools)
    .defaultMaxTurns(options.maxTurns ?? DEFAULT_MAX_TURNS);

  if (options.memory) builder.memory(options.memory);
  if (options.tracing) builder.observe(options.tracing);
  for (const observer of options.observers ?? []) builder.observe(observer);
  for (const instruction of options.additionalInstructions ?? []) builder.instructions(instruction);

  return builder.build();
}
