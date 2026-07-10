# 0003 - Postgres for Durable Application State

## Status

Accepted

## Context

Early file-based storage is simple, but it becomes fragile as memories, repository metadata, runtime settings, debug sessions, token mappings, and project data grow.

The app needs predictable persistence, safer concurrent access, and a path toward richer querying.

## Decision

Use Postgres as the durable store for application state.

Qdrant remains the vector store for semantic search. Postgres owns durable metadata and user-facing records. The backend can rebuild vector indexes from durable state when needed.

## Consequences

- Local development requires Postgres, provided by Docker Compose.
- Data is safer and easier to evolve than ad hoc JSON files.
- Schema and data migrations become an explicit part of backend maintenance.
- Vector data and relational metadata remain separate by design.
