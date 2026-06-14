# Implementation Plan

## Before you start
You'll need accounts and credentials for:
- GitHub (for Railway deploy)
- Railway (account + project, free tier works)
- Telegram — create a bot via `@BotFather`, save the token, DM `@userinfobot` to get your `chat_id`
- Anthropic or OpenAI — LLM API key, vision-capable model (Claude Sonnet or GPT-4o)
- Vercel AI SDK works with both; pick one when you wire the parser

## Phase 1 — Foundation
Project scaffold, data model, auth, deploy target.

- [x] **1.1 Initialize Next.js with Bun**
  `bun create next-app` with TypeScript, App Router, Tailwind, `src/` dir, ESLint.
  - *Verify:* `bun dev` serves localhost:3000, `bun run build` succeeds, `bun run lint` clean.

- [x] **1.2 Configure Tailwind v4 + shadcn/ui**
  Install via the v4 PostCSS pattern, run `bunx shadcn@latest init`.
  - *Verify:* A test shadcn component (e.g. Button) renders with correct styles in a page.

- [x] **1.3 Define Prisma schema**
  Model: `Transaction { id, amount (Int), description, category, date, telegramMessageId?, source (text|photo), groupId?, createdAt, updatedAt }`. Unique index on `telegramMessageId`. Run `bunx prisma migrate dev`.
  - *Verify:* `bunx prisma studio` shows the table, can create + read a row.

- [x] **1.4 Set up Better Auth (single user)**
  Install, configure email+password, seed one user. Add sign-in / sign-out pages.
  - *Verify:* Sign in at `/signin` with seeded credentials redirects to `/`. Sign out works.

- [ ] **1.5 Deploy empty app to Railway**
  Create Railway project, add Postgres plugin, set `DATABASE_URL`, push initial commit, get the public URL.
  - *Verify:* `https://<railway-url>/` returns 200. Postgres is reachable from the app.

## Phase 2 — Telegram bot skeleton
Bot webhook, whitelisting, message receipt.

- [x] **2.1 Create grammY webhook handler**
  Route handler at `app/api/telegram/webhook/route.ts` that constructs a `Bot` from `TELEGRAM_BOT_TOKEN` and feeds updates to it.
  - *Verify:* Send `/start` to the bot, see a reply.

- [x] **2.2 Whitelist chat_id**
  Read `WHITELISTED_CHAT_ID` from env. If `update.chat.id !== WHITELISTED_CHAT_ID`, return 200 and ignore.
  - *Verify:* A second Telegram account gets no response.

- [ ] **2.3 Register webhook with Telegram**
  Set the public Railway URL as the bot's webhook via the `setWebhook` API.
  - *Verify:* `getWebhookInfo` returns the correct URL. A message from the user reaches the route.

## Phase 3 — Text transaction flow
The core: parse → confirm → store, with undo and idempotency.

- [x] **3.1 Set up Vercel AI SDK**
  `@ai-sdk/deepseek` (official DeepSeek provider) + `ai` v6, `DEEPSEEK_API_KEY` in env, fail-fast on missing. Model: `deepseek-chat`. `getModel(id)` centralizes model resolution.
  - *Verify:* `generateText` against DeepSeek returns a real response (verified end-to-end during setup).

- [x] **3.2 Build text parser prompt**
  `parseTransaction(text)` in `features/llm/services/parse-transaction.ts` uses AI SDK `Output.object({ schema })` to enforce strict JSON. Zod schema in `features/llm/types/transaction.ts` with `amount` and `description` nullable; nulls = ambiguous signal (no LLM self-report). Categories embedded in prompt from `CATEGORIES` const. Prompt bakes in IDR currency, Asia/Jakarta timezone, and Indonesian relative-date resolution.
  Telegram integration: `bot.on("message:text", handleTextMessage)` in `features/telegram/handlers/text-message.ts` calls the parser, replies with a formatted readback, or asks for clarification on null fields. Errors are logged and a generic apology is sent — webhook still returns 200.
  - *Verify:* End-to-end: send a text to the bot on the whitelisted chat → get a parsed readback or a clarification request. Spec cases verified during setup — "makan siang 15k" → `{ amount: 15000, date: today, category: "Food", description: "makan siang" }`; "kemarin 20rb bensin" → yesterday's date; "halo" and "makan" → ambiguous readback.

- [x] **3.3 Confirmation message format**
  Inline keyboard `[Yes <id>] [No <id>]` attached to the parsed readback. The transaction id is encoded in each button's `callback_data` (e.g. `yes:42`), so the user never has to read it. No "Edit" button — if the user wants to change something, they tap No and send a new message.
  `confirmationKeyboard(pendingId)` in `features/telegram/utils/confirmation-keyboard.ts` builds the markup; `bot.callbackQuery(/^yes:(\d+)$/, ...)` and `/^no:(\d+)$/, ...` in `features/telegram/handlers/confirmation-handler.ts` dispatch on the prefix.
  - *Verify:* Send "makan siang 15k" → bot replies with the readback + a two-button row. Visual review of the rendered Telegram message.

