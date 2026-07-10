# 0004 - Safe Debug Sessions Keep Sensitive Data Temporary

## Status

Accepted

## Context

Debugging production-like issues often requires realistic data, but coding agents should not receive raw PII, secrets, raw database rows, or real identifiers unless a developer explicitly chooses to expose them locally.

Durable memory should contain reusable lessons, not temporary sensitive investigation data.

## Decision

Safe Debug Sessions are the boundary for sensitive debugging work.

Raw pasted data is sanitized locally. Agents receive sanitized artifacts and can request more sanitized data through structured requests. Token resolution and SQL with real identifiers stay in the developer UI. Promotion from Safe Debug to Memory is explicit and guarded.

## Consequences

- Agents can help debug without receiving raw production data.
- Token mappings are session-scoped and should not become durable memory.
- Developers remain responsible for running private follow-up queries.
- Reusable lessons can be preserved only after sanitization and review.
