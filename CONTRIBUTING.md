# Contributing

Read `AGENTS.md` first. The project values small, reviewable vertical slices and stable public contracts.

## Before opening a pull request

- Explain the user-visible behavior and affected phase in `docs/ROADMAP.md`.
- Add or update types and Zod schemas at the boundary.
- Add tests for happy paths, invalid input, permissions, retries, and state transitions.
- Update MCP examples when resources or tools change.
- Run the available checks: `npm run lint`, `npx tsc --noEmit`, and `npm run build`.
- Never commit secrets, real candidate media, or production personal data.

## Commit and review expectations

Keep commits focused. Reviewers should be able to answer: what contract changed, who can call it, what data is stored, what happens on retry/failure, and how the change is tested.

## Compatibility

Published schemas, MCP tools, event names, and persisted data are public APIs. Prefer additive changes. Breaking changes require a version, migration notes, updated fixtures, and a deprecation path.
