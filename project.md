# Problem
Traditional financial tracker apps for personal use are too slow and stiff. They require filling in rigid fields (amount, category, total, etc.) and feel like work. I want a financial tracker that is easy, fast, and flexible — usable anywhere on my laptop or phone. I am too lazy to track finances in a spreadsheet.

# Solution
A personal web app that stores my financial data, with Telegram as the primary input channel. Two ways to add a transaction:
- Free-text chat: I type something like "lunch 15k", the LLM parses it, the bot shows what it understood, and saves on my confirmation.
- Invoice photo: I send a photo, the LLM extracts line items and total, the bot shows the extracted data for my confirmation.

I can ask questions about my financial data ("biggest expense this month") and export to CSV/Excel from the web app.

# Feature
- Auth: single user, web password, telegram bot whitelisted to one `chat_id`
- Free-text input via Telegram with confirmation step
- Photo invoice extraction via Telegram with confirmation step
- `/undo` to delete the last transaction
- Idempotency via Telegram `message_id` (no duplicates from network retries)
- Hardcoded category list in the LLM prompt
- Q&A / report generation over stored data
- Export to CSV/Excel
- IDR only, single timezone (Asia/Jakarta)

# Out of scope (MVP)
Multi-account, recurring detection, search, edit-by-ID, photo storage, category management UI, multi-user, self-hosted LLM, budgets, anomaly alerts.
