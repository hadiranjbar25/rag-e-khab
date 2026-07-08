package com.ragekhab.search

import com.ragekhab.document.DocumentChunk
import com.ragekhab.document.DocumentRepository
import org.slf4j.LoggerFactory
import org.springframework.context.annotation.Primary
import org.springframework.stereotype.Component
import java.util.UUID

@Component
@Primary
class ResilientVectorIndex(
    private val qdrant: QdrantVectorIndex,
    private val memory: MemoryVectorIndex,
    private val documents: DocumentRepository,
) : VectorIndex {
    private val logger = LoggerFactory.getLogger(javaClass)
    @Volatile private var usingQdrant = true

    override fun upsert(chunks: List<DocumentChunk>) {
        if (!usingQdrant) memory.upsert(chunks)
        runQdrant("upsert") { qdrant.upsert(chunks) }
    }

    override fun search(query: String, limit: Int, projectId: UUID?): List<SearchResult> =
        if (usingQdrant) {
            runCatching { qdrant.search(query, limit, projectId) }
                .onFailure { markFallback("search", it) }
                .getOrElse { memory.search(query, limit, projectId) }
                .let { if (usingQdrant) it else it.ifEmpty { memory.search(query, limit, projectId) } }
        } else {
            memory.search(query, limit, projectId)
        }

    override fun deleteDocument(documentId: UUID) {
        if (!usingQdrant) memory.deleteDocument(documentId)
        runQdrant("delete") { qdrant.deleteDocument(documentId) }
    }

    override fun reindex(chunks: List<DocumentChunk>) {
        if (!usingQdrant) memory.reindex(chunks)
        runQdrant("reindex") { qdrant.reindex(chunks) }
    }

    override fun status(): String = if (usingQdrant) "qdrant" else "memory-fallback"

    private fun runQdrant(operation: String, block: () -> Unit) {
        if (!usingQdrant) return
        runCatching(block).onFailure { markFallback(operation, it) }
    }

    private fun markFallback(operation: String, throwable: Throwable) {
        usingQdrant = false
        logger.warn("Qdrant {} failed; rebuilding in-memory vector index from persisted documents", operation, throwable)
        runCatching { memory.reindex(documents.allChunks()) }
            .onFailure { logger.error("Failed to rebuild in-memory vector index fallback", it) }
    }
}
