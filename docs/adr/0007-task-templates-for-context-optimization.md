# 0007 - Task Templates for Context Optimization

## Status

Accepted

## Context

Developers often ask coding agents for recurring kinds of work: bug fixes, endpoint additions, UI changes, refactors, and Safe Debug investigations.

Each kind of task benefits from a different prompt shape and token budget. Without templates, developers have to remember what context to ask for every time.

## Decision

RAG-e Khab provides task templates in the Context Optimizer UI.

Templates fill a starter task prompt and suggested token budget. They remain editable before optimization runs. The optimizer still receives an ordinary task and `maxTokens` request, so templates do not create a separate backend execution path.

## Consequences

- Common workflows become faster to start.
- Templates make good context-request habits visible in the UI.
- Developers remain in control because generated prompts and budgets are editable.
- Future versions can persist custom templates per workspace without changing the optimizer contract.
