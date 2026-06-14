import { Bot } from "grammy";
import { handleTextMessage } from "./handlers/text-message";
import { registerConfirmationHandlers } from "./handlers/confirmation-handler";
import {
  handleUndoCommand,
  registerUndoHandlers,
} from "./handlers/undo-handler";

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  throw new Error("TELEGRAM_BOT_TOKEN is not set");
}

export const bot = new Bot(token);

bot.init().catch((err) => {
  console.error("Telegram bot init failed:", err);
});

bot.command("start", (ctx) => ctx.reply("Hello from catat-duit."));
bot.command("undo", handleUndoCommand);
registerConfirmationHandlers(bot);
registerUndoHandlers(bot);
bot.on("message:text", handleTextMessage);
