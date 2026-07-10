# 0010 - Compute memory freshness from repository metadata

## Status

Accepted

## Context

Durable memories can outlive the code they describe. A convention, bug fix, or architecture note may become misleading after related repository files change. RAG-e Khab already stores repository metadata with file paths, modules, hashes, and modification times, so it can warn developers without re-indexing or rewriting memories.

## Decision

RAG-e Khab computes memory freshness when memories are listed or recalled. Repository-scoped memories are marked stale when active indexed files in the same repository and module were modified after the memory was saved.

The stale signal is advisory. It includes a short reason, a few changed file paths, and the newest change time. The memory content is not edited automatically.

## Consequences

- Developers can spot memories that need review before agents reuse outdated guidance.
- Existing stored memories remain compatible because freshness is computed at read time.
- The signal may be conservative: a changed file does not always invalidate a memory, but it gives the developer a useful review queue.
