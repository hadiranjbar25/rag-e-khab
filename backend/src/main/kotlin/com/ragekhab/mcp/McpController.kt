package com.ragekhab.mcp

import com.ragekhab.chat.ChatService
import com.ragekhab.activity.ActivityStatus
import com.ragekhab.activity.AgentActivityService
import com.ragekhab.activity.RecordActivityRequest
import com.ragekhab.artifact.ArtifactService
import com.ragekhab.context.ContextOptimizationRequest
import com.ragekhab.context.ContextOptimizerService
import com.ragekhab.debug.CreateDebugDataRequest
import com.ragekhab.document.ArtifactIngestionRequest
import com.ragekhab.document.ArtifactKind
import com.ragekhab.document.DocumentService
import com.ragekhab.debug.DebugSessionService
import com.ragekhab.memory.MemoryService
import com.ragekhab.memory.MemoryType
import com.ragekhab.memory.RecallMemoryRequest
import com.ragekhab.memory.RememberRequest
import com.ragekhab.project.CreateProjectRequest
import com.ragekhab.project.ProjectService
import com.ragekhab.repository.ContextLevel
import com.ragekhab.repository.ContextRequest
import com.ragekhab.repository.RepositoryAgentService
import com.ragekhab.repository.RepositoryContextPackageService
import com.ragekhab.repository.RepositoryScanRequest
import com.ragekhab.search.SemanticSearchService
import com.fasterxml.jackson.annotation.JsonInclude
import com.fasterxml.jackson.databind.ObjectMapper
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

data class JsonRpcRequest(val jsonrpc: String = "2.0", val id: Any? = null, val method: String, val params: Map<String, Any?>? = null)

