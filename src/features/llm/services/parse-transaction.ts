import { generateText, Output } from "ai";
import { getModel } from "./llm";
import {
  CATEGORIES,
  ParsedTransactionSchema,
  type ParsedTransaction,
} from "../types/transaction";
import type { ChatModelId } from "../types/llm";

const MODEL_ID: ChatModelId = "MiniMax-M2.7";

export type ParseResult =
  | { ok: true; data: ParsedTransaction }
  | { ok: false; ambiguities: string[] };

const SYSTEM_PROMPT_TEMPLATE = `You are a transaction parser for an Indonesian personal finance app.
Extract a single transaction from the user's free-text input.

Rules:
- Currency: IDR. Convert informal amounts to integers: 15k=15000, 20rb=20000, 1.5jt=1500000, 2juta=2000000.
- Date: YYYY-MM-DD. Resolve relative dates against "today" passed below. "kemarin" = today - 1 day. "lusa" = today + 2. Default to today.
- Category: pick the best fit from the allowed list. Default to "Other" if unclear.
- Description: short, lowercase, in the original language.
- If the input is NOT a transaction (greeting, question, gibberish) OR is missing critical info, set amount and/or description to null.
- Today (Asia/Jakarta): {today}
- Allowed categories: {categories}`;

/** Returns today's date in Asia/Jakarta as YYYY-MM-DD, for relative-date resolution. */
function todayInJakarta(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  if (!year || !month || !day) {
    throw new Error("Failed to compute today's date in Asia/Jakarta");
  }
  return `${year}-${month}-${day}`;
}

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
  const system = SYSTEM_PROMPT_TEMPLATE.replace(
    "{today}",
    todayInJakarta(),
  ).replace("{categories}", CATEGORIES.join(", "));

  const { output } = await generateText({
    model: getModel(MODEL_ID),
    system,
    prompt: text,
    output: Output.object({ schema: ParsedTransactionSchema }),
  });

  const ambiguities: string[] = [];
  if (output.amount === null) ambiguities.push("amount is missing");
  if (output.description === null) ambiguities.push("description is missing");

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
}
