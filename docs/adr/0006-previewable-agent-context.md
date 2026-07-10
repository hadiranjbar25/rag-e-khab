# 0006 - Preview Agent Context Before Use

## Status

Accepted

## Context

RAG-e Khab reduces token usage by selecting compact task context for coding agents. Developers still need to trust what was selected, especially when context comes from memories, repository summaries, compressed artifacts, or Safe Debug sessions.

Without a preview, context optimization can feel like a black box.

## Decision

Context optimization responses include a preview of selected context.

Each preview item records the source, document/chunk identifiers, estimated tokens, relevance score, selection reason, and whether the item is compressed artifact context.

The UI shows this preview beside the optimized context so the developer can inspect the selected material before using it with an agent.

## Consequences

- Developers can see why context was selected.
- Compressed artifact context is clearly marked.
- Token budgets become easier to reason about.
- The preview adds small response metadata, but avoids sending raw source or raw debug data by default.
