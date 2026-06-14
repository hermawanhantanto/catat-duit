import { z } from "zod";

/**
 * Allowed transaction categories. Embedded in the parser prompt and used as
 * the Zod enum for the LLM's `category` field.
 */
export const CATEGORIES = [
  "Food",
  "Transport",
  "Shopping",
  "Bills",
  "Health",
  "Entertainment",
  "Salary",
  "Other",
] as const;

export type Category = (typeof CATEGORIES)[number];

/** YYYY-MM-DD. The parser always returns today's date when not specified. */
export const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Shape the LLM must return from `parseTransaction`. `amount` and
 * `description` are nullable on purpose: a null signals an ambiguous input
 * and is reported back to the user as a missing field.
 */
export const ParsedTransactionSchema = z.object({
  amount: z.number().int().nullable(),
  date: z.string().regex(DATE_REGEX),
  category: z.enum(CATEGORIES),
  description: z.string().nullable(),
});

export type ParsedTransaction = z.infer<typeof ParsedTransactionSchema>;
