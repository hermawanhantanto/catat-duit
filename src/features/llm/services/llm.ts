import { minimax } from "vercel-minimax-ai-provider";
import type { LanguageModel } from "ai";
import type { ChatModelId } from "@/features/llm/types/llm";

const apiKey = process.env.MINIMAX_API_KEY;
if (!apiKey) {
  throw new Error("MINIMAX_API_KEY is not set");
}

/**
 * Resolve a chat model by id. Centralized so the rest of the codebase
 * never touches the provider config or env vars directly.
 *
 * @param id - The model identifier from `ChatModelId`.
 * @returns A `LanguageModel` instance ready for `generateText` / `streamText`.
 */
export function getModel(id: ChatModelId): LanguageModel {
  return minimax(id);
}
