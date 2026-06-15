package com.ragekhab.search

import com.ragekhab.config.RagEKhabProperties
import com.ragekhab.document.DocumentChunk
import org.springframework.stereotype.Component
import org.springframework.web.client.RestClient
import java.nio.charset.StandardCharsets
import java.util.UUID

@Component
class QdrantVectorIndex(
    private val properties: RagEKhabProperties,
    private val embedder: TextEmbedder,
) {
    private val client = RestClient.create(properties.qdrant.url)

    fun upsert(chunks: List<DocumentChunk>) {
        if (chunks.isEmpty()) return
        ensureCollection()
        client.put()
            .uri("/collections/{collection}/points?wait=true", properties.qdrant.collection)
            .body(mapOf("points" to chunks.map { it.toPoint() }))
            .retrieve()
            .toBodilessEntity()
    }

    fun search(query: String, limit: Int, projectId: UUID?): List<SearchResult> {
        ensureCollection()
        val body = mutableMapOf<String, Any?>(
            "vector" to embedder.embed(query),
            "limit" to limit.coerceIn(1, 30),
            "with_payload" to true,
        )
        if (projectId != null) {
            body["filter"] = mapOf("must" to listOf(mapOf("key" to "projectId", "match" to mapOf("value" to projectId.toString()))))
        }
        val response = client.post()
            .uri("/collections/{collection}/points/search", properties.qdrant.collection)
            .body(body)
            .retrieve()
            .body(Map::class.java)

        val result = response?.get("result") as? List<*> ?: return emptyList()
        return result.mapNotNull { item ->
            val row = item as? Map<*, *> ?: return@mapNotNull null
            val payload = row["payload"] as? Map<*, *> ?: return@mapNotNull null
            SearchResult(
                projectId = payload["projectId"].toString(),
                projectName = payload["projectName"].toString(),
                documentId = payload["documentId"].toString(),
                documentName = payload["documentName"].toString(),
                pageNumber = payload["pageNumber"]?.toString()?.toIntOrNull(),
                chunkId = payload["chunkId"].toString(),
                score = row["score"]?.toString()?.toDoubleOrNull() ?: 0.0,
                text = payload["text"].toString(),
            )
        }
    }

    fun deleteDocument(documentId: UUID) {
        ensureCollection()
        client.post()
            .uri("/collections/{collection}/points/delete?wait=true", properties.qdrant.collection)
            .body(mapOf("filter" to mapOf("must" to listOf(mapOf("key" to "documentId", "match" to mapOf("value" to documentId.toString()))))))
            .retrieve()
            .toBodilessEntity()
    }

    fun reindex(chunks: List<DocumentChunk>) {
        recreateCollection()
        upsert(chunks)
    }

    private fun ensureCollection() {
        runCatching {
            client.get()
                .uri("/collections/{collection}", properties.qdrant.collection)
                .retrieve()
                .toBodilessEntity()
        }.getOrElse { recreateCollection() }
    }

    private fun recreateCollection() {
        client.put()
            .uri("/collections/{collection}", properties.qdrant.collection)
            .body(mapOf("vectors" to mapOf("size" to embedder.dimensions, "distance" to "Cosine")))
            .retrieve()
            .toBodilessEntity()
    }

    private fun DocumentChunk.toPoint(): Map<String, Any?> =
        mapOf(
            "id" to UUID.nameUUIDFromBytes(id.toByteArray(StandardCharsets.UTF_8)).toString(),
            "vector" to embedder.embed(text),
            "payload" to mapOf(
                "chunkId" to id,
                "projectId" to projectId.toString(),
                "projectName" to projectName,
                "documentId" to documentId.toString(),
                "documentName" to documentName,
                "pageNumber" to pageNumber,
                "text" to text,
            ),
        )
}
