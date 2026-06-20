import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { CATEGORIES } from "../types/transaction";
import { PARSE_TRANSACTION_PROMPT_TEMPLATE } from "../prompts/parse-transaction";

dayjs.extend(utc);
dayjs.extend(timezone);

const JAKARTA_TIMEZONE = "Asia/Jakarta";

/**
 * Render the parse-transaction system prompt with today's date (Asia/Jakarta)
 * and the allowed category list substituted in.
 *
 * @returns The fully rendered prompt string, ready to pass to the LLM as `system`.
 */
export function buildParseTransactionPrompt(): string {
  const today = dayjs().tz(JAKARTA_TIMEZONE).format("YYYY-MM-DD");
  return PARSE_TRANSACTION_PROMPT_TEMPLATE.replace(
    "{today}",
    today,
  ).replace("{categories}", CATEGORIES.join(", "));
}
