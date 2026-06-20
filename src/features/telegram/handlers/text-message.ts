import type { Context } from "grammy";
import { parseTransaction } from "@/features/llm/services/parse-transaction";
import { createPendingTransaction } from "@/features/transactions/services/transaction-service";
import { confirmationKeyboard } from "@/features/telegram/utils/confirmation-keyboard";

const formatRupiah = (amount: number): string =>
  `Rp ${amount.toLocaleString("id-ID")}`;

/**
 * grammY handler for plain text messages. Parses the input with the LLM,
 * then either:
 *   - asks the user to clarify when the input is ambiguous, or
 *   - inserts a `pending` row and replies with a readback + Yes/No keyboard.
 *
 * Swallows all errors so the webhook can still return 200.
 *
 * @param ctx - grammY context for the incoming text message.
 */
export async function handleTextMessage(ctx: Context): Promise<void> {
  const text = ctx.msg?.text ?? "";

  try {
    const result = await parseTransaction(text);

    if (!result.ok) {
      if ("ambiguities" in result) {
        await ctx.reply(
          `I couldn't parse that. ${result.ambiguities.join(" ")}\n\n` +
            `Example: "lunch 15k"`,
        );
      } else {
        await ctx.reply("Sorry, something went wrong. Please try again.");
      }
      return;
    }

    const { amount, date, category, description } = result.data;
    const pending = await createPendingTransaction({
      parsed: result.data,
      telegramMessageId: String(ctx.msg!.message_id),
      source: "text",
    });

    await ctx.reply(
      [
        `Description: ${description}`,
        `Amount: ${formatRupiah(amount as number)}`,
        `Date: ${date}`,
        `Category: ${category}`,
      ].join("\n"),
      { reply_markup: confirmationKeyboard(pending.id) },
    );
  } catch (err) {
    console.error("parse-transaction failed", { text, err });
    await ctx.reply("Sorry, something went wrong. Please try again.");
  }
}
