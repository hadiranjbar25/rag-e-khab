# 0015 - Memory writes require explicit scope

## Status

Accepted

## Context

Memories are useful only when they appear in the workspace where agents and developers expect them. If an API or MCP caller omits `projectId`, silently saving to the General workspace makes the memory hard to find and can cause agents to miss important project-specific guidance.

## Decision

Creating memory requires explicit scope:

- pass `projectId` for a workspace memory
- pass `global=true` only when General/global memory is intentional

The UI displays the target workspace before saving and sends workspace-scoped memory requests. MCP instructions tell agents to pass the active workspace `projectId` unless the developer explicitly asks for global memory.

## Consequences

- Accidental General-memory writes fail with a clear request error.
- Developers can see where a memory will be saved before clicking.
- Existing read/list behavior remains unchanged.
