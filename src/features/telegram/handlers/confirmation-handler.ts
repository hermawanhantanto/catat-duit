import type { Bot, Context } from "grammy";
import {
  cancelPendingTransaction,
  confirmPendingTransaction,
} from "@/features/transactions/services/transaction-service";

/**
 * Handle the user tapping **Yes** on a confirmation button. Flips the row
 * from `pending` to `active` and replies with a one-line confirmation.
 *
 * Idempotent: a double-tap (or a tap on an already-cancelled row) is a silent
 * no-op — the service returns `false`, the handler clears the spinner, and
 * does not post an extra message.
 *
 * @param ctx - grammY context for the `callback_query` event.
 */
export async function handleConfirm(ctx: Context): Promise<void> {
  const match = ctx.match as RegExpMatchArray | null;
  const id = Number(match?.[1]);
  await ctx.answerCallbackQuery();
  if (!Number.isInteger(id) || id <= 0) return;

  const updated = await confirmPendingTransaction(id);
  if (!updated) return;
  await ctx.editMessageReplyMarkup();
  await ctx.reply("Saved ✓");
}

/**
 * Handle the user tapping **No** on a confirmation button. Soft-deletes the
 * row (sets `status='deleted'`) and replies with a cancellation line.
 *
 * Idempotent for the same reason as `handleConfirm`.
 *
 * @param ctx - grammY context for the `callback_query` event.
 */
export async function handleCancel(ctx: Context): Promise<void> {
  const match = ctx.match as RegExpMatchArray | null;
  const id = Number(match?.[1]);
  await ctx.answerCallbackQuery();
  if (!Number.isInteger(id) || id <= 0) return;

  const updated = await cancelPendingTransaction(id);
  if (!updated) return;
  await ctx.editMessageReplyMarkup();
  await ctx.reply("Cancelled.");
}

/**
 * Register the `bot.callbackQuery` filters for the Yes / No buttons.
 * The data prefix is `yes:<id>` or `no:<id>`, set by `confirmationKeyboard`.
 *
 * @param bot - The grammY `Bot` instance from `bot.ts`.
 */
export function registerConfirmationHandlers(bot: Bot): void {
  bot.callbackQuery(/^yes:(\d+)$/, handleConfirm);
  bot.callbackQuery(/^no:(\d+)$/, handleCancel);
}
