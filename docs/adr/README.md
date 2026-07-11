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
- [0008 - Agent activity timeline](0008-agent-activity-timeline.md)
- [0009 - Safe Debug memory suggestions require developer approval](0009-safe-debug-memory-suggestions.md)
- [0010 - Compute memory freshness from repository metadata](0010-memory-freshness-from-repository-metadata.md)
- [0011 - Workspace health is an advisory readiness score](0011-workspace-health-readiness-score.md)
- [0012 - Context budget profiles standardize optimizer size](0012-context-budget-profiles.md)
- [0013 - Safe Debug compares sanitized artifacts only](0013-safe-debug-sanitized-artifact-comparison.md)
- [0014 - Extract frontend feature panels from the app shell](0014-frontend-feature-panel-components.md)
- [0015 - Memory writes require explicit scope](0015-memory-writes-require-explicit-scope.md)
