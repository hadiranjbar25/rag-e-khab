# 0012 - Context budget profiles standardize optimizer size

## Status

Accepted

## Context

Different coding tasks need different amounts of context. Narrow edits should be fast and small, while refactors and unfamiliar code often need a broader view. Asking developers and agents to tune raw token counts every time is noisy and easy to get wrong.

## Decision

RAG-e Khab supports named context budget profiles:

- `small`: 1,200 tokens
- `standard`: 3,000 tokens
- `deep`: 6,000 tokens

The optimizer API and MCP tool accept `budgetProfile`. The UI exposes the profiles on the Context Optimizer page and lets Settings choose the default profile. Explicit `maxTokens` remains supported and always overrides the profile for custom runs.

## Consequences

- Agents and developers can ask for the intended context depth without remembering exact token counts.
- Existing clients that send `maxTokens` continue to behave the same.
- Future profiles can be added without changing the optimizer pipeline contract.