- [x] **3.4 Wire parse → confirm → store**
  End-to-end flow on text message: `parseTransaction` → `createPendingTransaction` (INSERT with `status: 'pending'`) → reply with readback + keyboard. Tap **Yes** → `confirmPendingTransaction` (UPDATE `status='active'` via `updateMany`, returns boolean) → strip buttons via `editMessageReplyMarkup()` → reply "Saved ✓". Tap **No** → `cancelPendingTransaction` (UPDATE `status='deleted'`) → strip buttons → reply "Cancelled.". Both service functions are idempotent — a double-tap returns `false` and the handler does a silent no-op (no extra message).
  Status flag is a single `Status` enum (`pending | active | deleted`) on `Transaction` (no separate queue table). `getTransactionById` is intentionally not used — the original parsed message is still visible after buttons are stripped, so the reply can be a brief "Saved ✓" / "Cancelled." without restating the fields.
  - *Verify:* Send "makan siang 15k" → see parse + buttons → tap Yes → see "Saved ✓", row exists in DB with `status='active'`. Send "transport 50rb" → tap No → see "Cancelled.", row exists with `status='deleted'`. Double-tap on Yes → only one status flip; second tap is a silent no-op.

- [ ] **3.5 Add /undo command**
  On `/undo`: do NOT delete yet. Reply with the most recent **active** transaction's details (date, description, amount) and an inline keyboard `[Yes, delete] [Cancel]`, using the callback_data scheme `undo-yes:<id>` / `undo-no:<id>`. The prefix is distinct from the parse flow's `yes:<id>` / `no:<id>` — otherwise the existing `handleConfirm` / `handleCancel` from 3.4 would intercept undo taps and call `confirmPendingTransaction` / `cancelPendingTransaction` on a row whose status is `active`, not `pending`, producing a silent no-op. Tap Yes → soft-delete the row (`status='deleted'`), strip the keyboard, reply "Deleted ✓". Tap Cancel → no DB change, strip the keyboard, reply "Kept.".
  The confirmation makes the empty-chat case safe by construction: the new message is the context the cleared chat lost.
  - *Verify:* After 2 saves, `/undo` shows the readback + buttons (no DB change yet). Tap Yes → row is `status='deleted'`, "Deleted ✓" reply. Tap Cancel → row unchanged, "Kept." reply. `/undo` with no active transactions replies "Nothing to undo." Double-tap on Yes → only one status flip, second tap is a silent no-op.

- [ ] **3.6 Add idempotency on telegramMessageId**
  Unique constraint on `telegramMessageId` in Prisma. In handler: try insert, on unique violation, look up the existing row and reply with the same confirmation.
  - *Verify:* Manually replay the same Telegram `update_id` — only one row exists; user sees the same confirmation twice (no duplicate).

## Phase 4 — Photo transaction flow
Invoice/receipt photo → line items + total → confirmation.

- [ ] **4.1 Download photo from Telegram in webhook**
  Detect `update.message.photo`, call `getFile`, download to a buffer.
  - *Verify:* A photo sent to the bot is logged with file size and dimensions.

- [ ] **4.2 Send photo to vision model, extract line items + total**
  Multimodal call: photo + prompt asking for `[{ description, amount }]` line items and `total`. Schema-validated response.
  - *Verify:* Send a real receipt → get structured line items back.

- [ ] **4.3 Show extracted data for confirmation**
  Reply with: `I see N items:\n- Item 1, Rp X\n- Item 2, Rp Y\n...\nTotal: Rp Z\n\nSave all / edit / cancel?`
  - *Verify:* Visual review on a real receipt.

- [ ] **4.4 Store on confirmation**
  On "save all": insert N rows, one per line item, linked via a shared `groupId` and `source: photo`.
  - *Verify:* One photo upload → N rows in DB with the same `groupId` and `source: photo`.

## Phase 5 — Web UI
View, filter, edit, manually enter.

- [ ] **5.1 App shell layout**
  Sidebar (Dashboard, Transactions, Reports, Export, Sign out). Header. Auth-protected via middleware.
  - *Verify:* Logged out user is redirected to /signin. Logged in sees shell.

- [ ] **5.2 Transaction list page**
  Paginated list (50/page), columns: date, description, category, amount. Server-rendered, default sort date desc.
  - *Verify:* List shows real data, pagination works.

- [ ] **5.3 Date range + category filter**
  Query params `?from=YYYY-MM-DD&to=YYYY-MM-DD&category=Food`. Filter on server.
  - *Verify:* Filter changes the list correctly. Empty filter shows all.

