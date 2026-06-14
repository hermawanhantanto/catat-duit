import { Bot } from "grammy";
import { handleTextMessage } from "./handlers/text-message";
import { registerConfirmationHandlers } from "./handlers/confirmation-handler";

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  throw new Error("TELEGRAM_BOT_TOKEN is not set");
}

export const bot = new Bot(token);

bot.init().catch((err) => {
  console.error("Telegram bot init failed:", err);
});

bot.command("start", (ctx) => ctx.reply("Hello from catat-duit."));
registerConfirmationHandlers(bot);
bot.on("message:text", handleTextMessage);
