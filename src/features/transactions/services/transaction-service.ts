import { prisma } from "@/lib/prisma";
import type { Source, Transaction } from "@/generated/prisma/client";
import type { ParsedTransaction } from "@/features/llm/types/transaction";

/**
 * Insert a fresh `pending` transaction from a parser result. Called by the
 * Telegram handler after a successful free-text parse.
 *
 * @param input.parsed - The LLM-extracted transaction fields.
 * @param input.telegramMessageId - The user's incoming message id; unique-constrained.
 * @param input.source - Where the transaction came from (text or photo).
 * @returns The newly created row, including its autoincrement id.
 */
export async function createPendingTransaction(input: {
  parsed: ParsedTransaction;
  telegramMessageId: string;
  source: Source;
}): Promise<Transaction> {
  return prisma.transaction.create({
    data: {
      amount: input.parsed.amount ?? 0,
      description: input.parsed.description ?? "",
      category: input.parsed.category,
      date: new Date(`${input.parsed.date}T00:00:00Z`),
      telegramMessageId: input.telegramMessageId,
      source: input.source,
      status: "pending",
    },
  });
}

/**
 * Flip a `pending` row to `active`. Idempotent: returns `false` when the row
 * is missing or no longer `pending` (already confirmed, cancelled, or never
 * existed) so the caller can treat a double-tap as a silent no-op.
 *
 * Uses `updateMany` (returns `{ count }`) rather than `update` (throws
 * P2025) so a no-match is a normal control-flow signal, not an error.
 *
 * @param id - The transaction id from the confirmation button's callback data.
 * @returns `true` when exactly one row was updated, `false` otherwise.
 */
export async function confirmPendingTransaction(id: number): Promise<boolean> {
  const result = await prisma.transaction.updateMany({
    where: { id, status: "pending" },
    data: { status: "active" },
  });
  return result.count > 0;
}

/**
 * Soft-delete a `pending` row. Idempotent: returns `false` when the row is
 * missing or no longer `pending`.
 *
 * @param id - The transaction id from the confirmation button's callback data.
 * @returns `true` when exactly one row was updated, `false` otherwise.
 */
export async function cancelPendingTransaction(id: number): Promise<boolean> {
  const result = await prisma.transaction.updateMany({
    where: { id, status: "pending" },
    data: { status: "deleted" },
  });
  return result.count > 0;
}