- [ ] **5.4 Transaction edit / delete**
  Click a row → form. Save updates the row, delete removes it.
  - *Verify:* Edit an amount, save, see new value. Delete a row, it disappears.

- [ ] **5.5 Manual entry form**
  Web form: amount, date, category, description. Submits via Server Action.
  - *Verify:* Form creates a row. Same row appears in transaction list.

## Phase 6 — Reports + Q&A
Ask "biggest expense" via Telegram and web.

- [ ] **6.1 Pre-canned query functions**
  `sumByCategory(from, to)`, `topN(n, from, to)`, `listRecent(n)`, `monthlySummary(YYYY-MM)`. Pure TypeScript functions that hit Prisma.
  - *Verify:* Each function called from a Node REPL returns the right shape.

- [ ] **6.2 LLM Q&A endpoint**
  Receives a natural language question, picks the right pre-canned function, calls it, returns a natural-language answer. Limited function set, no freeform SQL.
  - *Verify:* "biggest expense this month" → calls `topN(1, monthStart, monthEnd)`, replies with name + amount.

- [ ] **6.3 Wire Q&A into Telegram bot**
  Detect when a message is a question vs a transaction (intent classification, or simple heuristic: starts with what/berapa/gimana/etc).
  - *Verify:* "berapa pengeluaran bulan ini" → Q&A reply. "makan 15k" → parse flow. Correct routing.

- [ ] **6.4 Monthly summary web page**
  Charts: total spent, by category. Uses pre-canned functions.
  - *Verify:* Page loads with current month's data.

## Phase 7 — Export
CSV / Excel.

- [ ] **7.1 CSV export endpoint**
  `GET /api/export.csv?from=...&to=...` returns a CSV with all columns. Streamed.
  - *Verify:* Open in spreadsheet, rows match DB.

- [ ] **7.2 Excel export endpoint**
  Same data, `.xlsx` via a small lib (`exceljs` or `xlsx`).
  - *Verify:* File opens in Excel/Numbers with formatting intact.

- [ ] **7.3 Export button on web UI**
  Button on transactions page triggers download of CSV or Excel.
  - *Verify:* Clicking downloads the file with current filter applied.

## Phase 8 — Production polish + Deploy
App is feature-complete. This phase packages, deploys, and verifies it end to end.

- [ ] **8.1 Dockerfile + Railway config**
  Multi-stage build with Bun, exposed port. `railway.json` for start command.
  - *Verify:* Build succeeds, deployed app starts, env vars injected.

- [ ] **8.2 Env var setup**
  Document all env vars: `DATABASE_URL`, `TELEGRAM_BOT_TOKEN`, `WHITELISTED_CHAT_ID`, `LLM_API_KEY`, `AUTH_SECRET`, `PUBLIC_URL` (the deployed Railway URL). Add to Railway.
  - *Verify:* App boots with all vars set. Missing var → clear error at startup.

- [ ] **8.3 Health check endpoint**
  `GET /api/health` returns 200 with `{ status: "ok", db: "ok" }` when the app and DB are reachable; 503 otherwise. Point Railway's healthcheck at this URL.
  - *Verify:* Endpoint returns 200 against a healthy DB. Returns 503 if the DB is unreachable.

- [ ] **8.4 Database migrations on deploy**
  Start command runs `prisma migrate deploy` before `next start` (e.g. `bunx prisma migrate deploy && bun run start`). Schema changes ship atomically with the deploy — never deploy un-migrated code.
  - *Verify:* First deploy creates all tables. Subsequent deploys apply pending migrations without data loss.

- [ ] **8.5 Logging + error visibility**
  Structured logs for: incoming Telegram message, LLM parse result, DB write, errors. At least `console.log` with timestamp + context.
  - *Verify:* Tail Railway logs, see a parse → save flow end to end.

- [ ] **8.6 Telegram webhook auto-registration on deploy**
  On app startup, call `setWebhook` with `${PUBLIC_URL}/api/telegram/webhook` (idempotent — Telegram accepts repeated calls). No manual re-registration step.
  - *Verify:* A redeploy with a new `PUBLIC_URL` keeps the bot working. `getWebhookInfo` returns the current URL.

- [ ] **8.7 Deploy + post-deploy smoke test**
  One-command deploy (`railway up`, or `bun run deploy` wrapper). After deploy returns, run: (1) `curl /api/health` → 200, (2) send a test Telegram message → bot replies with a parse confirmation, (3) check Railway logs for the smoke-test message. On any failure, roll back via Railway dashboard to the previous deployment and re-run.
  - *Verify:* Deploy → health 200 → test message gets a reply → log line appears. Rollback path documented and rehearsed once.
