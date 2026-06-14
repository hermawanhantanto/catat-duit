import type { Bot, Context } from "grammy";
import {
  getMostRecentActiveTransaction,
  softDeleteTransaction,
} from "@/features/transactions/services/transaction-service";
import { undoKeyboard } from "@/features/telegram/utils/confirmation-keyboard";

const formatRupiah = (amount: number): string =>
  `Rp ${amount.toLocaleString("id-ID")}`;

const formatDate = (date: Date): string => date.toISOString().slice(0, 10);

/**
 * grammY handler for the `/undo` slash command. Fetches the most recent
 * `active` transaction and replies with a readback + Yes,delete / Cancel
 * keyboard. If no active transaction exists, replies "Nothing to undo."
 *
 * Swallows all errors so the webhook can still return 200.
 *
 * @param ctx - grammY context for the incoming `/undo` message.
 */
export async function handleUndoCommand(ctx: Context): Promise<void> {
  try {
    const txn = await getMostRecentActiveTransaction();
    if (!txn) {
      await ctx.reply("Nothing to undo.");
      return;
    }

    await ctx.reply(
      [
        "Delete this transaction?",
        `Description: ${txn.description}`,
        `Amount: ${formatRupiah(txn.amount)}`,
        `Date: ${formatDate(txn.date)}`,
        `Category: ${txn.category}`,
      ].join("\n"),
      { reply_markup: undoKeyboard(txn.id) },
    );
  } catch (err) {
    console.error("undo command failed", err);
    await ctx.reply("Sorry, something went wrong. Please try again.");
  }
}

/**
 * Handle the user tapping **Yes, delete** on an /undo confirmation. Soft-
 * deletes the row (sets `status='deleted'`) and replies with a one-line
 * confirmation.
 *
 * Idempotent: a double-tap is a silent no-op — `softDeleteTransaction`
 * returns `false` on the second call because the row is no longer
 * `active`, and the handler clears the spinner without an extra message.
 *
 * @param ctx - grammY context for the `callback_query` event.
 */
export async function handleUndoConfirm(ctx: Context): Promise<void> {
  const match = ctx.match as RegExpMatchArray | null;
  const id = Number(match?.[1]);
  await ctx.answerCallbackQuery();
  if (!Number.isInteger(id) || id <= 0) return;

  const updated = await softDeleteTransaction(id);
  if (!updated) return;
  await ctx.editMessageReplyMarkup();
  await ctx.reply("Deleted ✓");
}

/**
 * Handle the user tapping **Cancel** on an /undo confirmation. Strips the
 * keyboard and replies "Kept." — no DB change, since the row stays
 * `active`.
 *
 * @param ctx - grammY context for the `callback_query` event.
 */
export async function handleUndoCancel(ctx: Context): Promise<void> {
  const match = ctx.match as RegExpMatchArray | null;
  const id = Number(match?.[1]);
  await ctx.answerCallbackQuery();
  if (!Number.isInteger(id) || id <= 0) return;

  await ctx.editMessageReplyMarkup();
  await ctx.reply("Kept.");
}

/**
 * Register the `bot.callbackQuery` filters for the /undo confirmation's
 * Yes,delete / Cancel buttons. The data prefix is `undo-yes:<id>` or
 * `undo-no:<id>` — distinct from the parse confirmation's `yes:<id>` /
 * `no:<id>` to avoid `handleConfirm` / `handleCancel` from intercepting
 * undo taps and calling the pending-row service functions on an `active`
 * row (which would no-op silently).
 *
 * The `/undo` slash command itself is registered in `bot.ts` alongside
 * `/start`, following the same pattern.
 *
 * @param bot - The grammY `Bot` instance from `bot.ts`.
 */
export function registerUndoHandlers(bot: Bot): void {
  bot.callbackQuery(/^undo-yes:(\d+)$/, handleUndoConfirm);
  bot.callbackQuery(/^undo-no:(\d+)$/, handleUndoCancel);
}
