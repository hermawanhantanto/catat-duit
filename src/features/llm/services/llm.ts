import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModel } from "ai";
import type { ChatModelId } from "@/features/llm/types/llm";

const apiKey = process.env.LLM_API_KEY;
if (!apiKey) {
  throw new Error("LLM_API_KEY is not set");
}

const baseURL = process.env.LLM_BASE_URL ?? "https://api.minimax.chat/v1";

const provider = createOpenAICompatible({
  name: "minimax",
  apiKey,
  baseURL,
});

/**
 * Resolve a chat model by id. Centralized so the rest of the codebase
 * never touches the provider config or env vars directly.
 *
 * @param id - The model identifier from `ChatModelId`.
 * @returns A `LanguageModel` instance ready for `generateText` / `streamText`.
 */
export function getModel(id: ChatModelId): LanguageModel {
  return provider(id);
}
