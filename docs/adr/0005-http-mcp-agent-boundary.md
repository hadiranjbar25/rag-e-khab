# 0005 - HTTP MCP as the Agent Integration Boundary

## Status

Accepted

## Context

Different coding agents support different integration mechanisms. RAG-e Khab needs one stable boundary for memory recall, context optimization, repository status, search, and Safe Debug workflows.

## Decision

Expose agent workflows through JSON-RPC MCP over HTTP at `/mcp`.

The backend owns tool execution. Clients that only support stdio MCP can use an HTTP-to-stdio bridge.

## Consequences

- The same tool surface can serve multiple coding agents.
- The UI and REST API remain separate from the agent integration boundary.
- MCP tool names should be agent-neutral.
- Backward-compatible aliases may exist, but new public tools should avoid vendor-specific names.
