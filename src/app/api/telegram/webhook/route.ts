import { bot } from "@/features/telegram/bot";

export const runtime = "nodejs";

const allowedChatId = process.env.WHITELISTED_CHAT_ID;
if (!allowedChatId) {
  throw new Error("WHITELISTED_CHAT_ID is not set");
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
    if (String(update.message?.chat?.id) !== allowedChatId) {
      return new Response("ok", { status: 200 });
    }
    await bot.init();
    await bot.handleUpdate(update);
  } catch (err) {
    console.error("telegram webhook error", err);
  }
  return new Response("ok", { status: 200 });
}
