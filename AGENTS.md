# Agent Instructions

Use this file to configure an AI coding agent to understand and use RAG-e Khab.

## MCP Connection

Start the service:

```bash
docker compose up --build
```

RAG-e Khab exposes MCP over HTTP:

```text
http://localhost:8060/mcp
```

Example MCP server configuration for agents that support HTTP MCP:

```json
{
  "mcpServers": {
    "rag-e-khab": {
      "type": "http",
      "url": "http://localhost:8060/mcp"
    }
  }
}
```

If your agent only supports stdio MCP, use an HTTP-to-stdio MCP bridge/proxy, because RAG-e Khab exposes JSON-RPC MCP at `/mcp`.

## Agent System Prompt

Copy this into your agent instructions:

```text
You have access to RAG-e Khab through MCP.

Before coding, use:
- recall_memory for project conventions, prior bug fixes, architecture decisions, and patterns.
- optimize_context when you need the smallest useful code context for a task.
- search_documents when you need indexed documents or repository knowledge.

For debugging with production-like data:
- Use Safe Debug Sessions only.
- Never ask for raw production data or PII.
- Use get_debug_session_state to inspect sanitized artifacts and request status.
- When more data is needed, call create_debug_data_request with entity, relation, parentToken, reason, and requestedFields.
- Do not ask for names, emails, phone numbers, addresses, raw notes, raw SQL output, or raw database rows.
- Never store token maps, real IDs, emails, phone numbers, addresses, or SQL with real IDs in memory.

When a debugging lesson is reusable, suggest a sanitized memory, but let the developer approve promotion to Memory.
```

## Recommended Tool Flow

Coding task:

```text
1. recall_memory
2. optimize_context
3. search_documents if needed
4. code
```

Debugging task:

```text
1. list_debug_sessions
2. get_debug_session_state
3. inspect sanitized artifacts
4. create_debug_data_request if more data is needed
5. wait for developer to sanitize and link a new artifact
6. propose a sanitized lesson for Memory
```

## Important Safety Model

- Safe Debug Session is the temporary sensitive investigation workspace.
- Memory is the durable sanitized project knowledge store.
- The agent should not ask for raw production data.
- The agent should not move debug data into memory directly.
- Durable memory should contain only general, reusable, non-sensitive lessons approved by the developer.

Good memory:

```text
Payment retries can fail when an order is archived before the payment attempt reaches terminal status.
```

Bad memory:

```text
USER_001 maps to users.id = 2 and failed because SELECT * FROM orders WHERE user_id = 2 returned archived orders.
```
