import { InlineKeyboard } from "grammy";

/**
 * Inline keyboard shown under the parsed-transaction readback. The row id is
 * encoded in each button's `callback_data` so the handler can find the right
 * pending transaction without the user having to remember anything.
 *
 * @param pendingId - The autoincrement id of the pending `Transaction` row.
 * @returns A `grammy` `InlineKeyboard` ready for `reply_markup`.
 */
export function confirmationKeyboard(pendingId: number): InlineKeyboard {
  return new InlineKeyboard()
    .text("Yes", `yes:${pendingId}`)
    .text("No", `no:${pendingId}`);
}

/**
 * Inline keyboard for the `/undo` confirmation. Uses the `undo-yes:` /
 * `undo-no:` prefix so the regex matchers in `undo-handler.ts` can dispatch
 * to the soft-delete flow without colliding with the parse flow's
 * `yes:` / `no:` handlers from `confirmation-handler.ts`.
 *
 * @param transactionId - The autoincrement id of the active `Transaction` row.
 * @returns A `grammy` `InlineKeyboard` ready for `reply_markup`.
 */
export function undoKeyboard(transactionId: number): InlineKeyboard {
  return new InlineKeyboard()
    .text("Yes, delete", `undo-yes:${transactionId}`)
    .text("Cancel", `undo-no:${transactionId}`);
}
