# 0004 - Safe Debug Sessions Keep Sensitive Data Temporary

## Status

Accepted

## Context

Debugging production-like issues often requires realistic data, but coding agents should not receive raw PII, secrets, raw database rows, or real identifiers unless a developer explicitly chooses to expose them locally.

Durable memory should contain reusable lessons, not temporary sensitive investigation data.

## Decision

Safe Debug Sessions are the boundary for sensitive debugging work.

Raw pasted data is sanitized locally. RAG-e Khab stores the full sanitized artifact for developer-controlled expansion, but agents receive compact sanitized artifacts by default.

For noisy logs, CSV/query results, and JSON/debug output, compaction preserves failures, exception classes, stack frames, file paths, method/class names, changed identifiers that are already sanitized, and relevant rows. It removes or summarizes timestamps, repeated success lines, duplicated logs, progress noise, and bulky low-signal output.

Agents can request a small sanitized raw line range when compact context is insufficient. Token resolution and SQL with real identifiers stay in the developer UI. Promotion from Safe Debug to Memory is explicit and guarded.

## Consequences

- Agents can help debug without receiving raw production data.
- Large pasted logs do not automatically become large agent prompts.
- Raw expansion is deliberate and limited to sanitized slices.
- Token mappings are session-scoped and should not become durable memory.
- Developers remain responsible for running private follow-up queries.
- Reusable lessons can be preserved only after sanitization and review.
