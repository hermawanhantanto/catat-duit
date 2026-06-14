import type { Context } from "grammy";
import { parseTransaction } from "@/features/llm/services/parse-transaction";

const formatRupiah = (amount: number): string =>
  `Rp ${amount.toLocaleString("id-ID")}`;

/**
 * grammY handler for plain text messages. Calls the LLM parser and replies
 * with a readback of the parsed fields, or a clarification request when the
 * input is ambiguous. Swallows all errors so the webhook can still return 200.
 *
 * @param ctx - grammY context for the incoming text message.
 */
export async function handleTextMessage(ctx: Context): Promise<void> {
  const text = ctx.msg?.text ?? "";

  try {
    const result = await parseTransaction(text);

    if (!result.ok) {
      await ctx.reply(
        `I couldn't parse that. ${result.ambiguities.join(" ")}\n\n` +
          `Example: "lunch 15k"`,
      );
      return;
    }

    const { amount, date, category, description } = result.data;
    await ctx.reply(
      [
        `Description: ${description}`,
        `Amount: ${formatRupiah(amount as number)}`,
        `Date: ${date}`,
        `Category: ${category}`,
      ].join("\n"),
    );
  } catch (err) {
    console.error("parse-transaction failed", { text, err });
    await ctx.reply("Sorry, something went wrong. Please try again.");
  }
}
