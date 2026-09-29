# MCP Contract

## Purpose

MCP is the interoperability layer for agents. It exposes the same capabilities as the web runtime with explicit schemas, permissions, and auditability.

## Initial resources

- `form://{formId}` — published form metadata and schema.
- `form://{formId}/versions/{version}` — immutable version.
- `session://{sessionId}` — current session state visible to the caller.
- `submission://{submissionId}` — completed result subject to permissions.

## Initial tools

```text
create_form
publish_form
start_session
get_next_step
submit_answer
upload_answer_artifact
pause_session
resume_session
complete_session
get_submission
request_human_review
```

## Current implementation

The Phase 2 starter implementation is available through an HTTP MCP shim at `/api/mcp`.
Tenant-scoped MCP endpoints are available at `/api/mcp/{tenantSlug}`, for example `/api/mcp/demo`.
It supports capability discovery, resource reads, and the initial tool set against the same runtime used by the browser UI.
See `docs/examples/mcp-session.md` for copy-pasteable requests.

For `file_upload` and `video_response` fields, agents should call `upload_answer_artifact` first, upload the object to the returned presigned URL, then call `submit_answer` with the returned `artifact_id`.

## Tool rules

- Every tool has a versioned input/output schema.
- Tools must be safe to retry where possible; side effects require an idempotency key.
- `get_next_step` may return a question, upload request, consent request, review checkpoint, or completion state.
- Agents may suggest or ask; policy controls whether they may score, approve, or trigger actions.
- A tool must not silently broaden the agent's access to personal or media data.
- Errors use stable codes such as `INVALID_INPUT`, `SESSION_CONFLICT`, `CONSENT_REQUIRED`, `FORBIDDEN`, `NOT_FOUND`, and `PROVIDER_UNAVAILABLE`.

## Example next-step response

```json
{
  "session_id": "sess_123",
  "schema_version": "1.0",
  "step": {
    "id": "renewal_story",
    "type": "video_response",
    "prompt": "Describe a renewal you personally influenced.",
    "time_limit_seconds": 180,
    "required": true
  },
  "allowed_answer_types": ["video", "text"],
  "consent": { "recording_required": true },
  "status": "awaiting_answer"
}
```

## Agent-facing safety

Agent instructions must define the goal, allowed evidence, prohibited inferences, completion criteria, escalation policy, and data handling policy. Hiring workflows must evaluate job-relevant evidence only and keep final decisions with authorized humans.