@JsonInclude(JsonInclude.Include.NON_NULL)
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
    private val contextPackages: RepositoryContextPackageService,
    private val documentService: DocumentService,
    private val artifactService: ArtifactService,
    private val projectService: ProjectService,
    private val debugSessions: DebugSessionService,
    private val activityService: AgentActivityService,
    private val objectMapper: ObjectMapper,
) {
    @PostMapping
    fun handle(@RequestBody request: JsonRpcRequest): JsonRpcResponse =
        runCatching {
            when (request.method) {
                "initialize" -> mapOf(
                    "protocolVersion" to "2025-06-18",
                    "serverInfo" to mapOf("name" to "RAG-e Khab", "version" to "0.1.0"),
                    "capabilities" to mapOf("tools" to emptyMap<String, Any>()),
                )
                "tools/list" -> mapOf("tools" to tools())
                "tools/call" -> toolCallResponse(request.params ?: emptyMap())
                else -> error("Unsupported MCP method '${request.method}'")
            }
        }.fold(
            onSuccess = { JsonRpcResponse(id = request.id, result = it) },
            onFailure = { JsonRpcResponse(id = request.id, error = JsonRpcError(-32603, it.message ?: "Internal error")) },
        )

    private fun toolCallResponse(params: Map<String, Any?>): Map<String, Any> {
        val name = params["name"]?.toString() ?: "unknown"
        val arguments = params["arguments"] as? Map<*, *> ?: emptyMap<Any, Any>()
        return runCatching { callTool(params) }
            .onSuccess { recordToolActivity(name, arguments, ActivityStatus.success) }
            .onFailure { recordToolActivity(name, arguments, ActivityStatus.failure) }
            .fold(
                onSuccess = {
                    mapOf(
                        "content" to listOf(mapOf("type" to "text", "text" to objectMapper.writeValueAsString(it))),
                        "isError" to false,
                    )
                },
                onFailure = { throw it },
            )
    }

    private fun callTool(params: Map<String, Any?>): Any {
        val name = params["name"]?.toString() ?: error("Missing tool name")
        val arguments = params["arguments"] as? Map<*, *> ?: emptyMap<Any, Any>()
        val projectId = arguments["projectId"]?.toString()?.takeIf { it.isNotBlank() }?.let(UUID::fromString)
        return when (name) {
            "create_project" -> projectService.create(CreateProjectRequest(arguments["name"].toString(), arguments["description"]?.toString()))
            "list_projects" -> mapOf("projects" to projectService.list())
            "add_text" -> documentService.addText(arguments["title"].toString(), arguments["text"].toString(), projectId)
            "add_artifact" -> artifactService.ingest(
                ArtifactIngestionRequest(
                    title = arguments["title"]?.toString() ?: error("Missing title"),
                    content = arguments["content"]?.toString() ?: error("Missing content"),
                    kind = arguments["kind"]?.toString()?.let(::parseArtifactKind) ?: ArtifactKind.TEXT,
                    projectId = projectId?.toString(),
                ),
            )
            "search_documents" -> mapOf("results" to searchService.search(arguments["query"].toString(), arguments["limit"]?.toString()?.toIntOrNull() ?: 8, projectId))
            "remember" -> memoryService.remember(
                RememberRequest(
                    type = arguments["type"]?.toString()?.let(::parseMemoryType) ?: error("Missing memory type"),
                    content = arguments["content"]?.toString() ?: error("Missing memory content"),
                    confidence = arguments["confidence"]?.toString()?.toDoubleOrNull() ?: 0.85,
                    repository = arguments["repository"]?.toString()?.takeIf { it.isNotBlank() },
                    module = arguments["module"]?.toString()?.takeIf { it.isNotBlank() },
                    projectId = projectId,
                    global = arguments["global"]?.toString()?.toBooleanStrictOrNull() ?: false,
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
            "build_context_package" -> contextPackages.buildContextPackage(
                ContextRequest(
                    repoId = arguments["repoId"]?.toString()?.takeIf { it.isNotBlank() },
                    repository = arguments["repository"]?.toString()?.takeIf { it.isNotBlank() },
                    task = arguments["task"]?.toString() ?: error("Missing task"),
                    maxTokens = arguments["maxTokens"]?.toString()?.toIntOrNull() ?: 6_000,
                    includeTests = arguments["includeTests"]?.toString()?.toBooleanStrictOrNull() ?: true,
                    includeRawSource = arguments["includeRawSource"]?.toString()?.toBooleanStrictOrNull() ?: false,
                    levels = stringListArgument(arguments["levels"]).mapNotNull(::parseContextLevel),
                    filePath = arguments["filePath"]?.toString()?.takeIf { it.isNotBlank() },
                    className = arguments["class"]?.toString()?.takeIf { it.isNotBlank() },
                    method = arguments["method"]?.toString()?.takeIf { it.isNotBlank() },
                    startLine = arguments["startLine"]?.toString()?.toIntOrNull(),
                    endLine = arguments["endLine"]?.toString()?.toIntOrNull(),
                ),
            )
            "list_debug_sessions" -> mapOf("sessions" to debugSessions.list(includeArchived = false))
            "get_debug_session_context" -> debugSessions.contextForMcp(UUID.fromString(arguments["sessionId"]?.toString() ?: error("Missing sessionId")))
            "resolve_debug_token" -> debugSessions.resolveTokenForMcp(
                UUID.fromString(arguments["sessionId"]?.toString() ?: error("Missing sessionId")),
                arguments["token"]?.toString() ?: error("Missing token"),
            )
            "record_agent_request", "record_claude_request" -> debugSessions.recordAgentRequest(
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
            "get_debug_artifact_slice" -> debugSessions.artifactSlice(
                UUID.fromString(arguments["sessionId"]?.toString() ?: error("Missing sessionId")),
                UUID.fromString(arguments["artifactId"]?.toString() ?: error("Missing artifactId")),
                arguments["beforeLine"]?.toString()?.toIntOrNull() ?: error("Missing beforeLine"),
                arguments["afterLine"]?.toString()?.toIntOrNull() ?: error("Missing afterLine"),
            )
            "optimize_context" -> optimizerService.optimize(
                ContextOptimizationRequest(
                    task = arguments["task"]?.toString() ?: error("Missing task"),
                    projectId = arguments["projectId"]?.toString()?.takeIf { it.isNotBlank() },
                    repository = arguments["repository"]?.toString()?.takeIf { it.isNotBlank() },
                    module = arguments["module"]?.toString()?.takeIf { it.isNotBlank() },
                    maxTokens = arguments["maxTokens"]?.toString()?.toIntOrNull(),
                    candidateLimit = arguments["candidateLimit"]?.toString()?.toIntOrNull() ?: 30,
                    targetTokens = arguments["targetTokens"]?.toString()?.toIntOrNull(),
                    budgetProfile = arguments["budgetProfile"]?.toString(),
                ),
            )
            "ask_knowledge_base" -> chatService.ask(arguments["question"].toString(), arguments["limit"]?.toString()?.toIntOrNull() ?: 8, projectId)
            "list_documents" -> mapOf("documents" to documentService.list(projectId))
            "get_document" -> documentService.get(UUID.fromString(arguments["id"].toString())) ?: error("Document not found")
            "get_raw_artifact" -> artifactService.getRawArtifact(UUID.fromString(arguments["id"]?.toString() ?: error("Missing artifact id")))
                ?: error("Artifact not found")
            "get_artifact_slice" -> artifactService.getArtifactSlice(
                UUID.fromString(arguments["id"]?.toString() ?: error("Missing artifact id")),
                arguments["beforeLine"]?.toString()?.toIntOrNull() ?: error("Missing beforeLine"),
                arguments["afterLine"]?.toString()?.toIntOrNull() ?: error("Missing afterLine"),
            ) ?: error("Artifact not found")
            "get_related_raw_context" -> artifactService.getRelatedRawContext(
                UUID.fromString(arguments["compressedArtifactId"]?.toString() ?: error("Missing compressedArtifactId")),
            ) ?: error("Related raw artifact not found")
            "delete_document" -> mapOf("deleted" to documentService.delete(UUID.fromString(arguments["id"].toString())))
            else -> error("Unknown tool '$name'")
        }
    }

    private fun tools() = listOf(
        tool("create_project", "Create a project for grouping documents.", mapOf("name" to "string", "description" to "string")),
        tool("list_projects", "List knowledge base projects.", emptyMap()),
        tool("add_text", "Add typed or pasted text to the knowledge base.", mapOf("title" to "string", "text" to "string", "projectId" to "string")),
        tool("add_artifact", "Store raw developer artifact and index a compressed representation by default.", mapOf("title" to "string", "content" to "string", "kind" to "string", "projectId" to "string")),
        tool("search_documents", "Search indexed private documents semantically, optionally within a project.", mapOf("query" to "string", "limit" to "number", "projectId" to "string")),
        tool("remember", "Store a durable structured memory. Pass projectId for workspace scope, or global=true only when the user explicitly wants General memory.", mapOf("type" to "string", "content" to "string", "confidence" to "number", "repository" to "string", "module" to "string", "projectId" to "string", "global" to "boolean")),
        tool("recall_memory", "Retrieve relevant long-term memories before working on a coding task.", mapOf("task" to "string", "limit" to "number", "repository" to "string", "module" to "string", "type" to "string", "projectId" to "string")),
        tool("list_memories", "List stored coding-agent memories.", mapOf("projectId" to "string")),
        tool("delete_memory", "Delete a stored coding-agent memory.", mapOf("id" to "string")),
        tool("learn_from_session", "Future tool: extract durable memories from completed coding work.", mapOf("session" to "string")),
        tool("scan_repository", "Scan and synchronize a named repository into the knowledge base.", mapOf("repository" to "string", "name" to "string", "path" to "string", "full" to "boolean", "projectId" to "string")),
        tool("repository_status", "Return repository-agent synchronization metadata.", mapOf("repository" to "string")),
        tool("build_context_package", "Build a compact, task-focused repository context package within a token budget. Defaults to summaries and returns raw source only when requested.", mapOf("repoId" to "string", "repository" to "string", "task" to "string", "maxTokens" to "number", "includeTests" to "boolean", "includeRawSource" to "boolean", "levels" to "array", "filePath" to "string", "class" to "string", "method" to "string", "startLine" to "number", "endLine" to "number")),
        tool("list_debug_sessions", "List active Safe Debug Sessions. Returns session metadata only.", emptyMap()),
        tool("get_debug_session_context", "Return sanitized Safe Debug Session artifacts and token names only. Raw pasted data and real values are never returned.", mapOf("sessionId" to "string")),
        tool("resolve_debug_token", "Sensitive local-only tool: resolve one Safe Debug token to its real database identifier so the developer can manually query more data.", mapOf("sessionId" to "string", "token" to "string")),
        tool("record_agent_request", "Record an agent request for more sanitized data in a Safe Debug Session.", mapOf("sessionId" to "string", "request" to "string")),
        tool("create_debug_data_request", "Create a structured pending Safe Debug data request. Returns only request id and status; never raw data or real IDs.", mapOf("sessionId" to "string", "entity" to "string", "relation" to "string", "parentToken" to "string", "reason" to "string", "requestedFields" to "array")),
        tool("list_debug_data_requests", "List Safe Debug data request statuses and sanitized request summaries for a session. Does not return real IDs or SQL.", mapOf("sessionId" to "string")),
        tool("get_debug_session_state", "Return sanitized Safe Debug artifacts, request summaries, timeline, and notes. Does not return raw data, token real values, or real SQL.", mapOf("sessionId" to "string")),
        tool("get_debug_artifact_slice", "Explicit expansion: return an inclusive sanitized raw artifact line slice from a Safe Debug Session.", mapOf("sessionId" to "string", "artifactId" to "string", "beforeLine" to "number", "afterLine" to "number")),
        tool("optimize_context", "Return the smallest useful coding-agent context needed to complete a task, including token savings.", mapOf("task" to "string", "maxTokens" to "number", "budgetProfile" to "string", "repository" to "string", "module" to "string", "projectId" to "string")),
        tool("ask_knowledge_base", "Ask a question and receive an answer with sources, optionally within a project.", mapOf("question" to "string", "limit" to "number", "projectId" to "string")),
        tool("list_documents", "List uploaded documents, optionally within a project.", mapOf("projectId" to "string")),
        tool("get_document", "Return document metadata and chunks.", mapOf("id" to "string")),
        tool("get_raw_artifact", "Explicit expansion: return the raw artifact by raw artifact id.", mapOf("id" to "string")),
        tool("get_artifact_slice", "Explicit expansion: return an inclusive raw artifact line slice.", mapOf("id" to "string", "beforeLine" to "number", "afterLine" to "number")),
        tool("get_related_raw_context", "Explicit expansion: return raw artifact linked to a compressed artifact document id.", mapOf("compressedArtifactId" to "string")),
        tool("delete_document", "Delete a document and its indexed chunks.", mapOf("id" to "string")),
    )

    private fun parseMemoryType(value: String): MemoryType {
        val normalized = value.filter { it.isLetterOrDigit() }.lowercase()
        return MemoryType.entries.firstOrNull { it.name.filter { char -> char.isLetterOrDigit() }.lowercase() == normalized }
            ?: error("Unsupported memory type '$value'. Available: ${MemoryType.entries.joinToString { it.name }}")
    }

    private fun parseContextLevel(value: String): ContextLevel? {
        val normalized = value.trim().lowercase()
        return ContextLevel.entries.firstOrNull { it.name == normalized }
    }

    private fun parseArtifactKind(value: String): ArtifactKind {
        val normalized = value.trim().replace("-", "_").lowercase()
        return ArtifactKind.entries.firstOrNull { it.name.lowercase() == normalized }
            ?: error("Unsupported artifact kind '$value'. Available: ${ArtifactKind.entries.joinToString { it.name }}")
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

    private fun recordToolActivity(name: String, arguments: Map<*, *>, status: ActivityStatus) {
        val projectId = arguments["projectId"]?.toString()?.takeIf { it.isNotBlank() }?.let { runCatching { UUID.fromString(it) }.getOrNull() }
        val sessionId = arguments["sessionId"]?.toString()?.takeIf { it.isNotBlank() }?.let { runCatching { UUID.fromString(it) }.getOrNull() }
        activityService.record(
            RecordActivityRequest(
                type = "mcp_tool",
                action = name,
                detail = toolActivityDetail(name, arguments),
                status = status,
                projectId = projectId,
                sessionId = sessionId,
            ),
        )
    }

    private fun toolActivityDetail(name: String, arguments: Map<*, *>): String =
        when (name) {
            "recall_memory" -> "Recalled memories for task '${arguments["task"]?.toString()?.take(80).orEmpty()}'"
            "optimize_context" -> "Optimized context for task '${arguments["task"]?.toString()?.take(80).orEmpty()}'"
            "build_context_package" -> "Built context package for '${arguments["task"]?.toString()?.take(80).orEmpty()}'"
            "search_documents" -> "Searched documents for '${arguments["query"]?.toString()?.take(80).orEmpty()}'"
            "remember" -> "Stored ${arguments["type"]?.toString()?.ifBlank { "memory" } ?: "memory"}"
            "get_debug_session_state" -> "Read Safe Debug session state"
            "get_debug_artifact_slice" -> "Expanded Safe Debug artifact slice"
            "create_debug_data_request" -> "Requested more sanitized debug data for ${arguments["entity"]?.toString()?.ifBlank { "entity" } ?: "entity"}"
            "add_artifact" -> "Added compressed artifact '${arguments["title"]?.toString()?.take(80).orEmpty()}'"
            else -> "Called MCP tool '$name'"
        }
}
