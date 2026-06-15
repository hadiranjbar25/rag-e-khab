package com.ragekhab.mcp

import com.ragekhab.chat.ChatService
import com.ragekhab.document.DocumentService
import com.ragekhab.project.CreateProjectRequest
import com.ragekhab.project.ProjectService
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
    private val documentService: DocumentService,
    private val projectService: ProjectService,
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
        tool("ask_knowledge_base", "Ask a question and receive an answer with sources, optionally within a project.", mapOf("question" to "string", "limit" to "number", "projectId" to "string")),
        tool("list_documents", "List uploaded documents, optionally within a project.", mapOf("projectId" to "string")),
        tool("get_document", "Return document metadata and chunks.", mapOf("id" to "string")),
        tool("delete_document", "Delete a document and its indexed chunks.", mapOf("id" to "string")),
    )

    private fun tool(name: String, description: String, properties: Map<String, String>) = mapOf(
        "name" to name,
        "description" to description,
        "inputSchema" to mapOf(
            "type" to "object",
            "properties" to properties.mapValues { (_, type) -> mapOf("type" to type) },
        ),
    )
}
