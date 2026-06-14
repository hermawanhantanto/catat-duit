import { bot } from "@/features/telegram/bot";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const update = await request.json();
    await bot.init();
    await bot.handleUpdate(update);
  } catch (err) {
    console.error("telegram webhook error", err);
  }
  return new Response("ok", { status: 200 });
}
