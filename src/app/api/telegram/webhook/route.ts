import { bot } from "@/features/telegram/bot";

export const runtime = "nodejs";

const allowedChatId = process.env.WHITELISTED_CHAT_ID;
if (!allowedChatId) {
  throw new Error("WHITELISTED_CHAT_ID is not set");
}

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
