# 0014 - Extract frontend feature panels from the app shell

## Status

Accepted

## Context

The React UI started as a single `App.tsx` shell and grew as RAG-e Khab added workspaces, memories, repositories, optimizer tools, and Safe Debug workflows. Keeping every feature panel inline makes reviews harder and increases the chance of accidental layout regressions.

## Decision

New substantial UI surfaces should be extracted into focused components under `frontend/src/components`.

The app shell should keep routing, cross-page state, API orchestration, and shared layout. Feature panels should own rendering and local interaction structure through typed props.

## Consequences

- UI changes become easier to review and test incrementally.
- Existing behavior can be preserved while large sections are extracted one at a time.
- `App.tsx` will shrink gradually instead of through one risky rewrite.
