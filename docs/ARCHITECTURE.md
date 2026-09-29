# Architecture

## Core layers

1. **Schema** — versioned form, component, policy, rubric, and action definitions.
2. **Runtime** — deterministic session state, validation, media intake, and event persistence.
3. **Agent adapter** — MCP resources/tools and provider-neutral agent instructions.
4. **Intelligence adapters** — model, transcription, extraction, moderation, and scoring providers.
5. **Operations** — permissions, approvals, integrations, notifications, analytics, and audit.

The UI, MCP clients, and future SDKs are clients of the runtime. They must not duplicate state transitions or validation rules.

## Canonical entities

- `Tenant`: workspace identity, slug, plan, MCP endpoint, and API credentials.
- `Form`: identity, metadata, owner, status, and current published version.
- `FormVersion`: immutable schema plus policy and compatibility metadata.
- `Session`: respondent, form version, status, and current step.
- `Answer`: normalized value plus source, provenance, confidence, and verification state.
- `Event`: append-only record of a state transition or external action.
- `Submission`: completed session snapshot and result references.
- `Action`: a permissioned side effect requested by a workflow.

## Design principles

- Every CeliyoForms record belongs to a tenant. The legacy Dev Mantra diagnostic database must not be reused for CeliyoForms tenant data.
- The runtime is event-aware, but read models may be optimized for UI queries.
- Published versions are immutable; edits create a new draft/version.
- Media is stored outside the database with metadata and access-controlled references.
- Sensitive data has explicit retention, redaction, and deletion behavior.
- Every agent-generated value is distinguishable from user-provided or system-verified data.
- Side effects require explicit permissions and idempotency keys.

## Error model

Public errors should include a stable `code`, human-readable `message`, optional `field`, and safe `details`. Never expose provider prompts, secrets, stack traces, or unrelated personal data.

## Provider boundaries

Model, transcription, storage, email, and integration vendors must implement adapters. Core domain code depends on interfaces, not vendor SDKs. A local deterministic adapter should exist for tests.

## Storage adapter

File and video answers use an S3-compatible storage adapter. The runtime stores artifact metadata and audit events; large media objects live in the configured bucket.

Required environment variables:

- `S3_BUCKET`
- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`

Optional environment variables:

- `S3_REGION` defaults to `auto`
- `S3_ENDPOINT` for R2, MinIO, Wasabi, Spaces, or another S3-compatible provider
- `S3_FORCE_PATH_STYLE=true` for providers that require path-style URLs
- `S3_PUBLIC_BASE_URL` when stored objects have a stable public or CDN base URL

Upload flow:

1. UI or agent calls `upload_answer_artifact`.
2. The server validates the session and returns a short-lived presigned `PUT` URL.
3. The client uploads the file directly to the bucket.
4. The client submits the answer using the returned `artifact_id`.
5. The runtime verifies the artifact belongs to the same session and field before attaching it.

## Database boundary

`DATABASE_URL` is reserved for the legacy Dev Mantra diagnostic routes that still exist in this repository.
CeliyoForms persistence must use `CELIYO_DATABASE_URL` or a future provider-specific tenant database config.
Do not point CeliyoForms migrations at the live Dev Mantra/Fundability database.
