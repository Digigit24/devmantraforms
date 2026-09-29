# AGENTS.md

## Mission

Build an open-source, MCP-first runtime for agentic forms and interviews. Any compatible agent should be able to create a form, run a stateful session, collect text/audio/video/files, ask adaptive follow-ups, and receive validated structured output.

## Repository map

- `app/`: Next.js routes, pages, and API endpoints.
- `components/`: reusable UI components.
- `lib/`: server-side services, domain logic, validation, and integrations.
- `types/`: shared TypeScript types.
- `db/`: database schema and migrations when added.
- `docs/`: product, architecture, protocol, and contributor documentation.

## Non-negotiable engineering rules

1. Use TypeScript strictness and explicit domain types. Do not use `any` to bypass a design problem.
2. Keep business logic out of React components and route handlers; put it in `lib/` or a domain module.
3. Validate all external input at the boundary with Zod (HTTP, MCP, webhooks, and persisted JSON).
4. Treat form schemas and session events as versioned public contracts.
5. Keep agent decisions auditable: record the input, tool/action, result, and schema version.
6. Never make hiring decisions from facial appearance, emotion inference, accent, protected traits, or other non-job-related signals. Human review remains required for consequential decisions.
7. Design every capability for both UI use and MCP use. Do not make the web UI the only client.
8. Prefer small pure functions, deterministic tests, and backward-compatible migrations.
9. Do not add a provider-specific abstraction to the core. Providers belong behind adapters.
10. Update the relevant docs and tests in the same change as a public contract change.

## Required workflow for coding agents

1. Read `docs/ARCHITECTURE.md`, `docs/MCP.md`, and the relevant phase in `docs/ROADMAP.md`.
2. Inspect existing code and preserve unrelated user changes.
3. State the contract before implementation: inputs, outputs, errors, permissions, and events.
4. Implement the smallest vertical slice.
5. Run typecheck, lint, tests, and build when available.
6. Report changed files, verification, known limitations, and any migration or security implications.

## Definition of done

- Behavior is covered by tests or a documented reason a test is not practical.
- Invalid input returns a stable, useful error.
- Access control and sensitive-data handling are explicit.
- Public schemas are versioned or backward-compatible.
- Docs and examples match the implementation.
