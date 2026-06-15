# RAG-e Khab

RAG-e Khab is a self-hosted personal knowledge platform for uploading private documents, searching them semantically, asking cited questions, and exposing the same knowledge operations over REST and MCP.

## Stack

- Kotlin, Java 25, Spring Boot 4, Gradle Kotlin DSL
- LangChain4j dependency included for the AI layer
- Qdrant service in Docker Compose
- React, TypeScript, Vite
- JSON-RPC MCP endpoint at `/mcp`

## Run

```bash
docker compose up --build
```

Then open:

- UI: `http://localhost:5173`
- REST API: `http://localhost:8080/api`
- MCP endpoint: `http://localhost:8080/mcp`
- Qdrant: `http://localhost:6333`

For local backend development:

```bash
gradle :backend:bootRun
```

For local frontend development:

```bash
cd frontend
npm install
npm run dev
```

## REST API

- `POST /api/documents` multipart upload with field `file`
- `POST /api/texts` with `{ "title": "...", "text": "...", "projectId": "..." }`
- `POST /api/projects` with `{ "name": "...", "description": "..." }`
- `GET /api/projects`
- `GET /api/projects/{id}`
- `GET /api/documents`, optionally with `?projectId=...`
- `GET /api/documents/{id}`
- `DELETE /api/documents/{id}`
- `POST /api/search` with `{ "query": "...", "limit": 8, "projectId": "..." }`
- `POST /api/chat` with `{ "question": "...", "limit": 8, "projectId": "..." }`
- `POST /api/reindex`
- `GET /api/admin/status`

## MCP Tools

The MCP JSON-RPC endpoint supports:

- `search_documents`
- `ask_knowledge_base`
- `create_project`
- `list_projects`
- `add_text`
- `list_documents`
- `get_document`
- `delete_document`

Example:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "search_documents",
    "arguments": {
      "query": "supplier onboarding"
    }
  }
}
```

## Provider Configuration

The backend selects an LLM provider through environment variables:

```bash
RAGEKHAB_LLM_PROVIDER=ollama
RAGEKHAB_LLM_MODEL=llama3.1
RAGEKHAB_LLM_BASE_URL=http://localhost:11434
RAGEKHAB_LLM_API_KEY=
```

Provider implementations are isolated behind `LLMProvider`, so business services use the abstraction only. The current scaffold includes `ollama`, `openai`, `claude`, and `gemini` provider beans; Ollama attempts a local `/api/generate` call, while all providers retain an extractive fallback so the app remains useful without credentials.

## Notes

The vector index writes to Qdrant when it is available and keeps an in-memory fallback so local development still works if Qdrant is offline. The embedding implementation is deliberately provider-free today; it can be replaced with LangChain4j embedding models without changing REST, MCP, chat, or document services.
