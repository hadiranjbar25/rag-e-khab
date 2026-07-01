package com.ragekhab.mcp

import com.ragekhab.chat.ChatService
import com.ragekhab.context.ContextOptimizationRequest
import com.ragekhab.context.ContextOptimizerService
import com.ragekhab.debug.CreateDebugDataRequest
import com.ragekhab.document.DocumentService
import com.ragekhab.debug.DebugSessionService
import com.ragekhab.memory.MemoryService
import com.ragekhab.memory.MemoryType
import com.ragekhab.memory.RecallMemoryRequest
import com.ragekhab.memory.RememberRequest
import com.ragekhab.project.CreateProjectRequest
import com.ragekhab.project.ProjectService
import com.ragekhab.repository.RepositoryAgentService
import com.ragekhab.repository.RepositoryScanRequest
import com.ragekhab.search.SemanticSearchService
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

data class JsonRpcRequest(val jsonrpc: String = "2.0", val id: Any? = null, val method: String, val params: Map<String, Any?> = emptyMap())
data class JsonRpcResponse(val jsonrpc: String = "2.0", val id: Any? = null, val result: Any? = null, val error: JsonRpcError? = null)
data class JsonRpcError(val code: Int, val message: String)

@RestController
@RequestMapping("/mcp")
class McpController(
    private val searchService: SemanticSearchService,
    private val chatService: ChatService,
    private val optimizerService: ContextOptimizerService,
    private val memoryService: MemoryService,
    private val repositoryAgent: RepositoryAgentService,
    private val documentService: DocumentService,
    private val projectService: ProjectService,
    private val debugSessions: DebugSessionService,
) {
    @PostMapping
    fun handle(@RequestBody request: JsonRpcRequest): JsonRpcResponse =
        runCatching {
            when (request.method) {
                "initialize" -> mapOf("protocolVersion" to "2025-06-18", "serverInfo" to mapOf("name" to "RAG-e Khab", "version" to "0.1.0"))
                "tools/list" -> mapOf("tools" to tools())
                "tools/call" -> callTool(request.params)
                else -> error("Unsupported MCP method '${request.method}'")
            }
        }.fold(
            onSuccess = { JsonRpcResponse(id = request.id, result = it) },
            onFailure = { JsonRpcResponse(id = request.id, error = JsonRpcError(-32603, it.message ?: "Internal error")) },
        )

    private fun callTool(params: Map<String, Any?>): Any {
        val name = params["name"]?.toString() ?: error("Missing tool name")
        val arguments = params["arguments"] as? Map<*, *> ?: emptyMap<Any, Any>()
        val projectId = arguments["projectId"]?.toString()?.takeIf { it.isNotBlank() }?.let(UUID::fromString)
        return when (name) {
            "create_project" -> projectService.create(CreateProjectRequest(arguments["name"].toString(), arguments["description"]?.toString()))
            "list_projects" -> mapOf("projects" to projectService.list())
            "add_text" -> documentService.addText(arguments["title"].toString(), arguments["text"].toString(), projectId)
            "search_documents" -> mapOf("results" to searchService.search(arguments["query"].toString(), arguments["limit"]?.toString()?.toIntOrNull() ?: 8, projectId))
            "remember" -> memoryService.remember(
                RememberRequest(
                    type = arguments["type"]?.toString()?.let(::parseMemoryType) ?: error("Missing memory type"),
                    content = arguments["content"]?.toString() ?: error("Missing memory content"),
                    confidence = arguments["confidence"]?.toString()?.toDoubleOrNull() ?: 0.85,
                    repository = arguments["repository"]?.toString()?.takeIf { it.isNotBlank() },
                    module = arguments["module"]?.toString()?.takeIf { it.isNotBlank() },
                    projectId = projectId,
                ),
            )
            "recall_memory" -> memoryService.recall(
                RecallMemoryRequest(
                    task = arguments["task"]?.toString() ?: error("Missing task"),
                    limit = arguments["limit"]?.toString()?.toIntOrNull() ?: 8,
                    repository = arguments["repository"]?.toString()?.takeIf { it.isNotBlank() },
                    module = arguments["module"]?.toString()?.takeIf { it.isNotBlank() },
                    type = arguments["type"]?.toString()?.takeIf { it.isNotBlank() }?.let(::parseMemoryType),
                    projectId = projectId,
                ),
            )
            "list_memories" -> mapOf("memories" to memoryService.list(projectId))
            "delete_memory" -> mapOf("deleted" to memoryService.delete(UUID.fromString(arguments["id"]?.toString() ?: error("Missing memory id"))))
            "learn_from_session" -> mapOf("status" to "planned", "message" to "Automatic session memory extraction is reserved for a future release.")
            "scan_repository" -> repositoryAgent.scan(
                RepositoryScanRequest(
                    repository = arguments["repository"]?.toString()?.takeIf { it.isNotBlank() },
                    name = arguments["name"]?.toString()?.takeIf { it.isNotBlank() },
                    path = arguments["path"]?.toString()?.takeIf { it.isNotBlank() },
                    full = arguments["full"]?.toString()?.toBooleanStrictOrNull() ?: false,
                    projectId = projectId,
                ),
            )
            "repository_status" -> repositoryAgent.status(arguments["repository"]?.toString()?.takeIf { it.isNotBlank() })
            "list_debug_sessions" -> mapOf("sessions" to debugSessions.list(includeArchived = false))
            "get_debug_session_context" -> debugSessions.contextForMcp(UUID.fromString(arguments["sessionId"]?.toString() ?: error("Missing sessionId")))
            "resolve_debug_token" -> debugSessions.resolveTokenForMcp(
                UUID.fromString(arguments["sessionId"]?.toString() ?: error("Missing sessionId")),
                arguments["token"]?.toString() ?: error("Missing token"),
            )
            "record_claude_request" -> debugSessions.recordClaudeRequest(
                UUID.fromString(arguments["sessionId"]?.toString() ?: error("Missing sessionId")),
                arguments["request"]?.toString() ?: error("Missing request"),
            )
            "create_debug_data_request" -> debugSessions.createDataRequest(
                UUID.fromString(arguments["sessionId"]?.toString() ?: error("Missing sessionId")),
                CreateDebugDataRequest(
                    entity = arguments["entity"]?.toString() ?: error("Missing entity"),
                    relation = arguments["relation"]?.toString()?.takeIf { it.isNotBlank() },
                    parentToken = arguments["parentToken"]?.toString()?.takeIf { it.isNotBlank() },
                    reason = arguments["reason"]?.toString() ?: error("Missing reason"),
                    requestedFields = stringListArgument(arguments["requestedFields"]),
                ),
            )
            "list_debug_data_requests" -> mapOf(
                "requests" to debugSessions.listDataRequests(UUID.fromString(arguments["sessionId"]?.toString() ?: error("Missing sessionId"))),
            )
            "get_debug_session_state" -> debugSessions.stateForMcp(UUID.fromString(arguments["sessionId"]?.toString() ?: error("Missing sessionId")))
            "optimize_context" -> optimizerService.optimize(
                ContextOptimizationRequest(
                    task = arguments["task"]?.toString() ?: error("Missing task"),
                    projectId = arguments["projectId"]?.toString()?.takeIf { it.isNotBlank() },
                    repository = arguments["repository"]?.toString()?.takeIf { it.isNotBlank() },
                    module = arguments["module"]?.toString()?.takeIf { it.isNotBlank() },
                    maxTokens = arguments["maxTokens"]?.toString()?.toIntOrNull(),
                    candidateLimit = arguments["candidateLimit"]?.toString()?.toIntOrNull() ?: 30,
                    targetTokens = arguments["targetTokens"]?.toString()?.toIntOrNull(),
                ),
            )
            "ask_knowledge_base" -> chatService.ask(arguments["question"].toString(), arguments["limit"]?.toString()?.toIntOrNull() ?: 8, projectId)
            "list_documents" -> mapOf("documents" to documentService.list(projectId))
            "get_document" -> documentService.get(UUID.fromString(arguments["id"].toString())) ?: error("Document not found")
            "delete_document" -> mapOf("deleted" to documentService.delete(UUID.fromString(arguments["id"].toString())))
            else -> error("Unknown tool '$name'")
        }
    }

    private fun tools() = listOf(
        tool("create_project", "Create a project for grouping documents.", mapOf("name" to "string", "description" to "string")),
        tool("list_projects", "List knowledge base projects.", emptyMap()),
        tool("add_text", "Add typed or pasted text to the knowledge base.", mapOf("title" to "string", "text" to "string", "projectId" to "string")),
        tool("search_documents", "Search indexed private documents semantically, optionally within a project.", mapOf("query" to "string", "limit" to "number", "projectId" to "string")),
        tool("remember", "Store a durable structured memory for future coding-agent sessions.", mapOf("type" to "string", "content" to "string", "confidence" to "number", "repository" to "string", "module" to "string", "projectId" to "string")),
        tool("recall_memory", "Retrieve relevant long-term memories before working on a coding task.", mapOf("task" to "string", "limit" to "number", "repository" to "string", "module" to "string", "type" to "string", "projectId" to "string")),
        tool("list_memories", "List stored coding-agent memories.", mapOf("projectId" to "string")),
        tool("delete_memory", "Delete a stored coding-agent memory.", mapOf("id" to "string")),
        tool("learn_from_session", "Future tool: extract durable memories from completed coding work.", mapOf("session" to "string")),
        tool("scan_repository", "Scan and synchronize a named repository into the knowledge base.", mapOf("repository" to "string", "name" to "string", "path" to "string", "full" to "boolean", "projectId" to "string")),
        tool("repository_status", "Return repository-agent synchronization metadata.", mapOf("repository" to "string")),
        tool("list_debug_sessions", "List active Safe Debug Sessions. Returns session metadata only.", emptyMap()),
        tool("get_debug_session_context", "Return sanitized Safe Debug Session artifacts and token names only. Raw pasted data and real values are never returned.", mapOf("sessionId" to "string")),
        tool("resolve_debug_token", "Sensitive local-only tool: resolve one Safe Debug token to its real database identifier so the developer can manually query more data.", mapOf("sessionId" to "string", "token" to "string")),
        tool("record_claude_request", "Record a Claude request for more sanitized data in a Safe Debug Session.", mapOf("sessionId" to "string", "request" to "string")),
        tool("create_debug_data_request", "Create a structured pending Safe Debug data request. Returns only request id and status; never raw data or real IDs.", mapOf("sessionId" to "string", "entity" to "string", "relation" to "string", "parentToken" to "string", "reason" to "string", "requestedFields" to "array")),
        tool("list_debug_data_requests", "List Safe Debug data request statuses and sanitized request summaries for a session. Does not return real IDs or SQL.", mapOf("sessionId" to "string")),
        tool("get_debug_session_state", "Return sanitized Safe Debug artifacts, request summaries, timeline, and notes. Does not return raw data, token real values, or real SQL.", mapOf("sessionId" to "string")),
        tool("optimize_context", "Return the smallest Claude Code context needed to complete a coding task, including token savings.", mapOf("task" to "string", "maxTokens" to "number", "repository" to "string", "module" to "string", "projectId" to "string")),
        tool("ask_knowledge_base", "Ask a question and receive an answer with sources, optionally within a project.", mapOf("question" to "string", "limit" to "number", "projectId" to "string")),
        tool("list_documents", "List uploaded documents, optionally within a project.", mapOf("projectId" to "string")),
        tool("get_document", "Return document metadata and chunks.", mapOf("id" to "string")),
        tool("delete_document", "Delete a document and its indexed chunks.", mapOf("id" to "string")),
    )

    private fun parseMemoryType(value: String): MemoryType {
        val normalized = value.filter { it.isLetterOrDigit() }.lowercase()
        return MemoryType.entries.firstOrNull { it.name.filter { char -> char.isLetterOrDigit() }.lowercase() == normalized }
            ?: error("Unsupported memory type '$value'. Available: ${MemoryType.entries.joinToString { it.name }}")
    }

    private fun stringListArgument(value: Any?): List<String> =
        when (value) {
            is List<*> -> value.mapNotNull { it?.toString()?.takeIf(String::isNotBlank) }
            is Array<*> -> value.mapNotNull { it?.toString()?.takeIf(String::isNotBlank) }
            is String -> value.split(",").mapNotNull { it.trim().takeIf(String::isNotBlank) }
            else -> emptyList()
        }

    private fun tool(name: String, description: String, properties: Map<String, String>) = mapOf(
        "name" to name,
        "description" to description,
        "inputSchema" to mapOf(
            "type" to "object",
            "properties" to properties.mapValues { (_, type) -> mapOf("type" to type) },
        ),
    )
}
