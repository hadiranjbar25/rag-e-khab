# 0002 - Compact Repository Context Instead of Raw Source Dumps

## Status

Accepted

## Context

Coding agents need repository context, but sending whole source trees wastes tokens and can expose unnecessary private code. The useful context for a task is usually a small combination of project structure, conventions, relevant classes, dependency chains, tests, and carefully selected snippets.

## Decision

The repository agent sends compact coding-agent context by default and does not expose a full raw-source sync mode in the UI.

The synced context includes repository maps, module summaries, source declarations, selected docs, and build/test configuration. Exact raw source should be read locally by the coding agent when an edit requires it.

The backend also exposes context package APIs that default to summaries and only return raw snippets when explicitly requested.

## Consequences

- Agent prompts stay smaller and cheaper.
- Indexed knowledge is better suited for task routing and orientation.
- Exact implementation edits still require local file reads.
- Backward-compatible CLI profile aliases may remain, but compact context is the only supported repository-agent mode.
