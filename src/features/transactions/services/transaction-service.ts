import { prisma } from "@/lib/prisma";
import { Prisma, type Source, type Transaction } from "@/generated/prisma/client";
import type { ParsedTransaction } from "@/features/llm/types/transaction";

/**
 * Insert a fresh `pending` transaction from a parser result. Idempotent on
 * `telegramMessageId`: if a `pending` row for the same message already exists
 * (because Telegram redelivered the update), the existing row is returned
 * instead of throwing. The caller can reply with the same confirmation.
 *
 * @param input.parsed - The LLM-extracted transaction fields.
 * @param input.telegramMessageId - The user's incoming message id; unique-constrained.
 * @param input.source - Where the transaction came from (text or photo).
 * @returns The newly created row, or the pre-existing pending row for the same `telegramMessageId`.
 */
export async function createPendingTransaction(input: {
  parsed: ParsedTransaction;
  telegramMessageId: string;
  source: Source;
}): Promise<Transaction> {
  try {
    return await prisma.transaction.create({
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
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      const existing = await prisma.transaction.findFirst({
        where: {
          telegramMessageId: input.telegramMessageId,
          status: "pending",
        },
      });
      if (existing) return existing;
    }
    throw err;
  }
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

/**
 * Fetch the most recent `active` transaction, used by the `/undo` command
 * to preview what is about to be deleted. Tie-breaks on `id desc` for
 * determinism when two rows share a `createdAt` (same millisecond insert).
 *
 * @returns The newest `active` row, or `null` when none exists.
 */
export async function getMostRecentActiveTransaction(): Promise<Transaction | null> {
  return prisma.transaction.findFirst({
    where: { status: "active" },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });
}

/**
 * Soft-delete an `active` row. Idempotent: returns `false` when the row is
 * missing or no longer `active` (already soft-deleted, or never confirmed
 * from `pending`). Mirrors `cancelPendingTransaction` but for the `/undo`
 * flow, where the starting state is `active` rather than `pending`.
 *
 * @param id - The transaction id from the `/undo` confirmation's callback data.
 * @returns `true` when exactly one row was updated, `false` otherwise.
 */
export async function softDeleteTransaction(id: number): Promise<boolean> {
  const result = await prisma.transaction.updateMany({
    where: { id, status: "active" },
    data: { status: "deleted" },
  });
  return result.count > 0;
}
