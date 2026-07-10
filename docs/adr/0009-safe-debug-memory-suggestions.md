# 0009 - Safe Debug memory suggestions require developer approval

## Status

Accepted

## Context

Safe Debug sessions often uncover reusable lessons, such as a recurring failure mode or a useful investigation path. Those lessons are valuable in durable Memory, but Safe Debug is also the place where sensitive production-like data is handled. Automatically saving debug-derived content would risk persisting temporary tokens, raw identifiers, or details that are only useful inside one investigation.

## Decision

RAG-e Khab generates memory suggestions from sanitized Safe Debug data, including completed data requests, agent follow-up notes, and sanitized artifact failure signals.

Suggestions are shown as editable candidates. The developer must choose one, review it, and explicitly promote it to Memory. Suggested content passes through the same memory-promotion safety checks as manual content, so tokens, PII, secrets, and SQL with likely real identifiers are blocked.

## Consequences

- Debugging lessons are easier to capture without copying noisy logs into Memory.
- The Safe Debug boundary stays intact because suggestions are sanitized, editable, and developer-approved.
- The initial suggestion logic is intentionally conservative and deterministic; richer ranking can be added later without changing the approval model.
