import { bot } from "@/features/telegram/bot";

export const runtime = "nodejs";

const allowedChatId = process.env.WHITELISTED_CHAT_ID;
if (!allowedChatId) {
  throw new Error("WHITELISTED_CHAT_ID is not set");
}

/**
 * Extract the originating chat id from any Telegram update type. `message`
 * covers free-text sends; `callback_query` covers inline-keyboard taps. Both
 * branches resolve to the same id in a private (1:1) chat, so either works
 * for the single-user whitelisted case.
 *
 * @param update - The raw Telegram update object.
 * @returns The chat id as a string, or `undefined` if the update type is unrecognised.
 */
function chatIdFromUpdate(update: {
  message?: { chat?: { id?: number | string } };
  edited_message?: { chat?: { id?: number | string } };
  callback_query?: {
    message?: { chat?: { id?: number | string } };
    from?: { id?: number | string };
  };
}): string | undefined {
  const id =
    update.message?.chat?.id ??
    update.edited_message?.chat?.id ??
    update.callback_query?.message?.chat?.id ??
    update.callback_query?.from?.id;
  return id === undefined ? undefined : String(id);
}

/**
 * Telegram webhook entry point.
 * Always returns 200 — non-2xx would trigger Telegram retries.
 *
 * @param request - The incoming webhook request from Telegram.
 * @returns A 200 response regardless of outcome.
 */
export async function POST(request: Request) {
  try {
    const update = await request.json();
    if (chatIdFromUpdate(update) !== allowedChatId) {
      return new Response("ok", { status: 200 });
    }
    await bot.init();
    await bot.handleUpdate(update);
  } catch (err) {
    console.error("telegram webhook error", err);
  }
  return new Response("ok", { status: 200 });
}
