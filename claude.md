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

- Names reveal intent. No abbreviations except for domain terms (id, url, dto).
- Functions do one thing. Split if the name has "and" in it.
- No comments explaining *what* — comments only when explaining *why* a non-obvious choice was made.
- No dead code, no commented-out blocks, no speculative "might need this" stubs.
- Errors handled at the level that can act on them. No silent catches.
- No magic numbers — name them.
- Match the existing style of the file you're editing.
