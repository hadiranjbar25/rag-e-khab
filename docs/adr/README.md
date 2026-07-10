# Architecture Decision Records

This directory records important architecture decisions for RAG-e Khab.

ADRs are intentionally short. Each one explains the context, the decision, and the consequences so future contributors can understand why the system is shaped the way it is.

## Records

- [0001 - Self-hosted local-first architecture](0001-self-hosted-local-first.md)
- [0002 - Compact repository context instead of raw source dumps](0002-compact-repository-context.md)
- [0003 - Postgres for durable application state](0003-postgres-durable-state.md)
- [0004 - Safe Debug Sessions keep sensitive data temporary](0004-safe-debug-sensitive-data-boundary.md)
- [0005 - HTTP MCP as the agent integration boundary](0005-http-mcp-agent-boundary.md)
- [0006 - Preview agent context before use](0006-previewable-agent-context.md)
- [0007 - Task templates for context optimization](0007-task-templates-for-context-optimization.md)
