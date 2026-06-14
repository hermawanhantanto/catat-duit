## 1. Use Context7 for Library Documentation

**Don't trust your training data. Check the docs.**

Before installing a library, framework, SDK, or any third-party dependency — and before writing code that uses one — fetch the latest documentation via Context7 MCP. This applies to:
- Library installation and setup
- Version migration (e.g., Tailwind v3 → v4, Prisma v6 → v7)
- API syntax, configuration, CLI tool usage
- Library-specific debugging
- Even well-known libraries — training data may be stale

Steps:
1. `resolve-library-id` to find the library
2. Pick the best match (exact name, snippet count, source reputation)
3. `query-docs` with the selected ID and the full question
4. Apply the fetched docs to the task

Prefer Context7 over web search for library docs. Limit `resolve-library-id` to 3 calls per question.

## 2. Write Clean Code

**Code is read more than it's written. Optimize for the reader.**

- Names reveal intent. No abbreviations except for domain terms (id, url, dto). No single-character names (`x`, `p`, `cb`) — even for callback parameters, loop variables, or destructured locals. Spell them out (`part`, `element`, `index`).
- Functions do one thing. Split if the name has "and" in it.
- No comments explaining *what* — comments only when explaining *why* a non-obvious choice was made.
- No dead code, no commented-out blocks, no speculative "might need this" stubs.
- Errors handled at the level that can act on them. No silent catches.
- No magic numbers — name them.
- Match the existing style of the file you're editing.

## 3. Use shadcn/ui for Components and Design

**Consistency over hand-rolled.** Use shadcn/ui primitives for all UI — Button, Form, Input, Label, etc. — instead of native HTML or custom components. Add new components with `bunx shadcn@latest add <name>` rather than reaching for another library.

## 4. Use Feature-Based (Modular) Architecture

**`app/` routes, `features/<name>/` owns each module, `components/` is shared UI, `lib/` is global config.**

- `app/` is the thin routing layer. Pages compose features, never own business logic. API routes at `app/api/<feature>/`.
- `features/<name>/` owns a module: `components/`, `services/`, `utils/`, `types/`. Add a subdir only when there's content for it — no empty stubs.
- **Types separation:** feature-specific types (zod schemas, inferred types, feature-scoped interfaces) live in `features/<name>/types/`. Cross-feature types live in the global `src/types/`. The global one is for types more than one feature imports from.
- `components/ui/` is shadcn primitives shared across features. `components/layout/` is shared structural UI (sidebar, navbar).
- `lib/` is global config only — Prisma client, auth, env helpers. Nothing feature-specific.
- Route groups like `(auth)`, `(dashboard)` organize routes without affecting URLs.

## 5. Fail Fast on Missing Config

**Validate required env vars at module load.**

- Required env vars are read at the top of the file that uses them and `throw` on missing/empty. The rest of the file uses the value as non-null — no "is it set?" conditionals scattered through request handlers.
- Missing config crashes the app at boot, not on the Nth request.

## 6. JSDoc on Named Functions

**Multi-line JSDoc on every named function declaration.**

- The summary captures the *why* or non-obvious behavior, not a restatement of the signature.
- Always include `@param` and `@return`, even when TypeScript already provides the types — they document intent and surface in IDE tooltips.
- Inline arrow callbacks (e.g. `bot.command("start", ctx => ...)`) don't need JSDoc — the call site is self-documenting.
- Keep it short — one or two lines. If a function needs a paragraph, the function probably does too much.
