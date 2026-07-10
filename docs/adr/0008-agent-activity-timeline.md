# 0008 - Agent Activity Timeline

## Status

Accepted

## Context

RAG-e Khab exposes memories, context optimization, repository context, artifact expansion, and Safe Debug workflows through MCP. Developers need to understand what agents did during a session without digging through server logs.

The timeline must not become a new sensitive data sink.

## Decision

RAG-e Khab records high-level MCP tool activity.

Each activity entry stores the tool action, success or failure, timestamp, optional workspace/session identifiers, and a short safe summary. It does not store raw tool arguments, raw prompts, token mappings, SQL output, or debug data.

The dashboard shows the activity timeline alongside existing workspace events.

## Consequences

- Developers can audit agent behavior from the UI.
- Failed MCP tool calls become visible.
- The activity log improves transparency without exposing sensitive payloads.
- Future features can add filters or per-workspace timeline views using the same event model.
