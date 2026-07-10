# 0001 - Self-hosted Local-first Architecture

## Status

Accepted

## Context

RAG-e Khab handles project knowledge, repository context, memories, and sanitized production-like debug artifacts. These data sets can contain private implementation details and sensitive operational context.

The app should be useful without requiring a hosted SaaS service or external model provider.

## Decision

RAG-e Khab is self-hosted and local-first.

The default Docker Compose setup runs the backend, frontend, Postgres, and Qdrant locally. The default embedding provider is deterministic and local. Optional LLM and embedding providers can be enabled through configuration.

## Consequences

- Developers can run the system without sending project data to a third-party service.
- The default setup works without model API keys.
- Users are responsible for local storage, backups, and host security.
- Optional remote or local model providers must be explicit configuration choices.
