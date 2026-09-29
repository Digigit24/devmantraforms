# Agentic Forms Roadmap

## Product thesis

This project is not only a form builder. It is an open protocol and runtime for stateful, multimodal, agent-led intake: an agent can create or load a schema, interview a person one step at a time, adapt to answers, collect evidence, and return a validated result.

## Phase 1 — Reliable Forms MVP

**Outcome:** Google Forms-level reliability for human-created forms.

**Implemented starter slice:** typed schema validation, draft creation, publishing, a seeded hiring form, a public respondent runtime, required answer validation, conditional visibility, session completion, and in-memory submissions.

- Form CRUD, drafts, publishing, and versioning
- Text, number, choice, date, rating, file, consent, and basic video fields
- Required fields, validation, pages, and conditional visibility
- Public link, embed, responsive runtime, save/resume
- Response storage, export, basic admin review
- Authentication, rate limiting, and upload limits
- Contract tests for schema validation and submission flow

**Exit gate:** a nontechnical user can publish a form and collect/export correct responses without engineering help.

## Phase 2 — MCP Foundation

**Outcome:** any compatible agent can use the platform through a stable MCP surface.

**Implemented starter slice:** `/api/mcp` capability discovery, resource reads, and tools for create, publish, start, next step, answer, pause, resume, complete, submission lookup, and human-review request stubbing.

- MCP server with resources for schemas, sessions, and submissions
- Tools for create, publish, start session, get next step, submit answer, pause, resume, and complete
- Zod-backed JSON schemas and machine-readable errors
- Idempotency, pagination, capability discovery, and authentication
- SDK/examples for Claude and other MCP clients
- Conformance fixtures and a local MCP test harness

**Exit gate:** an external agent can run a complete form session without using the web UI.

## Phase 3 — Live Agentic Interview Runtime

**Outcome:** forms become adaptive interviews rather than fixed questionnaires.

- Session state machine and event log
- Agent-generated follow-ups constrained by a form policy
- Completion criteria, missing-evidence detection, and clarification loops
- Text, voice, webcam/video, file, and screen-recording answers
- Transcription and structured extraction behind provider adapters
- Human handoff, pause/resume, consent, and retry behavior
- Replayable sessions for debugging and review

**Exit gate:** a configured role interview can ask relevant follow-ups and produce a reproducible evidence packet.

## Phase 4 — Workflow and Evaluation Layer

**Outcome:** collected evidence reliably drives internal operations.

- Rubrics, competencies, scoring guidance, and evidence citations
- Approval queues, assignments, routing, and notifications
- Webhooks and adapters for email, Slack, Sheets, ATS, CRM, and storage
- Human review and override with immutable audit history
- Analytics for completion, drop-off, latency, and question quality
- Hiring safeguards, retention rules, consent records, and data export/delete

**Exit gate:** a hiring or intake workflow can move from invitation to reviewed decision with every action traceable.

## Phase 5 — Open Ecosystem

**Outcome:** developers can extend the runtime without forking the core.

- Versioned public schema and MCP specification
- Official TypeScript/Python client libraries
- Component, storage, transcription, model, and action adapter interfaces
- Self-hosting guide, Docker setup, seed data, and observability
- Conformance suite, compatibility matrix, example agents, and templates
- Plugin/skill registry with permissions and signed metadata

**Exit gate:** a third-party contributor can add a provider or component using documented interfaces and pass conformance tests.

## Phase 6 — Agentic Forms Network

**Outcome:** reusable form skills and agents compose into complete business processes.

- Multi-agent handoffs with scoped permissions
- Role-specific interview and intake templates
- Cross-session context with explicit consent and provenance
- Evaluation quality monitoring and bias/safety checks
- Tenant isolation, policy engine, encryption, and enterprise governance
- Federated/self-hosted deployments and interoperability certification
- Marketplace for reusable schemas, rubrics, components, and actions

**Exit gate:** teams can compose a secure end-to-end workflow from reusable agent skills while retaining ownership of data and execution policy.

## Sequencing rule

Do not build autonomous evaluation before the platform has versioned schemas, consent, audit events, human review, and deterministic replay. The differentiator is adaptive orchestration with trustworthy evidence—not unrestricted model improvisation.
