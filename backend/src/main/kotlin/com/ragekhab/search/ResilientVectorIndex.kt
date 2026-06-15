package com.ragekhab.search

import com.ragekhab.document.DocumentChunk
import org.slf4j.LoggerFactory
import org.springframework.context.annotation.Primary
import org.springframework.stereotype.Component
import java.util.UUID

@Component
@Primary
class ResilientVectorIndex(
    private val qdrant: QdrantVectorIndex,
    private val memory: MemoryVectorIndex,
) : VectorIndex {
    private val logger = LoggerFactory.getLogger(javaClass)
    @Volatile private var usingQdrant = true

    override fun upsert(chunks: List<DocumentChunk>) {
        memory.upsert(chunks)
        runQdrant("upsert") { qdrant.upsert(chunks) }
    }

    override fun search(query: String, limit: Int, projectId: UUID?): List<SearchResult> =
        if (usingQdrant) {
            runCatching { qdrant.search(query, limit, projectId) }
                .onFailure { markFallback("search", it) }
                .getOrElse { memory.search(query, limit, projectId) }
                .ifEmpty { memory.search(query, limit, projectId) }
        } else {
            memory.search(query, limit, projectId)
        }

    override fun deleteDocument(documentId: UUID) {
        memory.deleteDocument(documentId)
        runQdrant("delete") { qdrant.deleteDocument(documentId) }
    }

    override fun reindex(chunks: List<DocumentChunk>) {
        memory.reindex(chunks)
        runQdrant("reindex") { qdrant.reindex(chunks) }
    }

    override fun status(): String = if (usingQdrant) "qdrant" else "memory-fallback"

    private fun runQdrant(operation: String, block: () -> Unit) {
        if (!usingQdrant) return
        runCatching(block).onFailure { markFallback(operation, it) }
    }

    private fun markFallback(operation: String, throwable: Throwable) {
        usingQdrant = false
        logger.warn("Qdrant {} failed; using in-memory vector index", operation, throwable)
    }
}
