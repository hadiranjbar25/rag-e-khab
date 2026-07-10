# Claude Skill Example: RAG-e Khab Memory

This example shows a minimal Claude Skill that teaches Claude Code to use the RAG-e Khab MCP server with low token usage.

Suggested skill folder:

```text
ragekhab-memory-skill/
  SKILL.md
  references/
    tool-examples.md
```

## `SKILL.md`

````md
---
name: ragekhab-memory
description: Use RAG-e Khab MCP to recall project memory and optimized coding context before exploring files.
---

# RAG-e Khab Memory Skill

Use this skill when the user asks about project knowledge, stored facts, coding conventions, architecture decisions, or wants to reduce context usage.

## Tool Priority

For personal facts or durable project facts:
1. Call `recall_memory`.
2. If empty, call `search_documents`.
3. Return a short answer with source names.

For coding tasks:
1. Call `optimize_context`.
2. Use `maxTokens` between 1000 and 3000 unless the user specifies otherwise.
3. Read only files named in `sources` unless more context is necessary.

For repository sync:
1. Use `repository_status`.
2. Prefer the repo-local `ragekhab-agent.jar` sync workflow. It sends compact repository structure, summaries, key docs, and best-practice context instead of all source files.
3. Use `scan_repository` only for paths visible to the backend container/process.

## Token Rules

- Prefer `recall_memory` before document search.
- Prefer `optimize_context` before reading files.
- Do not paste full retrieved chunks unless needed.
- Summarize results in 3-8 bullets.
- Include source names.
- Ask for more only if returned context is insufficient.

## Example Calls

Personal fact:

```json
{
  "tool": "recall_memory",
  "arguments": {
    "task": "What is the user's height?",
    "limit": 5
  }
}
```

Fallback:

```json
{
  "tool": "search_documents",
  "arguments": {
    "query": "user height my height",
    "limit": 5
  }
}
```

Coding task:

```json
{
  "tool": "optimize_context",
  "arguments": {
    "task": "Add pagination to Orders API",
    "maxTokens": 1500,
    "repository": "backend"
  }
}
```

Repository sync command:

```bash
java -jar /path/to/ragekhab-agent.jar --server http://localhost:8060 --repository billing-api --path .
```

Backend-visible repository scan:

```json
{
  "tool": "scan_repository",
  "arguments": {
    "repository": "billing-api",
    "path": "/repos/billing-api",
    "full": false
  }
}
```
````

## Minimal Prompts

For stored facts:

```text
Use RAG-e Khab memory: what is my height?
```

For coding tasks:

```text
Use RAG-e Khab optimize_context: Add pagination to Orders API. maxTokens 1500.
```

The skill should contain routing behavior, not project knowledge. Keep project facts in RAG-e Khab memories or indexed documents so Claude only loads what it needs.
