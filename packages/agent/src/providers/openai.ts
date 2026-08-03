import { OpenAIClient, type OpenAICompletionModelName } from "@anvia/openai";
import { modelConfig } from "@repo/config";

export function createConfiguredModel() {
  if (modelConfig.provider !== "openai") {
    throw new Error(`Unsupported model provider: ${modelConfig.provider}.`);
  }
  if (!modelConfig.apiKey) {
    throw new Error("OPENAI_API_KEY is required to run the reseller order agent.");
  }

  const client = new OpenAIClient({
    apiKey: modelConfig.apiKey,
    ...(modelConfig.baseUrl ? { baseUrl: modelConfig.baseUrl } : {}),
  });
  return client.completionModel(modelConfig.model as OpenAICompletionModelName);
}
