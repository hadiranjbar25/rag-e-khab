# 0011 - Workspace health is an advisory readiness score

## Status

Accepted

## Context

RAG-e Khab workspaces can contain uploaded knowledge, durable memories, linked repositories, and repository freshness signals. Developers need a quick way to know whether an agent has enough current context before starting a coding task.

## Decision

RAG-e Khab exposes a workspace health endpoint and dashboard card. The score combines indexed source units, memory count, linked repositories with recent syncs, and stale memory count.

The score is advisory. It does not block agent tools, change retrieval behavior, or automatically rewrite memories. It gives the developer a compact review queue and setup signal.

## Consequences

- Developers can quickly see whether a workspace is ready, needs review, or still needs setup.
- The signal stays explainable because it is broken into named checks.
- Future checks, such as failed syncs or missing repository scans, can be added without changing the workspace boundary.
