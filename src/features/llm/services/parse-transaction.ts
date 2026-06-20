import { generateText, Output } from 'ai';
import { getModel } from './llm';
import { buildParseTransactionPrompt } from '../utils/parse-transaction-prompt';
import { ParsedTransactionSchema, type ParsedTransaction } from '../types/transaction';
import type { ChatModelId } from '../types/llm';

const MODEL_ID: ChatModelId = 'deepseek-chat';

export type ParseResult = { ok: true; data: ParsedTransaction } | { ok: false; ambiguities: string[] } | { ok: false; error: unknown };

/**
 * Parse a free-text Indonesian message into a structured transaction.
 *
 * Uses AI SDK's `Output.object` to enforce the shape — malformed JSON
 * from the LLM throws rather than silently corrupting data. Ambiguity
 * is detected from null fields, not from LLM self-report.
 *
 * @param text - The user's free-text message.
 * @returns `{ ok: true, data }` on success, or `{ ok: false, ambiguities }` when input is unclear.
 */
export async function parseTransaction(text: string): Promise<ParseResult> {
  try {
    if (!text) {
      throw new Error('Text is missing!');
    }

    const { output } = await generateText({
      model: getModel(MODEL_ID),
      system: buildParseTransactionPrompt(),
      prompt: text,
      output: Output.object({ schema: ParsedTransactionSchema }),
    });

    const ambiguities: string[] = [];
    
    if (!Number(output.amount)) {
      ambiguities.push('amount is missing');
    }

    if (!output.description) {
      ambiguities.push('description is missing');
    }

    if (ambiguities.length > 0) {
      return { ok: false, ambiguities };
    }

    return {
      ok: true,
      data: {
        amount: output.amount,
        date: output.date,
        category: output.category,
        description: output.description,
      },
    };
  } catch (error) {
    console.log(error);
    return {
      ok: false,
      error,
    };
  }
}
