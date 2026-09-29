# MCP Session Example

This project exposes a Phase 2-compatible HTTP MCP shim at `/api/mcp`. It is intentionally simple while the native MCP transport is being added.

## Discover capabilities

```http
GET /api/mcp
```

## Start a session

```json
{
  "kind": "tool",
  "name": "start_session",
  "arguments": {
    "form_id": "sample-hiring",
    "respondent_id": "candidate_123"
  }
}
```

## Submit an answer

```json
{
  "kind": "tool",
  "name": "submit_answer",
  "arguments": {
    "session_id": "sess_x",
    "field_id": "candidate_name",
    "value": "Aarav Mehta",
    "idempotency_key": "candidate_123_candidate_name_v1"
  }
}
```

## Upload a file or video artifact

```json
{
  "kind": "tool",
  "name": "upload_answer_artifact",
  "arguments": {
    "session_id": "sess_x",
    "field_id": "intro_video",
    "filename": "intro.webm",
    "content_type": "video/webm",
    "size_bytes": 10485760,
    "duration_seconds": 90
  }
}
```

The response contains a presigned `PUT` URL and an `artifact.id`. Upload the object to that URL, then submit the answer:

```json
{
  "kind": "tool",
  "name": "submit_answer",
  "arguments": {
    "session_id": "sess_x",
    "field_id": "intro_video",
    "value": {
      "artifact_id": "art_x",
      "filename": "intro.webm",
      "content_type": "video/webm",
      "size_bytes": 10485760,
      "duration_seconds": 90
    },
    "idempotency_key": "candidate_123_intro_video_v1"
  }
}
```

## Complete a session

```json
{
  "kind": "tool",
  "name": "complete_session",
  "arguments": {
    "session_id": "sess_x"
  }
}
```

## Read resources

```json
{
  "kind": "resource",
  "uri": "form://sample-hiring"
}
```

Supported resource URI patterns are `form://{formId}`, `session://{sessionId}`, and `submission://{submissionId}`.
